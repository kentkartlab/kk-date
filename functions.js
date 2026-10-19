const {
	iso6391_languages,
	default_en_day_number,
	day_numbers,
	month_numbers,
	timeInMilliseconds,
	format_types,
	format_types_regex,
	cached_dateTimeFormat,
	timezone_cache,
	timezone_check_cache,
	timezone_abbreviation_cache,
	long_timezone_cache,
	timezone_formatter_cache,
	global_config,
	systemTimezone,
	cached_converter_int,
	converter_results_cache,
	cached_dateTimeFormat_with_locale,
	COMMON_TIMEZONES,
	ordinal_suffix,
	format_part_types,
	format_derived_flags,
	compiled_templates,
	timezone_long_name_cache,
} = require('./constants');

// Prototype-less so inherited keys ("constructor", "toString") can never resolve as names.
const months = Object.create(null);
const days = Object.create(null);

// Upper bound for caches keyed by caller-supplied timezone/locale strings. Timezone ids are
// accepted case-insensitively and BCP 47 tags are open-ended, so such keys are unbounded.
const INTL_CACHE_LIMIT = 500;

/**
 * Map.set with a size bound: the map is cleared once it reaches INTL_CACHE_LIMIT entries
 * (the same wholesale-clear policy as the other bounded caches).
 *
 * @param {Map} map
 * @param {*} key
 * @param {*} value
 */
function boundedSet(map, key, value) {
	if (map.size >= INTL_CACHE_LIMIT) {
		map.clear();
	}
	map.set(key, value);
}

/**
 * Returns ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 * @param {number} n - The number to get ordinal suffix for
 * @returns {string} The number with ordinal suffix
 */
function getOrdinal(n) {
	const v = n % 100;
	return n + (ordinal_suffix[(v - 20) % 10] || ordinal_suffix[v] || ordinal_suffix[0]);
}

/**
 * UTC timestamp of a wall-clock calendar day. Years 0-99 need the
 * setUTCFullYear round-trip because Date.UTC maps them to 1900-1999.
 *
 * @param {number} y
 * @param {number} m 1-based month
 * @param {number} d
 * @returns {number}
 */
function dayTimestampUTC(y, m, d) {
	let ts = Date.UTC(y, m - 1, d);
	if (y >= 0 && y <= 99) {
		const t = new Date(ts);
		t.setUTCFullYear(y);
		ts = t.getTime();
	}
	return ts;
}

/**
 * Day of week for a wall-clock date (0 = Sunday .. 6 = Saturday).
 *
 * @param {number} y
 * @param {number} m 1-based month
 * @param {number} d
 * @returns {number}
 */
function getDayOfWeek(y, m, d) {
	return new Date(dayTimestampUTC(y, m, d)).getUTCDay();
}

/**
 * Day of year for a wall-clock date (1..366).
 *
 * @param {number} y
 * @param {number} m 1-based month
 * @param {number} d
 * @returns {number}
 */
function getDayOfYear(y, m, d) {
	return (dayTimestampUTC(y, m, d) - dayTimestampUTC(y, 1, 1)) / 86400000 + 1;
}

/**
 * ISO-8601 week of year: weeks start on Monday, week 1 is the week
 * containing the first Thursday. The week-year comes from that Thursday
 * and can differ from the calendar year at year boundaries.
 *
 * @param {number} y
 * @param {number} m 1-based month
 * @param {number} d
 * @returns {{week: number, year: number}}
 */
function getIsoWeekInfo(y, m, d) {
	const t = dayTimestampUTC(y, m, d);
	const dow = new Date(t).getUTCDay() || 7;
	const thursday = t + (4 - dow) * 86400000;
	const isoYear = new Date(thursday).getUTCFullYear();
	const week = Math.floor((thursday - dayTimestampUTC(isoYear, 1, 1)) / 604800000) + 1;
	return { week, year: isoYear };
}

/**
 * Locale week of year: weeks start on weekStartDay, week 1 is the week
 * containing Jan 1 (moment 'en' behavior with dow=0/doy=6). The week-year
 * is the year of the week's last day — the week straddling a year boundary
 * always contains Jan 1 and belongs to the new year.
 *
 * @param {number} y
 * @param {number} m 1-based month
 * @param {number} d
 * @param {number} weekStartDay 0 = Sunday .. 6 = Saturday
 * @returns {{week: number, year: number}}
 */
function getLocaleWeekInfo(y, m, d, weekStartDay) {
	const t = dayTimestampUTC(y, m, d);
	const diff = (new Date(t).getUTCDay() - weekStartDay + 7) % 7;
	const weekStart = t - diff * 86400000;
	const weekYear = new Date(weekStart + 6 * 86400000).getUTCFullYear();
	const jan1 = dayTimestampUTC(weekYear, 1, 1);
	const week1Start = jan1 - ((new Date(jan1).getUTCDay() - weekStartDay + 7) % 7) * 86400000;
	return { week: (weekStart - week1Start) / 604800000 + 1, year: weekYear };
}

// Month/day name tables are built lazily: ~360 Intl formatters across all supported languages
// cost tens of milliseconds, which only text-month parsing ever needs (not module load).
let name_tables_built = false;
// Lowercased name forms across all supported languages, for strict validation (moment strict
// requires MMMM/dddd long names, MMM/ddd short names and dd the two-letter form).
const month_long_names = new Set();
const month_short_names = new Set();
const day_long_names = new Set();
const day_short_names = new Set();
const day_min_names = new Set();

function buildNameTables() {
	for (const key in iso6391_languages) {
		const month_long = new Intl.DateTimeFormat(key, { month: 'long' });
		const month_short = new Intl.DateTimeFormat(key, { month: 'short' });
		const day_long = new Intl.DateTimeFormat(key, { weekday: 'long' });
		const day_short = new Intl.DateTimeFormat(key, { weekday: 'short' });
		for (let i = 1; i < 13; i++) {
			const date = new Date(2021, i, '0');
			const long = month_long.format(date).toLowerCase();
			const short = month_short.format(date).toLowerCase();
			months[long] = i;
			months[short] = i;
			month_long_names.add(long);
			month_short_names.add(short);
		}
		for (let i = 1; i < 8; i++) {
			const date = new Date(2021, 1, i);
			const number = parseInt(default_en_day_number.format(date), 10);
			const long = day_long.format(date).toLowerCase();
			const short = day_short.format(date).toLowerCase();
			days[long] = number;
			days[short] = number;
			day_long_names.add(long);
			day_short_names.add(short);
			day_min_names.add(short.slice(0, 2));
		}
	}
	name_tables_built = true;
}

/**
 * Whether a month or weekday name has the form a token formats (any supported language):
 * MMMM/dddd long, MMM/ddd short, dd the first two letters of the short weekday.
 *
 * @param {string} name
 * @param {string} token - MMMM, MMM, dddd, ddd or dd
 * @returns {boolean}
 */
function isNameOfForm(name, token) {
	if (!name_tables_built) {
		buildNameTables();
	}
	const lower = name.toLowerCase();
	switch (token) {
		case 'MMMM':
			return month_long_names.has(lower);
		case 'MMM':
			return month_short_names.has(lower);
		case 'dddd':
			return day_long_names.has(lower);
		case 'ddd':
			return day_short_names.has(lower);
		case 'dd':
			return day_min_names.has(lower);
		default:
			return false;
	}
}

// Primary language subtag of the global locale ('tr-TR' -> 'tr'), memoized per locale string.
let configured_language_locale = null;
let configured_language = 'en';

/**
 * Language whose month/weekday names win when parsing (see getMonthNumber/getWeekdayIndex).
 *
 * @returns {string}
 */
function configuredLanguage() {
	const locale = global_config.locale || 'en';
	if (locale !== configured_language_locale) {
		configured_language = `${locale}`.split('-')[0].toLowerCase();
		configured_language_locale = locale;
	}
	return configured_language;
}

// Set whenever a name is resolved with the configured language's preference: such a parse depends
// on the global locale, so the constructor's parse cache records the language (see takeLocaleNamesUsed).
let locale_names_used = false;
// Date (UTC-encoded midnight) the most recent parse took as "today" (see parseToday), NaN when it
// used no current date: the constructor's parse cache only reuses such a parse on that date.
let parsed_today = Number.NaN;

// Per-language weekday tables (locale preference, like the month tables), name -> 0-6 (Sunday 0).
const language_weekday_tables = new Map();

function getLanguageWeekdayTable(language) {
	let table = language_weekday_tables.get(language);
	if (table === undefined) {
		table = new Map();
		if (iso6391_languages[language] !== undefined) {
			const day_long = new Intl.DateTimeFormat(language, { weekday: 'long' });
			const day_short = new Intl.DateTimeFormat(language, { weekday: 'short' });
			for (let i = 1; i < 8; i++) {
				const date = new Date(2021, 1, i); // Feb 1 2021 was a Monday
				table.set(day_long.format(date).toLowerCase(), date.getDay());
				table.set(day_short.format(date).toLowerCase(), date.getDay());
			}
		}
		language_weekday_tables.set(language, table);
	}
	return table;
}

/**
 * Weekday name (any supported language, long or short form) to its day number, Sunday = 0.
 * Names of the globally configured locale's language win over other languages.
 *
 * @param {string} dayName
 * @returns {number} 0-6, or -1 when the name is unknown
 */
function getWeekdayIndex(dayName) {
	const name = dayName.toLowerCase();
	locale_names_used = true;
	const language = configuredLanguage();
	const own = getLanguageWeekdayTable(language).get(name);
	if (own !== undefined) {
		return own;
	}
	// English names mean the same day in every language: no need for the all-language table yet
	const english = language === 'en' ? undefined : getLanguageWeekdayTable('en').get(name);
	if (english !== undefined) {
		return english;
	}
	if (!name_tables_built) {
		buildNameTables();
	}
	// days[] holds 1 (Monday) .. 7 (Sunday)
	return days[name] ? days[name] % 7 : -1;
}

// Per-language month tables: a few names mean different months in different languages
// (Croatian "listopad" is October, Polish/Czech "listopad" is November), so the configured
// locale's own language is consulted before the shared all-language table.
const language_month_tables = new Map();

function getLanguageMonthTable(language) {
	let table = language_month_tables.get(language);
	if (table === undefined) {
		table = new Map();
		if (iso6391_languages[language] !== undefined) {
			const month_long = new Intl.DateTimeFormat(language, { month: 'long' });
			const month_short = new Intl.DateTimeFormat(language, { month: 'short' });
			for (let i = 1; i < 13; i++) {
				const date = new Date(2021, i, '0');
				table.set(month_long.format(date).toLowerCase(), i);
				table.set(month_short.format(date).toLowerCase(), i);
			}
		}
		language_month_tables.set(language, table);
	}
	return table;
}

/**
 * Month name (any supported language, long or short form) to its 1-based month number.
 * Names of the globally configured locale's language win over other languages.
 *
 * @param {string} monthName
 * @returns {number} 1-12, or 0 when the name is unknown
 */
function getMonthNumber(monthName) {
	const name = monthName.toLowerCase();
	locale_names_used = true;
	const language = configuredLanguage();
	const own = getLanguageMonthTable(language).get(name);
	if (own !== undefined) {
		return own;
	}
	// English names mean the same month in every language: no need for the all-language table yet
	const english = language === 'en' ? undefined : getLanguageMonthTable('en').get(name);
	if (english !== undefined) {
		return english;
	}
	if (!name_tables_built) {
		buildNameTables();
	}
	return months[name] || 0;
}

/**
 * if valid will be turn english month name
 *
 * @param {string} monthName
 * @returns {string|Boolean}
 */
function isValidMonth(monthName) {
	const monthNumber = getMonthNumber(monthName);
	return monthNumber ? month_numbers[monthNumber] : false;
}

/**
 * if valid will be turn english day name
 *
 * @param {string} dayname
 * @returns {string|Boolean}
 */
function isValidDayName(dayname) {
	if (!name_tables_built) {
		buildNameTables();
	}
	const dayNameLower = dayname.toLowerCase();
	return days[dayNameLower] ? day_numbers[days[dayNameLower]] : false;
}

// Wall clock (UTC-encoded ms) of the most recent local construction by a parser. Parsers build
// system-local Dates; when the global timezone differs from the system zone the constructor
// reinterprets that wall clock in the global zone, and reading it back from the local Date would
// be wrong whenever the reading falls in a system-zone DST gap (the local Date shifts forward).
let parsed_wall = Number.NaN;
// Needed while the global timezone differs from the system one (the default, kept in sync by
// index.js) and for a parse the constructor caches (enabled for that parse, see captureWallForParse).
let capture_default = false;
let capture_wall = false;

/**
 * Sets whether parses record their wall clock by default (see takeParsedWall).
 *
 * @param {boolean} enabled
 */
function setWallCapture(enabled) {
	capture_default = enabled;
	capture_wall = enabled;
}

/**
 * Records the wall clock of the current parse even when the default is off (a cached parse must
 * still reinterpret exactly if the global timezone changes later). resetParseCapture() restores
 * the default.
 */
function captureWallForParse() {
	capture_wall = true;
}

/**
 * Whether the current parse records its wall clock.
 *
 * @returns {boolean}
 */
function isWallCaptureEnabled() {
	return capture_wall;
}

// 400 Gregorian years: the calendar (leap years, weekdays) repeats with this period.
const GREGORIAN_CYCLE_YEARS = 400;
const GREGORIAN_CYCLE_MS = 146097 * 86400000;

/**
 * new Date(y, mo, d, h, mi, s, ms) (system-local) that also records the requested wall clock for
 * the constructor's timezone reinterpretation (see takeParsedWall). The Date constructor and
 * Date.UTC read years 0-99 as 1900-1999, so such a year is built one 400-year cycle later and
 * moved back: '1st Jan 0050' is the year 50.
 *
 * @returns {Date}
 */
function localFromFields(y, mo, d, h, mi, s, ms) {
	if (y >= 0 && y < 100) {
		const local = new Date(y + GREGORIAN_CYCLE_YEARS, mo, d, h, mi, s, ms);
		local.setFullYear(local.getFullYear() - GREGORIAN_CYCLE_YEARS);
		if (capture_wall) {
			parsed_wall = Date.UTC(y + GREGORIAN_CYCLE_YEARS, mo, d, h, mi, s, ms) - GREGORIAN_CYCLE_MS;
		}
		return local;
	}
	if (capture_wall) {
		parsed_wall = Date.UTC(y, mo, d, h, mi, s, ms);
	}
	return new Date(y, mo, d, h, mi, s, ms);
}

/**
 * Records the wall clock (UTC-encoded ms) of a local parse that did not go through localFromFields.
 *
 * @param {number} wall
 */
function recordParsedWall(wall) {
	parsed_wall = wall;
}

/**
 * Returns and clears the wall clock recorded by the last localFromFields() call (NaN if none).
 *
 * @returns {number}
 */
function takeParsedWall() {
	const wall = parsed_wall;
	parsed_wall = Number.NaN;
	return wall;
}

/**
 * Returns and clears whether a month/weekday name was resolved with the configured language's
 * preference since the last reset (see getMonthNumber/getWeekdayIndex).
 *
 * @returns {boolean}
 */
function takeLocaleNamesUsed() {
	const used = locale_names_used;
	locale_names_used = false;
	return used;
}

/**
 * Returns and clears the date the last parse took as "today" (NaN when it used no current date).
 *
 * @returns {number}
 */
function takeParsedToday() {
	const stamp = parsed_today;
	parsed_today = Number.NaN;
	return stamp;
}

/**
 * Starts a parse: clears what a previous (possibly throwing) parse recorded — its wall clock, name
 * resolution and current date — and restores the default wall-clock capture.
 */
function resetParseCapture() {
	parsed_wall = Number.NaN;
	locale_names_used = false;
	parsed_today = Number.NaN;
	capture_wall = capture_default;
}

// Ordinal day tokens accepted by the 'Do MMM YYYY' template ("1st", "3.", "1er", "3-й", ...).
const ORDINAL_DAY_TOKEN = /^\d{1,2}(st|nd|rd|th|\.|er|ème|te|º|ª|-й|वां|日|일|z|день)$/u;

// Length of an all-ASCII-digit token, or 0 when any character is not a digit.
function digitCount(token) {
	const len = token.length;
	for (let i = 0; i < len; i++) {
		const code = token.charCodeAt(i);
		if (code < 48 || code > 57) {
			return 0;
		}
	}
	return len;
}

/**
 * Claims a text-month input for `template` when — and only when — the happy path is certain:
 * the template's own legacy regex accepts the whole string, the month name is known, and the
 * day is within the range the legacy string round-trip accepted (native parsing of
 * "YYYY-MonthName-DD" is Invalid for day > 31 and rolls like the numeric constructor below it).
 * Every other shape returns false so the caller's legacy ladder handles it byte-identically.
 *
 * @param {KkDate} kkDate
 * @param {string} input - the full raw input (regex verification target)
 * @param {string} template - key into format_types / format_types_regex
 * @param {number} year
 * @param {string} monthToken - month name token, any supported language
 * @param {number} day
 * @returns {boolean} true when claimed (kkDate.date and kkDate.detected_format are set)
 */
function claimTextDate(kkDate, input, template, year, monthToken, day) {
	if (day < 1 || day > 31 || !format_types_regex[template].test(input)) {
		return false;
	}
	const monthNumber = getMonthNumber(monthToken);
	if (!monthNumber) {
		return false;
	}
	kkDate.date = localFromFields(year, monthNumber - 1, day, 0, 0, 0, 0);
	kkDate.detected_format = format_types[template];
	return true;
}

/**
 * Fast path for common text-month inputs ("15 January 2024", "Monday, 15 January 2024", ...):
 * predicts the template from the token layout, then delegates to claimTextDate which verifies
 * with the template's original regex — so acceptance is bit-identical to the legacy ladder.
 * Prediction order mirrors the ladder's claim precedence for overlapping layouts
 * (DD MMMM YYYY before D MMMM YYYY, ordinal Do before the 4-token forms).
 *
 * Declined shapes (2-digit years, unknown month names, day tokens with junk, extra or
 * tab-separated tokens, ...) return false and MUST keep falling through to the legacy chain.
 *
 * @param {KkDate} kkDate
 * @param {string} input - constructor string input containing at least one space
 * @returns {boolean} true when claimed
 */
function tryParseTextDate(kkDate, input) {
	const parts = input.split(' ');
	const count = parts.length;
	if (count === 3) {
		const dayDigits = digitCount(parts[0]);
		const lastDigits = digitCount(parts[2]);
		if (dayDigits >= 1 && dayDigits <= 2) {
			if (lastDigits === 4) {
				// "15 January 2024" — the zero-padded single-digit day belongs to D MMMM YYYY
				return (
					claimTextDate(kkDate, input, 'DD MMMM YYYY', +parts[2], parts[1], +parts[0]) ||
					claimTextDate(kkDate, input, 'D MMMM YYYY', +parts[2], parts[1], +parts[0])
				);
			}
			if (lastDigits === 0) {
				// "15 January Monday" — the weekday token is not validated (legacy behavior)
				return claimTextDate(kkDate, input, 'DD MMMM dddd', parseToday().year, parts[1], +parts[0]);
			}
			return false;
		}
		if (dayDigits === 4 && lastDigits === 2) {
			// "2024 Jan 15"
			return claimTextDate(kkDate, input, 'YYYY MMM DD', +parts[0], parts[1], +parts[2]);
		}
		if (dayDigits === 0 && lastDigits === 4 && ORDINAL_DAY_TOKEN.test(parts[0])) {
			// "1st Jan 2024" — legacy 'Do MMM YYYY' accepts any 4-digit year
			return claimTextDate(kkDate, input, 'Do MMM YYYY', +parts[2], parts[1], parseInt(parts[0], 10));
		}
		return false;
	}
	if (count === 4) {
		if (digitCount(parts[3]) !== 4) {
			// "15 January 2024 Monday" — the weekday must be a real weekday name (no legacy rung ever
			// claimed this shape, so junk words keep failing)
			const dayDigits = digitCount(parts[0]);
			if (dayDigits >= 1 && dayDigits <= 2 && digitCount(parts[2]) === 4 && isValidDayName(parts[3])) {
				return claimTextDate(kkDate, input, 'DD MMMM YYYY dddd', +parts[2], parts[1], +parts[0]);
			}
			return false;
		}
		const day = digitCount(parts[1]) ? +parts[1] : +parts[0];
		if (parts[0].charCodeAt(parts[0].length - 1) === 44) {
			// "Monday, 15 January 2024"
			return claimTextDate(kkDate, input, 'dddd, DD MMMM YYYY', +parts[3], parts[2], day);
		}
		if (parts[2].charCodeAt(parts[2].length - 1) === 44) {
			// "15 January Monday, 2024" — detected_format is the real template here; the legacy
			// rung historically mislabeled it (see the constructor ladder).
			return claimTextDate(kkDate, input, 'DD MMMM dddd, YYYY', +parts[3], parts[1], +parts[0]);
		}
		const dayDigits = digitCount(parts[0]);
		if (dayDigits >= 1 && dayDigits <= 2 && isValidDayName(parts[2])) {
			// "15 January Monday 2024" — a real weekday name is required (new shape, see above)
			return claimTextDate(kkDate, input, 'DD MMMM dddd YYYY', +parts[3], parts[1], +parts[0]);
		}
		return false;
	}
	if (count === 2) {
		const dayDigits = digitCount(parts[0]);
		if (dayDigits >= 1 && dayDigits <= 2) {
			// "15 January" — current year in the global timezone (legacy behavior)
			return claimTextDate(kkDate, input, 'DD MMMM', parseToday().year, parts[1], +parts[0]);
		}
		if (dayDigits === 0 && digitCount(parts[1]) === 4) {
			// "January 2024" — new rung with no legacy equivalent: unknown month names must keep
			// falling through so inputs like "Blah 2024" keep their legacy native-parse result.
			return claimTextDate(kkDate, input, 'MMMM YYYY', +parts[1], parts[0], 1);
		}
	}
	return false;
}

/**
 * Enhanced timezone offset calculation with DST support
 *
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Date for which to calculate offset (defaults to current date)
 * @returns {number} - Offset in milliseconds
 */
function getTimezoneOffset(timezone, date = new Date()) {
	// Validate timezone first (outside try-catch for proper error handling)
	checkTimezone(timezone);
	return zoneOffsetMs(timezone, date.getTime(), date);
}

/**
 * Offset (ms) of an already validated `timezone` at instant `ms` — the cached core of
 * getTimezoneOffset, used directly by the internal arithmetic (no validation, and a Date is only
 * allocated when Intl must actually be asked).
 *
 * @param {string} timezone
 * @param {number} ms
 * @param {Date} [date] - the same instant as a Date, when the caller has one
 * @returns {number}
 */
function zoneOffsetMs(timezone, ms, date) {
	// Per-zone record, stored in timezone_cache under the zone name so that clearing timezone_cache
	// resets everything: `days` maps a UTC day to its offset once the day is verified to have a
	// constant one (see verifyConstantDay), to false for a day with a transition, and to null for a
	// day seen once; `exact` maps instants to offsets (a repeated instant needs no Intl call and no
	// string key).
	let zone = timezone_cache.get(timezone);
	if (zone === undefined) {
		zone = { days: new Map(), exact: new Map() };
		boundedTimezoneCacheSet(timezone, zone);
	}
	const day = Math.floor(ms / DAY_MS);
	const dayOffset = zone.days.get(day);
	if (typeof dayOffset === 'number') {
		return dayOffset;
	}
	const cachedOffset = zone.exact.get(ms);
	if (cachedOffset !== undefined) {
		return cachedOffset;
	}
	if (Number.isNaN(day)) {
		return exactTimezoneOffset(timezone, date || new Date(ms));
	}
	if (dayOffset === null) {
		// A second instant on this day: verify the day once, so later lookups are free.
		return verifyConstantDay(timezone, zone, day, ms, date || new Date(ms));
	}
	if (dayOffset === undefined) {
		countZoneOffsetEntry();
		zone.days.set(day, null);
	}
	return rememberExactOffset(zone, ms, exactTimezoneOffset(timezone, date || new Date(ms)));
}

// Entries held by the per-zone records (days + exact instants, all zones together): above this
// many, timezone_cache is cleared wholesale like the other result caches.
const ZONE_OFFSET_ENTRY_LIMIT = 50000;
let zone_offset_entries = 0;

/**
 * Counts one new per-zone entry, clearing timezone_cache when the limit is passed.
 */
function countZoneOffsetEntry() {
	if (++zone_offset_entries > ZONE_OFFSET_ENTRY_LIMIT) {
		timezone_cache.clear();
		zone_offset_entries = 1;
	}
}

/**
 * Stores the offset of instant `ms` in a per-zone record.
 *
 * @returns {number} the offset
 */
function rememberExactOffset(zone, ms, offset) {
	countZoneOffsetEntry();
	zone.exact.set(ms, offset);
	return offset;
}

/**
 * Bounded write to timezone_cache (cleared wholesale above 10,000 entries).
 *
 * @param {string} key
 * @param {*} value
 */
function boundedTimezoneCacheSet(key, value) {
	if (timezone_cache.size > 10000) {
		timezone_cache.clear();
	}
	timezone_cache.set(key, value);
}

/**
 * Offset of `timezone` at exactly `date` from Intl (longOffset), with the Hermes fallback.
 *
 * @param {string} timezone
 * @param {Date} date
 * @returns {number}
 */
function exactTimezoneOffset(timezone, date) {
	try {
		let formatter = long_timezone_cache.get(timezone);
		if (formatter === undefined) {
			formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				timeZoneName: 'longOffset',
			});
			boundedSet(long_timezone_cache, timezone, formatter);
		}
		// Get timezone offset using Intl.DateTimeFormat with timeZoneName
		const parts = formatter.formatToParts(date);
		const offsetPart = parts.find((part) => part.type === 'timeZoneName');

		if (!offsetPart) {
			throw new Error('Could not determine timezone offset');
		}

		let offsetStr = offsetPart.value.replace('GMT', '');

		// Handle Hermes/React Native where GMT offset is split into multiple parts
		// e.g., [timeZoneName: "GMT"], [literal: "+"], [literal: "03"], [literal: ":"], [timeZoneName: "00"]
		if (offsetStr === '' || offsetStr === 'GMT') {
			// Try to reconstruct offset from split parts
			const gmtIndex = parts.findIndex((p) => p.type === 'timeZoneName' && (p.value === 'GMT' || p.value.startsWith('GMT')));
			if (gmtIndex !== -1) {
				// Collect subsequent parts that form the offset
				let reconstructed = '';
				for (let i = gmtIndex + 1; i < parts.length; i++) {
					const part = parts[i];
					// Stop if we hit a non-offset part (another timeZoneName that's not numeric)
					if (part.type === 'timeZoneName' && !/^\d+$/.test(part.value)) {
						break;
					}
					// Collect literals (+, -, :, digits) and numeric timeZoneName parts
					if (part.type === 'literal' || (part.type === 'timeZoneName' && /^\d+$/.test(part.value))) {
						reconstructed += part.value;
					}
				}
				if (reconstructed) {
					offsetStr = reconstructed;
				}
			}
		}

		// If still empty or invalid, fallback
		if (!offsetStr || offsetStr === '' || offsetStr === 'GMT') {
			throw new Error('Invalid offset parsing - falling back');
		}

		const isNegative = offsetStr.startsWith('-');
		const timeStr = offsetStr.replace(/[+-]/, '');
		// Historical local mean time carries seconds ("GMT+01:55:52"); they are part of the offset.
		const [hours, minutes = 0, seconds = 0] = timeStr.split(':').map(Number);

		const totalSeconds = hours * 3600 + minutes * 60 + seconds;

		// Check for NaN (Hermes splits timeZoneName into multiple parts)
		if (Number.isNaN(totalSeconds)) {
			throw new Error('Invalid offset parsing - falling back');
		}

		// For timezone conversion, we need the offset from UTC to the target timezone
		// GMT-05:00 means the timezone is 5 hours behind UTC, so offset should be -5
		// GMT+08:00 means the timezone is 8 hours ahead of UTC, so offset should be +8
		const offsetMs = (isNegative ? -totalSeconds : totalSeconds) * 1000;

		return offsetMs;
	} catch {
		// Fallback: Use date comparison method (Hermes/React Native compatible)
		return getTimezoneOffsetFallback(timezone, date);
	}
}

/**
 * Exact offset for `date` plus a one-time check of its UTC day: when the offset is identical at
 * the day's start, every six hours and its last millisecond, no transition happens that day (two
 * transitions cancelling out within six hours do not occur in tzdata) and all later lookups on
 * that day are answered from the cache without Intl.
 *
 * @returns {number}
 */
function verifyConstantDay(timezone, zone, day, ms, date) {
	const start = day * DAY_MS;
	const probes = [start, start + 6 * HOUR_MS, start + 12 * HOUR_MS, start + 18 * HOUR_MS, start + DAY_MS - 1];
	const offsets = probes.map((probe) => exactTimezoneOffset(timezone, new Date(probe)));
	const constant = offsets.every((offset) => offset === offsets[0]);
	zone.days.set(day, constant ? offsets[0] : false);
	return constant ? offsets[0] : rememberExactOffset(zone, ms, exactTimezoneOffset(timezone, date));
}

/**
 * Fallback method for timezone offset calculation
 * Used when longOffset is not supported (e.g., React Native Hermes)
 *
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Date for which to calculate offset
 * @returns {number} - Offset in milliseconds
 */
function getTimezoneOffsetFallback(timezone, date) {
	try {
		const formatter = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		});

		const parts = formatter.formatToParts(date);
		const p = {};
		for (const part of parts) {
			p[part.type] = part.value;
		}

		// Engines that resolve hour12:false to the h24 cycle render midnight as "24" on the SAME
		// calendar day (CLDR "k" pattern), so it is hour 0 of that day — exactly how converter()
		// reads it. Adding a day here would skew the offset by +24h.
		let hour = parseInt(p.hour, 10);
		if (hour === 24) {
			hour = 0;
		}

		const tzTimeAsUtc = Date.UTC(
			parseInt(p.year, 10),
			parseInt(p.month, 10) - 1,
			parseInt(p.day, 10),
			hour,
			parseInt(p.minute, 10),
			parseInt(p.second, 10),
		);

		// Add milliseconds from original date (formatter doesn't include ms)
		return tzTimeAsUtc - (date.getTime() - date.getMilliseconds());
	} catch {
		throw new Error(`Invalid timezone: ${timezone}`);
	}
}

/**
 * Check if timezone is valid
 *
 * @param {string} timezone - IANA timezone identifier
 * @returns {boolean}
 */
function checkTimezone(timezone) {
	// Intl treats an undefined timeZone as "use the default zone", so non-strings must be
	// rejected explicitly or setTimezone(undefined)/tz(undefined) would silently pass.
	if (typeof timezone !== 'string' || timezone === '') {
		throw new Error(`Invalid timezone: ${timezone}`);
	}
	try {
		if (timezone_check_cache.has(timezone)) {
			return true;
		}
		// Test if timezone is valid by trying to format a date
		new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
		boundedSet(timezone_check_cache, timezone, true);
		return true;
	} catch {
		throw new Error(`Invalid timezone: ${timezone}`);
	}
}

/**
 * UTC offset (ms) of `timezone` at instant `ms`. The system zone (and an unset zone) use the
 * native Date offset — identical to Intl there, without a formatToParts call — and UTC is 0.
 *
 * @param {string|undefined} timezone
 * @param {number} ms
 * @returns {number}
 */
function offsetAt(timezone, ms) {
	if (isUtcZone(timezone)) {
		return 0;
	}
	if (!timezone || timezone === systemTimezone) {
		return systemOffsetAt(ms);
	}
	// Internal callers only pass zones validated by tz()/config()/setTimezone().
	return zoneOffsetMs(timezone, ms);
}

// Names of the zero-offset zone; when the system zone is one of them, local time is UTC.
const UTC_ZONE_NAMES = new Set([
	'UTC',
	'Etc/UTC',
	'Etc/UCT',
	'UCT',
	'Etc/Universal',
	'Universal',
	'Etc/Zulu',
	'Zulu',
	'Etc/GMT',
	'GMT',
	'Etc/GMT0',
	'GMT0',
	'Etc/GMT+0',
	'GMT+0',
	'Etc/GMT-0',
	'GMT-0',
	'Etc/Greenwich',
	'Greenwich',
]);
const SYSTEM_IS_UTC = UTC_ZONE_NAMES.has(systemTimezone);

/**
 * Whether `timezone` (undefined = system) has a constant zero offset, so wall clock = UTC.
 *
 * @param {string|undefined} timezone
 * @returns {boolean}
 */
function isUtcZone(timezone) {
	return timezone ? UTC_ZONE_NAMES.has(timezone) : SYSTEM_IS_UTC;
}

// From 1973 on every zone's offset is a whole number of minutes (Liberia, the last zone on a
// local-mean-time offset with seconds, moved to GMT in 1972).
const WHOLE_MINUTE_OFFSETS_FROM = Date.UTC(1973, 0, 1);

/**
 * UTC offset (ms) of the system timezone at instant `ms`. Date#getTimezoneOffset truncates
 * historical local-mean-time offsets to whole minutes (Istanbul 1869: +01:55:52 reads as 115
 * minutes) while the local field getters use the exact offset, so before 1973 the offset is
 * derived from the fields to stay consistent with them.
 *
 * @param {number} ms
 * @returns {number}
 */
function systemOffsetAt(ms) {
	const d = new Date(ms);
	if (!(ms < WHOLE_MINUTE_OFFSETS_FROM)) {
		return -d.getTimezoneOffset() * 60000;
	}
	const utc = new Date(0);
	utc.setUTCFullYear(d.getFullYear(), d.getMonth(), d.getDate());
	utc.setUTCHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
	return utc.getTime() - ms;
}

/**
 * Wall-clock reading of instant `ms` in `timezone`, encoded as UTC milliseconds (read it back
 * with the getUTC* accessors).
 *
 * @param {string|undefined} timezone
 * @param {number} ms
 * @returns {number}
 */
function toWallClock(timezone, ms) {
	return ms + offsetAt(timezone, ms);
}

const DAY_MS = 86400000;
const HOUR_MS = 3600000;

/**
 * Converts a wall-clock reading in `timezone` (encoded as UTC milliseconds) to the real instant.
 *
 * The offsets in force a day before and a day after the reading bracket any DST transition that
 * can affect it (real instants lie within ±14h of the reading). Without a transition the answer
 * is immediate. Around one, both candidates are checked against the offset at the candidate
 * itself, so the result never depends on where the reading happens to fall relative to the
 * transition in UTC terms:
 * - exactly one candidate is consistent → that instant;
 * - both are (fall-back overlap) → the one with `preferOffset` (add()/set() pass the offset of
 *   the instant they started from, so the result stays on the same side of the change, like
 *   moment-timezone and Luxon), else the earlier instant (parsing, like moment and Luxon);
 * - neither is (spring-forward gap) → shifted forward by the gap, like moment/luxon.
 *
 * @param {string|undefined} timezone
 * @param {number} wallMs
 * @param {number} [preferOffset=NaN] - offset (ms) to keep when the reading is ambiguous
 * @returns {number} instant in ms (NaN for a NaN reading)
 */
function wallClockToInstant(timezone, wallMs, preferOffset = Number.NaN) {
	if (Number.isNaN(wallMs) || isUtcZone(timezone)) {
		return wallMs;
	}
	if (!timezone || timezone === systemTimezone) {
		// The engine's own local-time resolution has exactly these semantics (ECMA-262 resolves a
		// skipped wall time with the offset before the transition, i.e. forward, and a repeated
		// one to the earlier instant) and costs no offset lookups.
		const instant = systemWallClockToInstant(wallMs);
		return Number.isNaN(preferOffset) ? instant : keepSystemOffset(instant, preferOffset);
	}
	// Probes are snapped to the hour so neighbouring readings share cached offset lookups.
	const probe = wallMs - (((wallMs % HOUR_MS) + HOUR_MS) % HOUR_MS);
	const before = offsetAt(timezone, probe - DAY_MS);
	const after = offsetAt(timezone, probe + DAY_MS);
	if (before === after) {
		return wallMs - before;
	}
	const earlyCandidate = wallMs - before;
	const lateCandidate = wallMs - after;
	const earlyValid = offsetAt(timezone, earlyCandidate) === before;
	const lateValid = offsetAt(timezone, lateCandidate) === after;
	if (earlyValid && lateValid) {
		if (preferOffset === after) {
			return lateCandidate;
		}
		return preferOffset === before ? earlyCandidate : Math.min(earlyCandidate, lateCandidate);
	}
	if (earlyValid) {
		return earlyCandidate;
	}
	if (lateValid) {
		return lateCandidate;
	}
	return wallMs - Math.min(before, after);
}

/**
 * `instant` resolved by the system zone (the earlier one for a repeated wall clock), moved to the
 * same wall clock at `preferOffset` when that is a valid reading too (DST overlap): add()/set()
 * then stay on the same side of the change as the instant they started from (moment-timezone,
 * Luxon).
 *
 * @param {number} instant
 * @param {number} preferOffset - offset (ms)
 * @returns {number}
 */
function keepSystemOffset(instant, preferOffset) {
	const offset = systemOffsetAt(instant);
	if (offset === preferOffset || Number.isNaN(instant)) {
		return instant;
	}
	const candidate = instant + offset - preferOffset;
	return systemOffsetAt(candidate) === preferOffset ? candidate : instant;
}

/**
 * Wall-clock reading (UTC-encoded ms) in the system timezone -> instant, via the Date constructor.
 * Years 0-99 go through setFullYear because the constructor maps them to 1900-1999.
 *
 * @param {number} wallMs
 * @returns {number}
 */
function systemWallClockToInstant(wallMs) {
	const w = new Date(wallMs);
	const year = w.getUTCFullYear();
	if (year >= 0 && year <= 99) {
		const local = new Date(0);
		local.setFullYear(year, w.getUTCMonth(), w.getUTCDate());
		local.setHours(w.getUTCHours(), w.getUTCMinutes(), w.getUTCSeconds(), w.getUTCMilliseconds());
		return local.getTime();
	}
	return new Date(year, w.getUTCMonth(), w.getUTCDate(), w.getUTCHours(), w.getUTCMinutes(), w.getUTCSeconds(), w.getUTCMilliseconds()).getTime();
}

/**
 * Number of days in a month of a (proleptic Gregorian) year. Works for any year, including
 * 0-99 which Date.UTC would map to 1900-1999; month overflow is normalized.
 *
 * @param {number} year
 * @param {number} month0 - 0-based month
 * @returns {number}
 */
function daysInMonth(year, month0) {
	// integer parts like the Date setters; NaN in, NaN out
	const months = Math.trunc(year) * 12 + Math.trunc(month0);
	if (Number.isNaN(months)) {
		return Number.NaN;
	}
	const y = Math.floor(months / 12);
	const m = months - y * 12;
	if (m === 1) {
		return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
	}
	return m === 3 || m === 5 || m === 8 || m === 10 ? 30 : 31;
}

// Today's date in the global timezone, the zone naive inputs are interpreted in (a server running
// in UTC with setTimezone('Europe/Istanbul') must resolve '14:30' onto Istanbul's date, not UTC's).
// Valid while Date.now() lies inside [from, until) and the global zone is unchanged; both
// boundaries are real instants of that zone's midnights, so the window stays exact across DST
// transitions (23/25-hour days). stamp is the date as a UTC-encoded midnight.
const today = { year: 0, month: 0, day: 0, stamp: Number.NaN, from: 1, until: 0, zone: null };

function refreshToday(nowMs) {
	const zone = global_config.timezone;
	const wall = new Date(toWallClock(zone, nowMs));
	today.year = wall.getUTCFullYear();
	today.month = wall.getUTCMonth();
	today.day = wall.getUTCDate();
	today.stamp = Date.UTC(today.year, today.month, today.day);
	today.from = wallClockToInstant(zone, today.stamp);
	today.until = wallClockToInstant(zone, Date.UTC(today.year, today.month, today.day + 1));
	today.zone = zone;
}

/**
 * Today's date in the global timezone, refreshed when the day or the global timezone changed.
 *
 * @returns {{year: number, month: number, day: number, stamp: number}} month is 0-based
 */
function ensureToday() {
	const nowMs = Date.now();
	if (nowMs < today.from || nowMs >= today.until || today.zone !== global_config.timezone) {
		refreshToday(nowMs);
	}
	return today;
}

/**
 * ensureToday() for a parse that depends on the current date: the date is also recorded as the
 * one the parse used (see takeParsedToday), so the constructor's parse cache reuses the result on
 * that date only.
 *
 * @returns {{year: number, month: number, day: number, stamp: number}} month is 0-based
 */
function parseToday() {
	ensureToday();
	parsed_today = today.stamp;
	return today;
}

// How the engine's Date parser reads the zone of a string it accepts (see nativeZoneKind).
const ZONE_NONE = 0; // no zone: read as local time (a naive wall clock)
const ZONE_EXPLICIT = 1; // own offset or zone name: an absolute instant
const ZONE_UTC_DATE = 2; // ES5 date-only form ('2024', '2024-01'): read as UTC midnight by ECMA-262

// ES5 Date Time String Format as the engine accepts it, plus its ±hhmm extension:
// (YYYY|±YYYYYY)[-MM[-DD]][THH:mm[:ss[.s+]][Z|±hh:mm|±hhmm]]
const ES5_DATE_TIME_REGEX = /^(?:[+-]\d{6}|\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:([Tt])\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?([Zz]|[+-]\d{2}:?\d{2})?)?$/;

// Words of the engine's legacy date parser, keyed by their first three characters with the ASCII
// case bit set (c0 << 16 | c1 << 8 | c2, 0 for a shorter word): time zone names with their offset
// in hours, and month names (longer words allowed).
const wordKey = (word) => (word.charCodeAt(0) << 16) | ((word.charCodeAt(1) || 0) << 8) | (word.charCodeAt(2) || 0);
const LEGACY_ZONE_WORDS = new Map(
	[
		['ut', 0],
		['utc', 0],
		['z', 0],
		['gmt', 0],
		['cdt', -5],
		['cst', -6],
		['edt', -4],
		['est', -5],
		['mdt', -6],
		['mst', -7],
		['pdt', -7],
		['pst', -8],
	].map(([word, offset]) => [wordKey(word), offset]),
);
const LEGACY_MONTH_WORDS = new Set(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].map(wordKey));
const TOKEN_END = 0;
const TOKEN_NUMBER = 1;
const TOKEN_SYMBOL = 2;
const TOKEN_ZONE = 3;
const TOKEN_MONTH = 4;
const TOKEN_OTHER = 5;

/**
 * @param {number} code
 * @returns {boolean} ECMAScript WhiteSpace or LineTerminator
 */
function isWhiteSpaceCode(code) {
	return (
		code === 32 ||
		(code >= 9 && code <= 13) ||
		code === 160 ||
		code === 0x1680 ||
		(code >= 0x2000 && code <= 0x200a) ||
		code === 0x2028 ||
		code === 0x2029 ||
		code === 0x202f ||
		code === 0x205f ||
		code === 0x3000 ||
		code === 0xfeff
	);
}

// Token buffers shared by the calls on short strings (a string has at most one token per character,
// plus the end marker); a longer string gets buffers of its own, so memory never stays proportional
// to the longest input seen.
const TOKEN_BUFFER_SIZE = 128;
const token_kinds = new Int32Array(TOKEN_BUFFER_SIZE);
const token_values = new Int32Array(TOKEN_BUFFER_SIZE);
const token_lengths = new Int32Array(TOKEN_BUFFER_SIZE);

/**
 * Tokens of the engine's legacy date parser (V8 DateStringTokenizer) into the given buffers:
 * numbers (value of the first nine significant digits — leading zeros are skipped — and the
 * length), the symbols : - + . ), words (characters from 'A' up; zone names carry their offset in
 * hours), and everything else (whitespace, parenthesised comments, other characters) as ignorable
 * tokens. Ends with TOKEN_END.
 *
 * @param {string} s - text up to (not including) any NUL character
 * @param {Int32Array} kinds
 * @param {Int32Array} values
 * @param {Int32Array} lengths
 */
function tokenizeLegacyDate(s, kinds, values, lengths) {
	const n = s.length;
	const token_kinds = kinds;
	const token_values = values;
	const token_lengths = lengths;
	let count = 0;
	let i = 0;
	while (i < n) {
		const c = s.charCodeAt(i);
		let kind = TOKEN_OTHER;
		let value = 0;
		const start = i;
		if (c >= 48 && c <= 57) {
			while (i < n && s.charCodeAt(i) === 48) {
				i++;
			}
			let digits = 0;
			while (i < n && isDigitCode(s.charCodeAt(i))) {
				if (digits < 9) {
					value = value * 10 + s.charCodeAt(i) - 48;
				}
				digits++;
				i++;
			}
			kind = TOKEN_NUMBER;
		} else if (c === 58 || c === 45 || c === 43 || c === 46 || c === 41) {
			kind = TOKEN_SYMBOL;
			value = c;
			i++;
		} else if (c >= 65 && !isWhiteSpaceCode(c)) {
			while (i < n && s.charCodeAt(i) >= 65 && !isWhiteSpaceCode(s.charCodeAt(i))) {
				i++;
			}
			// the engine compares the first three characters with the ASCII case bit set
			const length = i - start;
			const key = ((c | 0x20) << 16) | (length > 1 ? (s.charCodeAt(start + 1) | 0x20) << 8 : 0) | (length > 2 ? s.charCodeAt(start + 2) | 0x20 : 0);
			if (length <= 3 && LEGACY_ZONE_WORDS.has(key)) {
				kind = TOKEN_ZONE;
				value = LEGACY_ZONE_WORDS.get(key);
			} else if (length >= 3 && LEGACY_MONTH_WORDS.has(key)) {
				kind = TOKEN_MONTH;
			}
		} else if (c === 40) {
			// parenthesised comment, skipped as a whole
			let balance = 0;
			do {
				const d = s.charCodeAt(i);
				if (d === 41) {
					balance--;
				} else if (d === 40) {
					balance++;
				}
				i++;
			} while (balance > 0 && i < n);
		} else {
			i++;
		}
		token_kinds[count] = kind;
		token_values[count] = value;
		token_lengths[count] = i - start;
		count++;
	}
	token_kinds[count] = TOKEN_END;
}

/**
 * Whether the engine's legacy date parser (V8 DateParser, non-ES5 strings) reads a zone from a
 * string it accepts: a zone name after a number, or a sign after a time or after a UTC name
 * ("GMT+3", "10:00 PM -0500", "22:00 +3"). Mirrors the parser's state machine as far as the zone
 * depends on it (a '-' right after a date number or month name is a separator, not a sign).
 *
 * @param {string} s
 * @returns {number} ZONE_EXPLICIT or ZONE_NONE
 */
function legacyZoneKind(s) {
	const shared = s.length < TOKEN_BUFFER_SIZE;
	const kinds = shared ? token_kinds : new Int32Array(s.length + 1);
	const values = shared ? token_values : new Int32Array(s.length + 1);
	const lengths = shared ? token_lengths : new Int32Array(s.length + 1);
	tokenizeLegacyDate(s, kinds, values, lengths);
	let i = 0;
	let hasReadNumber = false;
	// The engine first reads an ES5 date prefix — (±YYYYYY|YYYY)[-MM[-DD]] — and hands the rest to
	// its legacy rules with the year already read; a part it rejects is read again by those rules.
	if (kinds[0] === TOKEN_SYMBOL && (values[0] === 43 || values[0] === 45)) {
		if (kinds[1] === TOKEN_NUMBER && lengths[1] === 6) {
			// the year -000000 is rejected after being read: it is dropped, not re-read
			i = 2;
			hasReadNumber = !(values[0] === 45 && values[1] === 0);
		}
	} else if (kinds[0] === TOKEN_NUMBER && lengths[0] === 4) {
		i = 1;
		hasReadNumber = true;
	}
	if (hasReadNumber && kinds[i] === TOKEN_SYMBOL && values[i] === 45) {
		i++;
		if (kinds[i] === TOKEN_NUMBER && lengths[i] === 2 && values[i] >= 1 && values[i] <= 12) {
			i++;
			if (kinds[i] === TOKEN_SYMBOL && values[i] === 45) {
				i++;
				if (kinds[i] === TOKEN_NUMBER && lengths[i] === 2 && values[i] >= 1 && values[i] <= 31) {
					i++;
				}
			}
		}
	}
	// time components read so far (4 once the time is final); zone hour/minute (-1: none)
	let timeIndex = 0;
	let zoneSet = false;
	let zoneHour = -1;
	let zoneMinute = -1;
	for (let kind = kinds[i++]; kind !== TOKEN_END; kind = kinds[i++]) {
		if (kind === TOKEN_NUMBER) {
			hasReadNumber = true;
			const n = values[i - 1];
			const timeExpecting = timeIndex === 1 || timeIndex === 2 ? n <= 59 : timeIndex === 3 && n <= 999;
			if (kinds[i] === TOKEN_SYMBOL && values[i] === 58) {
				i++;
				if (kinds[i] === TOKEN_SYMBOL && values[i] === 58) {
					i++;
					timeIndex += 2;
				} else {
					timeIndex++;
					if (kinds[i] === TOKEN_SYMBOL && values[i] === 46) {
						i++;
					}
				}
			} else {
				// a following '.' is consumed even when the time does not expect this number
				const dot = kinds[i] === TOKEN_SYMBOL && values[i] === 46;
				if (dot) {
					i++;
				}
				if (dot && timeExpecting) {
					timeIndex = 4; // seconds and milliseconds end the time
					i++;
				} else if (zoneHour !== -1 && zoneMinute === -1 && n <= 59) {
					zoneMinute = n;
				} else if (timeExpecting) {
					timeIndex = 4;
				} else if (kinds[i] === TOKEN_SYMBOL && values[i] === 45) {
					i++; // a '-' after a date number is a separator
				}
			}
		} else if (kind === TOKEN_ZONE && hasReadNumber) {
			zoneSet = true;
			zoneHour = Math.abs(values[i - 1]);
			zoneMinute = 0;
		} else if (kind === TOKEN_MONTH) {
			if (kinds[i] === TOKEN_SYMBOL && values[i] === 45) {
				i++;
			}
		} else if (kind === TOKEN_SYMBOL && (values[i - 1] === 43 || values[i - 1] === 45) && ((zoneHour === 0 && zoneMinute === 0) || timeIndex !== 0)) {
			zoneSet = true;
			let value = 0;
			let length = 0;
			if (kinds[i] === TOKEN_NUMBER) {
				value = values[i];
				length = lengths[i];
				i++;
			}
			hasReadNumber = true;
			if (kinds[i] === TOKEN_SYMBOL && values[i] === 58) {
				zoneHour = value;
				zoneMinute = -1;
			} else if (length === 1 || length === 2) {
				zoneHour = value;
				zoneMinute = 0;
			} else {
				zoneHour = Math.floor(value / 100);
				zoneMinute = value % 100;
			}
		}
	}
	return zoneSet ? ZONE_EXPLICIT : ZONE_NONE;
}

/**
 * How the engine's Date parser reads the zone of a string it parsed successfully: an ES5 date-time
 * with Z/offset or a legacy string with a zone name or offset is ZONE_EXPLICIT (absolute), an ES5
 * date-only form is ZONE_UTC_DATE (the engine reads it as UTC midnight), anything else ZONE_NONE
 * (local time).
 *
 * @param {string} input
 * @returns {number}
 */
function nativeZoneKind(text) {
	// the engine reads a string up to its first NUL character
	const nul = text.indexOf('\u0000');
	const input = nul === -1 ? text : text.slice(0, nul);
	// Cheap exact answers first. Without a letter (or other character from 'A' up) and without a
	// sign there is neither a zone name nor an offset: only a bare 4-digit year ("2024") is then an
	// ES5 date-only form. A zone name as the last word, after a number, always sets the zone —
	// unless a parenthesis opens a comment, which may run to the end and swallow it.
	let i = input.length - 1;
	let letters = false;
	let parenthesis = false;
	for (let k = 0; k <= i; k++) {
		const c = input.charCodeAt(k);
		if (c >= 65 || c === 43 || c === 45) {
			letters = true;
		} else if (c === 40) {
			parenthesis = true;
		}
	}
	if (!letters) {
		return input.length === 4 && ES5_DATE_TIME_REGEX.test(input) ? ZONE_UTC_DATE : ZONE_NONE;
	}
	while (!parenthesis && i >= 0 && isWhiteSpaceCode(input.charCodeAt(i))) {
		i--;
	}
	let wordStart = i;
	while (wordStart >= 0 && input.charCodeAt(wordStart) >= 65 && !isWhiteSpaceCode(input.charCodeAt(wordStart))) {
		wordStart--;
	}
	const wordLength = i - wordStart;
	if (!parenthesis && wordLength >= 1 && wordLength <= 3) {
		const c0 = input.charCodeAt(wordStart + 1) | 0x20;
		const key =
			(c0 << 16) |
			(wordLength > 1 ? (input.charCodeAt(wordStart + 2) | 0x20) << 8 : 0) |
			(wordLength > 2 ? input.charCodeAt(wordStart + 3) | 0x20 : 0);
		if (LEGACY_ZONE_WORDS.has(key)) {
			for (let k = wordStart; k >= 0; k--) {
				if (isDigitCode(input.charCodeAt(k))) {
					return ZONE_EXPLICIT;
				}
			}
		}
	}
	const es5 = input.startsWith('-000000') ? null : ES5_DATE_TIME_REGEX.exec(input);
	// an out-of-range month or day (or the year -000000) makes the engine continue with its legacy parser
	if (es5 !== null && (es5[1] === undefined || (+es5[1] >= 1 && +es5[1] <= 12)) && (es5[2] === undefined || (+es5[2] >= 1 && +es5[2] <= 31))) {
		if (es5[4] !== undefined) {
			return ZONE_EXPLICIT;
		}
		return es5[3] === undefined ? ZONE_UTC_DATE : ZONE_NONE;
	}
	return legacyZoneKind(input);
}

/**
 * The text of a naive date string as the engine's parser reads it, ready for a zone to be
 * appended: cut at the first NUL character (where the engine stops) and with a parenthesised
 * comment that is still open at the end closed (it would swallow anything appended).
 *
 * @param {string} text
 * @returns {string}
 */
function closedEngineText(text) {
	const nul = text.indexOf('\u0000');
	const s = nul === -1 ? text : text.slice(0, nul);
	const n = s.length;
	let open = 0;
	let i = 0;
	while (i < n) {
		if (s.charCodeAt(i) !== 40) {
			i++;
			continue;
		}
		// '(' always starts a comment (it is part of no other token); it runs to the matching ')'
		let balance = 0;
		do {
			const c = s.charCodeAt(i);
			if (c === 41) {
				balance--;
			} else if (c === 40) {
				balance++;
			}
			i++;
		} while (balance > 0 && i < n);
		open = balance;
	}
	return open > 0 ? s + ')'.repeat(open) : s;
}

/**
 * True when a date string carries its own UTC offset / zone, i.e. denotes an absolute instant
 * that must never be reinterpreted in the global timezone. Only meaningful for strings the
 * engine's Date parser accepts.
 *
 * @param {string} input
 * @returns {boolean}
 */
function hasExplicitZone(input) {
	// Fast path for the common ISO 8601 form "YYYY-MM-DDT…d:dd±hh:mm" (the engine reads a string of
	// this shape with its ES5 parser, so nothing but the trailing offset can be a zone).
	const len = input.length;
	const sign = input.charCodeAt(len - 6);
	if (
		input.charCodeAt(4) === 45 &&
		input.charCodeAt(7) === 45 &&
		(input.charCodeAt(10) | 0x20) === 116 &&
		(sign === 43 || sign === 45) &&
		input.charCodeAt(len - 3) === 58 &&
		input.charCodeAt(len - 9) === 58 &&
		isDigitCode(input.charCodeAt(len - 1)) &&
		isDigitCode(input.charCodeAt(len - 2)) &&
		isDigitCode(input.charCodeAt(len - 4)) &&
		isDigitCode(input.charCodeAt(len - 5)) &&
		isDigitCode(input.charCodeAt(len - 7)) &&
		isDigitCode(input.charCodeAt(len - 8)) &&
		isDigitCode(input.charCodeAt(len - 10))
	) {
		return true;
	}
	return nativeZoneKind(input) === ZONE_EXPLICIT;
}

/**
 * @param {number} code - a charCode (NaN past the end of a string)
 * @returns {boolean} true for '0'-'9'
 */
function isDigitCode(code) {
	return code >= 48 && code <= 57;
}

/**
 * Get timezone information including DST status
 *
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Date for which to get info (defaults to current date)
 * @returns {object} - Timezone information
 */
function getTimezoneInfo(timezone, date = new Date()) {
	try {
		checkTimezone(timezone);

		// Get current offset
		const currentOffset = getTimezoneOffset(timezone, date);

		// Standard/daylight offsets: whichever of January 1 and July 1 has the smaller UTC offset is
		// standard time (DST adds time), which holds in both hemispheres — Sydney Jan +11/Jul +10
		// -> standard +10; New York Jan -5/Jul -4 -> standard -5.
		const januaryOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 0, 1));
		const julyOffset = getTimezoneOffset(timezone, new Date(date.getFullYear(), 6, 1));
		const standardOffset = Math.min(januaryOffset, julyOffset);
		const daylightOffset = Math.max(januaryOffset, julyOffset);

		// isDST is moment's definition: the current offset exceeds the offset in force at the same
		// wall-clock day and time in January or in June of the same (zone-local) year. For regular
		// zones this equals "current > standard"; sampling the same day also keeps years where a zone
		// changed its base offset mid-year in line with moment (e.g. Africa/Sao_Tome 2018).
		const wall = new Date(date.getTime() + currentOffset);
		const isDST = currentOffset > offsetAtWallMonth(timezone, wall, 0) || currentOffset > offsetAtWallMonth(timezone, wall, 5);

		let formatter = timezone_abbreviation_cache.get(timezone);
		if (formatter === undefined) {
			formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				timeZoneName: 'short',
			});
			boundedSet(timezone_abbreviation_cache, timezone, formatter);
		}
		// Get timezone abbreviation
		const abbreviation = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value || timezone;

		return {
			timezone,
			offset: currentOffset,
			isDST,
			abbreviation,
			standardOffset,
			daylightOffset,
		};
	} catch (error) {
		throw new Error(`Failed to get timezone info for ${timezone}: ${error.message}`);
	}
}

/**
 * Offset of `timezone` at the wall-clock reading `wall` moved to `month0` of the same year
 * (day clamped to the month length, time of day kept) — moment's `clone().month(m)`.
 *
 * @param {string} timezone
 * @param {Date} wall - UTC-encoded wall clock
 * @param {number} month0
 * @returns {number}
 */
function offsetAtWallMonth(timezone, wall, month0) {
	const year = wall.getUTCFullYear();
	const sample = new Date(wall.getTime());
	sample.setUTCFullYear(year, month0, Math.min(wall.getUTCDate(), daysInMonth(year, month0)));
	return getTimezoneOffset(timezone, new Date(wallClockToInstant(timezone, sample.getTime())));
}

// detected_format values that denote absolute instants: never reinterpreted in the global zone.
const ABSOLUTE_FORMATS = new Set(['ISO8601', 'RFC2822', 'now', 'Xx', 'kkDate']);

/**
 * Enhanced timezone parsing with automatic DST detection
 *
 * @param {KkDate} kkDate - KkDate instance
 * @param {number} [wallHint=NaN] - the wall clock the input denoted (UTC-encoded ms) when the
 * parser knows it; otherwise it is read back from the system-local date.
 * @returns {Date} - Parsed date with timezone conversion
 */
function parseWithTimezone(kkDate, wallHint = Number.NaN) {
	// If this is a .tz() call, convert to target timezone
	if (kkDate.temp_config.timezone) {
		const targetTimezone = kkDate.temp_config.timezone;

		// Special handling for UTC - return original UTC time
		if (targetTimezone === 'UTC') {
			return kkDate.date;
		}

		// For .tz() calls, we don't change the date object
		// The timezone information is stored in temp_config.timezone
		// and the format function will handle the display conversion
		return kkDate.date;
	}

	// Constructor call - reinterpret input in global timezone if:
	// 1. Global timezone is set and different from system timezone
	// 2. Input is not ISO8601 UTC timestamp
	// 3. Global timezone will be used for formatting (not just UTC display)
	// 4. Input is not 'now' (current time should not be reinterpreted)
	const globalTimezone = global_config.timezone;

	if (globalTimezone && globalTimezone !== systemTimezone && !ABSOLUTE_FORMATS.has(kkDate.detected_format)) {
		// Reinterpret the input's wall clock in the global timezone. The offset is resolved at the
		// target instant itself (wallClockToInstant), not at the system-parsed instant, so readings
		// near a DST transition of either zone land on the right side of it.
		const wall = Number.isNaN(wallHint) ? toWallClock(systemTimezone, kkDate.date.getTime()) : wallHint;
		return new Date(wallClockToInstant(globalTimezone, wall));
	}

	return kkDate.date;
}

/**
 * Convert date to specific timezone
 *
 * @param {Date} date - Date to convert
 * @param {string} targetTimezone - Target timezone
 * @param {string} sourceTimezone - Source timezone (optional, defaults to user timezone)
 * @returns {Date} - Converted date
 */
function convertToTimezone(date, targetTimezone, sourceTimezone = global_config.userTimezone) {
	try {
		checkTimezone(targetTimezone);
		checkTimezone(sourceTimezone);

		const targetOffset = getTimezoneOffset(targetTimezone, date);
		const sourceOffset = getTimezoneOffset(sourceTimezone, date);

		const timezoneDiff = targetOffset - sourceOffset;
		return new Date(date.getTime() + timezoneDiff);
	} catch (error) {
		throw new Error(`Failed to convert timezone: ${error.message}`);
	}
}

/**
 * Get all available timezones (if supported by the environment)
 *
 * @returns {string[]} - Array of available timezone identifiers
 */
function getAvailableTimezones() {
	// Every IANA zone the engine supports (Node 18+, modern browsers). V8 omits the "UTC" alias
	// from the list, so it is added. Engines without Intl.supportedValuesOf (e.g. older Hermes)
	// fall back to the common-zone list below.
	if (typeof Intl.supportedValuesOf === 'function') {
		try {
			const zones = Intl.supportedValuesOf('timeZone');
			if (zones.length > 0) {
				return zones.includes('UTC') ? zones.slice() : ['UTC', ...zones];
			}
		} catch {
			// fall through to the static list
		}
	}
	try {
		return COMMON_TIMEZONES.filter((tz) => {
			try {
				checkTimezone(tz);
				return true;
			} catch {
				return false;
			}
		});
	} catch {
		return ['UTC']; // Fallback to UTC only
	}
}

/**
 * Check if a date is in DST for a given timezone
 *
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Date to check (defaults to current date)
 * @returns {boolean} - True if DST is active
 */
function isDST(timezone, date = new Date()) {
	try {
		const info = getTimezoneInfo(timezone, date);
		return info.isDST;
	} catch {
		return false;
	}
}

/**
 * Get timezone abbreviation
 *
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Date for abbreviation (defaults to current date)
 * @returns {string} - Timezone abbreviation
 */
function getTimezoneAbbreviation(timezone, date = new Date()) {
	try {
		const info = getTimezoneInfo(timezone, date);
		return info.abbreviation;
	} catch {
		return timezone;
	}
}

/**
 * Long localized timezone name (e.g. 'Eastern Standard Time') for the zzz
 * token. Falls back to the abbreviation on engines without timeZoneName
 * support (Hermes-style degrade, same pattern as getTimezoneAbbreviation).
 *
 * @param {string} timezone
 * @param {Date} date
 * @param {string} locale
 * @returns {string}
 */
function getTimezoneLongName(timezone, date = new Date(), locale = 'en') {
	try {
		checkTimezone(timezone);
		const cacheKey = `${locale}_${timezone}`;
		let formatter = timezone_long_name_cache.get(cacheKey);
		if (formatter === undefined) {
			formatter = new Intl.DateTimeFormat(locale, { timeZone: timezone, timeZoneName: 'long' });
			boundedSet(timezone_long_name_cache, cacheKey, formatter);
		}
		const parts = formatter.formatToParts(date);
		for (let i = 0; i < parts.length; i++) {
			if (parts[i].type === 'timeZoneName' && parts[i].value) {
				return parts[i].value;
			}
		}
		return getTimezoneAbbreviation(timezone, date);
	} catch {
		return getTimezoneAbbreviation(timezone, date);
	}
}

/**
 * absFloor function
 *
 * @param {number} number
 * @returns {number}
 */
function absFloor(number) {
	if (number < 0) {
		return Math.ceil(number) || 0;
	}
	return Math.floor(number);
}

/**
 * padZero
 *
 * @param {number} num
 * @returns {string}
 */
const padZero = (num) => String(num).padStart(2, '0');

/**
 * @description It divides the date string into parts and returns an object.
 * @param {string} time
 * @param {"years" | "months" | "weeks" | "days" | "hours" | "minutes" | "seconds"} type
 * @returns {{years: number, months: number, weeks: number, days: number, hours: number, minutes: number, seconds: number, milliseconds: number, $kk_date: {milliseconds: number}, asMilliseconds: function(): number, asSeconds: function(): number, asMinutes: function(): number, asHours: function(): number, asDays: function(): number, asWeeks: function(): number, asMonths: function(): number, asYears: function(): number}}
 * @example
 * // Example usage:
 * const result = duration(1234, 'minutes');
 * console.log(result);
 * // Output: { years: 0, months: 0, weeks: 0, days: 0, hours: 20, minutes: 34, seconds: 0, milliseconds: 0 }
 */
function duration(time, type) {
	if (!Number.isInteger(time)) {
		throw new Error('Invalid time');
	}
	const _milliseconds = time * timeInMilliseconds[type];

	const response = {
		years: 0,
		months: 0,
		weeks: 0,
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
		milliseconds: 0,
		$kk_date: { milliseconds: 0 },
		asMilliseconds: () => _milliseconds,
		asSeconds: () => _milliseconds / timeInMilliseconds.seconds,
		asMinutes: () => _milliseconds / timeInMilliseconds.minutes,
		asHours: () => _milliseconds / timeInMilliseconds.hours,
		asDays: () => _milliseconds / timeInMilliseconds.days,
		asWeeks: () => _milliseconds / timeInMilliseconds.weeks,
		asMonths: () => _milliseconds / timeInMilliseconds.months,
		asYears: () => _milliseconds / timeInMilliseconds.years,
	};

	if (!time || typeof time !== 'number' || time < 0) {
		throw new Error('Invalid time');
	}

	if (!timeInMilliseconds[type]) {
		throw new Error('Invalid type');
	}

	response.$kk_date.milliseconds = _milliseconds;
	let milliseconds = _milliseconds;
	response.years = Math.floor(milliseconds / timeInMilliseconds.years);
	milliseconds = milliseconds % timeInMilliseconds.years;
	response.months = Math.floor(milliseconds / timeInMilliseconds.months);
	milliseconds = milliseconds % timeInMilliseconds.months;
	response.weeks = Math.floor(milliseconds / timeInMilliseconds.weeks);
	milliseconds = milliseconds % timeInMilliseconds.weeks;
	response.days = Math.floor(milliseconds / timeInMilliseconds.days);
	milliseconds = milliseconds % timeInMilliseconds.days;
	response.hours = Math.floor(milliseconds / timeInMilliseconds.hours);
	milliseconds = milliseconds % timeInMilliseconds.hours;
	response.minutes = Math.floor(milliseconds / timeInMilliseconds.minutes);
	milliseconds = milliseconds % timeInMilliseconds.minutes;
	response.seconds = Math.floor(milliseconds / timeInMilliseconds.seconds);
	milliseconds = milliseconds % timeInMilliseconds.seconds;
	response.milliseconds = milliseconds;

	return response;
}

// Intl options per locale-aware name token. dd is a formatting-only token (never in
// format_types): the short weekday name, sliced to 2 chars by formatNameToken.
const name_token_options = {
	dddd: { weekday: 'long' },
	ddd: { weekday: 'short' },
	dd: { weekday: 'short' },
	MMMM: { month: 'long' },
	MMM: { month: 'short' },
};
const global_name_token_ids = { dddd: '1', ddd: '2', MMMM: '3', MMM: '4', dd: '5' };

/**
 * @description It formats the date with the locale and template.
 * @param {KkDate} orj_this
 * @param {string} template
 * @returns {{value: Intl.DateTimeFormat, id: string}}
 */
function dateTimeFormat(orj_this, template) {
	const options = name_token_options[template];
	if (options === undefined) {
		throw new Error('unkown template for dateTimeFormat !');
	}
	const tempLocale = orj_this.temp_config.locale;
	const timezone = orj_this.temp_config.timezone || global_config.timezone;
	if (timezone) {
		const locale = tempLocale || global_config.locale;
		const cache = cached_dateTimeFormat_with_locale[template];
		const key = `${locale}_${timezone}`;
		let entry = cache.get(key);
		if (entry === undefined) {
			entry = {
				value: new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone }),
				id: `${key}_${template}`,
			};
			boundedSet(cache, key, entry);
		}
		return entry;
	}

	if (tempLocale) {
		const temp = cached_dateTimeFormat.temp[template];
		let value = temp.get(tempLocale);
		if (value === undefined) {
			value = new Intl.DateTimeFormat(tempLocale, options);
			boundedSet(temp, tempLocale, value);
		}
		return { value, id: `${tempLocale}_0` };
	}
	// The id carries the global locale so memoized names never outlive a locale change.
	return { value: cached_dateTimeFormat[template], id: `${global_config.locale}_${global_name_token_ids[template]}` };
}

/**
 * date converter - OPTIMIZED VERSION
 *
 * @param {Date} date
 * @param {Array} to
 * @param {object} [options={pad: true, isUTC: false, detectedFormat: null}]
 * @returns {Object}
 */
function converter(date, to, options = { pad: true }) {
	const shouldPad = options.pad !== false;
	const isUTC = options.isUTC || false;
	const detectedFormat = options.detectedFormat || null;
	const orj_this = options.orj_this;

	// Determine timezone for formatting
	let targetTimezone = null;
	if (orj_this) {
		targetTimezone = orj_this.temp_config.timezone || global_config.timezone;
	}

	const timestamp = date.getTime();

	// Timezone-aware (Intl) path — taken only when a real zone conversion is needed: a non-UTC
	// target that differs from the machine zone, a UTC instant (isUTC/ISO8601) that must be
	// display-converted, or an 'Xx' timestamp (needs the '24'->'00' handling below). When the
	// target equals the system zone for a local wall-clock date, the native getHours()/getMonth()
	// accessors already yield identical output far more cheaply, so we fall through to the native
	// path — which skips the cache entirely (distinct-timestamp workloads never reuse it, and
	// repeated calls are already memoized upstream by formatter_cache).
	if (targetTimezone && targetTimezone !== 'UTC' && (targetTimezone !== systemTimezone || isUTC || detectedFormat === 'Xx')) {
		// Cache only this (expensive) Intl path.
		const cacheKey = `${timestamp}_${to.join(',')}_${shouldPad}_${isUTC}_${targetTimezone}_${detectedFormat || 'none'}`;
		const cachedResult = converter_results_cache.get(cacheKey);
		if (cachedResult !== undefined) {
			return cachedResult;
		}
		if (converter_results_cache.size > 10000) {
			converter_results_cache.clear();
		}

		// Use Intl.DateTimeFormat for timezone-aware formatting
		const result = {};
		const partsMap = {};

		let formatter = cached_converter_int.get(targetTimezone);
		if (formatter === undefined) {
			formatter = new Intl.DateTimeFormat('en-CA', {
				timeZone: targetTimezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false,
			});
			boundedSet(cached_converter_int, targetTimezone, formatter);
		}

		const parts = formatter.formatToParts(date);
		for (const part of parts) {
			partsMap[part.type] = part.value;
		}

		const len = to.length;
		for (let i = 0; i < len; i++) {
			const field = to[i];
			switch (field) {
				case 'year':
					result.year = partsMap.year;
					break;
				case 'month':
					result.month = shouldPad ? partsMap.month : parseInt(partsMap.month, 10);
					break;
				case 'day':
					result.day = shouldPad ? partsMap.day : parseInt(partsMap.day, 10);
					break;
				case 'hours':
					// Fix: Convert hour 24 to 00 (midnight)
					result.hours = partsMap.hour === '24' ? (shouldPad ? '00' : 0) : shouldPad ? partsMap.hour : parseInt(partsMap.hour, 10);
					break;
				case 'minutes':
					result.minutes = shouldPad ? partsMap.minute : parseInt(partsMap.minute, 10);
					break;
				case 'seconds':
					result.seconds = shouldPad ? partsMap.second : parseInt(partsMap.second, 10);
					break;
				case 'milliseconds':
					result.milliseconds = shouldPad
						? date.getMilliseconds() < 100
							? `0${date.getMilliseconds() < 10 ? `0${date.getMilliseconds()}` : date.getMilliseconds()}`
							: String(date.getMilliseconds())
						: date.getMilliseconds();
					break;
			}
		}
		converter_results_cache.set(cacheKey, result);
		return result;
	}

	// Native fast path — no cache: recompute is a handful of getters, cheaper than keying the cache.
	if (detectedFormat !== 'Xx' || !global_config.timezone || global_config.timezone === 'UTC') {
		const result = {};
		// Standard formatting - much faster
		const len = to.length;
		for (let i = 0; i < len; i++) {
			const field = to[i];
			switch (field) {
				case 'year':
					result.year = isUTC ? date.getUTCFullYear() : date.getFullYear();
					break;
				case 'month': {
					const month = (isUTC ? date.getUTCMonth() : date.getMonth()) + 1;
					result.month = shouldPad ? (month < 10 ? `0${month}` : String(month)) : month;
					break;
				}
				case 'day': {
					const day = isUTC ? date.getUTCDate() : date.getDate();
					result.day = shouldPad ? (day < 10 ? `0${day}` : String(day)) : day;
					break;
				}
				case 'hours': {
					const hours = isUTC ? date.getUTCHours() : date.getHours();
					result.hours = shouldPad ? (hours < 10 ? `0${hours}` : String(hours)) : hours;
					break;
				}
				case 'minutes': {
					const minutes = isUTC ? date.getUTCMinutes() : date.getMinutes();
					result.minutes = shouldPad ? (minutes < 10 ? `0${minutes}` : String(minutes)) : minutes;
					break;
				}
				case 'seconds': {
					const seconds = isUTC ? date.getUTCSeconds() : date.getSeconds();
					result.seconds = shouldPad ? (seconds < 10 ? `0${seconds}` : String(seconds)) : seconds;
					break;
				}
				case 'milliseconds': {
					const ms = isUTC ? date.getUTCMilliseconds() : date.getMilliseconds();
					result.milliseconds = shouldPad ? (ms < 100 ? (ms < 10 ? `00${ms}` : `0${ms}`) : String(ms)) : ms;
					break;
				}
			}
		}
		return result;
	}

	// Timezone-aware fallback ('Xx' with a non-UTC global tz and an explicit UTC target).
	// Cached — formatToParts is expensive.
	const result = {};
	const cacheKey = `${timestamp}_${to.join(',')}_${shouldPad}_${isUTC}_${targetTimezone || 'none'}_${detectedFormat || 'none'}`;
	const cachedFallback = converter_results_cache.get(cacheKey);
	if (cachedFallback !== undefined) {
		return cachedFallback;
	}
	if (converter_results_cache.size > 10000) {
		converter_results_cache.clear();
	}
	const useTimezone = targetTimezone || global_config.timezone;

	// Cache the DateTimeFormat instance for performance
	let formatter_value = timezone_formatter_cache.get(useTimezone);
	if (formatter_value === undefined) {
		formatter_value = new Intl.DateTimeFormat('en-CA', {
			timeZone: useTimezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		});
		boundedSet(timezone_formatter_cache, useTimezone, formatter_value);
	}

	// Format the specific date
	const parts = formatter_value.formatToParts(date);
	const in_result = {};
	const partsLen = parts.length;

	// Optimized parts mapping
	for (let i = 0; i < partsLen; i++) {
		const part = parts[i];
		in_result[part.type] = part.value;
	}

	// Process requested fields
	const len = to.length;
	for (let i = 0; i < len; i++) {
		const field = to[i];
		switch (field) {
			case 'year':
				result.year = in_result.year;
				break;
			case 'month':
				result.month = shouldPad ? in_result.month : parseInt(in_result.month, 10);
				break;
			case 'day':
				result.day = shouldPad ? in_result.day : parseInt(in_result.day, 10);
				break;
			case 'hours':
				// h24-cycle engines render midnight as "24" (same calendar day): hour 0, as above.
				result.hours = in_result.hour === '24' ? (shouldPad ? '00' : 0) : shouldPad ? in_result.hour : parseInt(in_result.hour, 10);
				break;
			case 'minutes':
				result.minutes = shouldPad ? in_result.minute : parseInt(in_result.minute, 10);
				break;
			case 'seconds':
				result.seconds = shouldPad ? in_result.second : parseInt(in_result.second, 10);
				break;
			case 'milliseconds': {
				const ms = date.getMilliseconds();
				result.milliseconds = shouldPad ? (ms < 100 ? (ms < 10 ? `00${ms}` : `0${ms}`) : String(ms)) : ms;
				break;
			}
		}
	}

	converter_results_cache.set(cacheKey, result);
	return result;
}

// Longest-first alternation within every shared-prefix family so multi-char
// tokens win over their prefixes (MMMM > MMM > MM > Mo > M, DDDD > DDDo >
// DDD > Do > DD > D, ...). The leading group captures [bracketed] literals,
// dayjs/moment style. S{1,9} greedily matches fractional-second runs.
// Single g, G, Y, o, q, T are deliberately not tokens and stay literal.
const format_token_regex =
	/(\[[^\]]*\])|YYYY|YY|MMMM|MMM|MM|Mo|M|Qo|Q|DDDD|DDDo|DDD|Do|DD|D|dddd|ddd|dd|do|d|E|e|wo|ww|w|Wo|WW|W|gggg|gg|GGGG|GG|HH|H|hh|h|kk|k|mm|m|ss|s|S{1,9}|A|a|X|x|zzz|zz|z|ZZ|Z/g;

const ymd_fields = ['year', 'month', 'day'];
const derived_dow = format_derived_flags.YMD | format_derived_flags.DOW;
const derived_doy = format_derived_flags.YMD | format_derived_flags.DOY;
const derived_iso_week = format_derived_flags.YMD | format_derived_flags.ISO_WEEK;
const derived_locale_week = format_derived_flags.YMD | format_derived_flags.LOCALE_WEEK;

// Token compile table: part kind + the converter fields it needs + the
// derived-value bits the formatter core must precompute. name: locale-aware
// name token (the NAME part keeps the token itself in v); hour12/meridiem
// feed has12h/appendMeridiem. S{1,9} runs other than SSS are handled in
// compileFormat (MS_FRACTION keeps the run in v).
const token_parts = {
	YYYY: { t: format_part_types.YEAR, fields: ['year'] },
	YY: { t: format_part_types.YEAR2, fields: ['year'] },
	MMMM: { t: format_part_types.NAME, name: true },
	MMM: { t: format_part_types.NAME, name: true },
	MM: { t: format_part_types.MONTH, fields: ['month'] },
	Mo: { t: format_part_types.MONTH_ORDINAL, fields: ['month'] },
	M: { t: format_part_types.MONTH_UNPADDED, fields: ['month'] },
	Qo: { t: format_part_types.QUARTER_ORDINAL, fields: ['month'] },
	Q: { t: format_part_types.QUARTER, fields: ['month'] },
	DDDD: { t: format_part_types.DAY_OF_YEAR_PADDED, fields: ymd_fields, derived: derived_doy },
	DDDo: { t: format_part_types.DAY_OF_YEAR_ORDINAL, fields: ymd_fields, derived: derived_doy },
	DDD: { t: format_part_types.DAY_OF_YEAR, fields: ymd_fields, derived: derived_doy },
	Do: { t: format_part_types.DAY_ORDINAL, fields: ['day'] },
	DD: { t: format_part_types.DAY, fields: ['day'] },
	D: { t: format_part_types.DAY_UNPADDED, fields: ['day'] },
	dddd: { t: format_part_types.NAME, name: true },
	ddd: { t: format_part_types.NAME, name: true },
	dd: { t: format_part_types.NAME, name: true },
	do: { t: format_part_types.WEEKDAY_ORDINAL, fields: ymd_fields, derived: derived_dow },
	d: { t: format_part_types.WEEKDAY, fields: ymd_fields, derived: derived_dow },
	E: { t: format_part_types.WEEKDAY_ISO, fields: ymd_fields, derived: derived_dow },
	e: { t: format_part_types.WEEKDAY_LOCALE, fields: ymd_fields, derived: derived_dow },
	wo: { t: format_part_types.WEEK_ORDINAL, fields: ymd_fields, derived: derived_locale_week },
	ww: { t: format_part_types.WEEK_PADDED, fields: ymd_fields, derived: derived_locale_week },
	w: { t: format_part_types.WEEK, fields: ymd_fields, derived: derived_locale_week },
	gggg: { t: format_part_types.WEEK_YEAR, fields: ymd_fields, derived: derived_locale_week },
	gg: { t: format_part_types.WEEK_YEAR2, fields: ymd_fields, derived: derived_locale_week },
	Wo: { t: format_part_types.ISO_WEEK_ORDINAL, fields: ymd_fields, derived: derived_iso_week },
	WW: { t: format_part_types.ISO_WEEK_PADDED, fields: ymd_fields, derived: derived_iso_week },
	W: { t: format_part_types.ISO_WEEK, fields: ymd_fields, derived: derived_iso_week },
	GGGG: { t: format_part_types.ISO_WEEK_YEAR, fields: ymd_fields, derived: derived_iso_week },
	GG: { t: format_part_types.ISO_WEEK_YEAR2, fields: ymd_fields, derived: derived_iso_week },
	HH: { t: format_part_types.HOURS, fields: ['hours'] },
	H: { t: format_part_types.HOURS_UNPADDED, fields: ['hours'] },
	hh: { t: format_part_types.HOUR12, fields: ['hours'], hour12: true },
	h: { t: format_part_types.HOUR12_UNPADDED, fields: ['hours'], hour12: true },
	kk: { t: format_part_types.HOUR24_PADDED, fields: ['hours'] },
	k: { t: format_part_types.HOUR24, fields: ['hours'] },
	mm: { t: format_part_types.MINUTES, fields: ['minutes'] },
	m: { t: format_part_types.MINUTES_UNPADDED, fields: ['minutes'] },
	ss: { t: format_part_types.SECONDS, fields: ['seconds'] },
	s: { t: format_part_types.SECONDS_UNPADDED, fields: ['seconds'] },
	SSS: { t: format_part_types.MILLISECONDS, fields: ['milliseconds'] },
	A: { t: format_part_types.MERIDIEM_UPPER, fields: ['hours'], meridiem: true },
	a: { t: format_part_types.MERIDIEM_LOWER, fields: ['hours'], meridiem: true },
	X: { t: format_part_types.UNIX_SECONDS },
	x: { t: format_part_types.UNIX_MS },
	zzz: { t: format_part_types.TZ_LONG },
	zz: { t: format_part_types.TZ_ABBR },
	z: { t: format_part_types.TZ_ABBR },
	ZZ: { t: format_part_types.OFFSET_BASIC, derived: format_derived_flags.OFFSET },
	Z: { t: format_part_types.OFFSET_COLON, derived: format_derived_flags.OFFSET },
};

function pushLiteral(parts, text) {
	if (text === '') {
		return;
	}
	const last = parts.length > 0 ? parts[parts.length - 1] : null;
	if (last && last.t === format_part_types.LITERAL) {
		last.v += text;
	} else {
		parts.push({ t: format_part_types.LITERAL, v: text });
	}
}

function addField(fields, field) {
	if (fields.indexOf(field) === -1) {
		fields.push(field);
	}
}

/**
 * Compiles a format template into parts consumable by the formatter core.
 * Supports the full moment/dayjs display-token vocabulary (except era tokens
 * and the localized LT/L/LL macros): year (YYYY YY), month (MMMM MMM MM Mo M),
 * quarter (Q Qo), day (DD Do D), day of year (DDDD DDDo DDD), weekday
 * (dddd ddd dd do d e E), week + week-year (ww wo w gggg gg), ISO week +
 * week-year (WW Wo W GGGG GG), hour (HH H hh h kk k), minute (mm m),
 * second (ss s), fractional seconds (S..SSSSSSSSS), meridiem (A a),
 * timezone (Z ZZ z zz zzz) and unix (X x). [Bracketed] text is emitted
 * literally; any other character passes through as-is. When hh/h is used
 * without an explicit A/a, ' AM'/' PM' is appended to the end of the output
 * (legacy hh:mm behavior).
 *
 * @param {string} template
 * @returns {{parts: Array<{t: number, v: string}>, fields: string[], has12h: boolean, appendMeridiem: boolean, derived: number}}
 */
function compileFormat(template) {
	if (typeof template !== 'string') {
		throw new Error('template is not right');
	}
	const parts = [];
	const fields = [];
	let tokenCount = 0;
	let usedHour12 = false;
	let explicitMeridiem = false;
	let derived = 0;
	let lastIndex = 0;
	format_token_regex.lastIndex = 0;
	let match = format_token_regex.exec(template);
	while (match !== null) {
		if (match.index > lastIndex) {
			pushLiteral(parts, template.slice(lastIndex, match.index));
		}
		const token = match[0];
		if (match[1] !== undefined) {
			pushLiteral(parts, token.slice(1, -1));
		} else {
			tokenCount++;
			const token_part = token_parts[token];
			if (token_part !== undefined) {
				parts.push({ t: token_part.t, v: token_part.name === true ? token : '' });
				const token_fields = token_part.fields;
				if (token_fields !== undefined) {
					for (let i = 0; i < token_fields.length; i++) {
						addField(fields, token_fields[i]);
					}
				}
				if (token_part.hour12 === true) {
					usedHour12 = true;
				}
				if (token_part.meridiem === true) {
					explicitMeridiem = true;
				}
				if (token_part.derived !== undefined) {
					derived |= token_part.derived;
				}
			} else {
				// Only S{1,9} runs of length 1, 2, 4..9 reach here (SSS is in the map).
				parts.push({ t: format_part_types.MS_FRACTION, v: token });
				addField(fields, 'milliseconds');
			}
		}
		lastIndex = format_token_regex.lastIndex;
		match = format_token_regex.exec(template);
	}
	if (lastIndex < template.length) {
		pushLiteral(parts, template.slice(lastIndex));
	}
	if (tokenCount === 0) {
		throw new Error('template is not right');
	}
	return Object.freeze({
		parts,
		fields,
		has12h: usedHour12 || explicitMeridiem,
		appendMeridiem: usedHour12 && !explicitMeridiem,
		derived,
	});
}

/**
 * Returns the cached compiled template, compiling it on first use.
 *
 * @param {string} template
 * @returns {{parts: Array<{t: number, v: string}>, fields: string[], has12h: boolean, appendMeridiem: boolean, derived: number}}
 */
function getCompiledTemplate(template) {
	let compiled = compiled_templates.get(template);
	if (compiled === undefined) {
		compiled = compileFormat(template);
		if (compiled_templates.size > 1000) {
			compiled_templates.clear();
		}
		compiled_templates.set(template, compiled);
	}
	return compiled;
}

/*
 * ---------------------------------------------------------------------------
 * Template validators (static isValid hot path).
 *
 * Every validator replicates its legacy regex in `constants.format_types_regex`
 * bit-for-bit when `is_strict` is false — including the deliberate quirks
 * (hour 20-29 day-overflow support, `HH:mm` accepting an optional `:ss` tail,
 * the empty-year-alternative that also matches 2-digit years). They are plain
 * charCode/integer checks so they beat the multi-alternation regexes without
 * allocating.
 *
 * `is_strict` layers wall-clock semantics on top of the shape check (moment
 * strict parity): 4-digit years only (1700-2199), real calendar days with leap
 * years, hours 00-23 plus exactly `24:00[:00[.000]]`, and no `:ss` tail on
 * `HH:mm`. Strict always accepts a subset of the default mode.
 * ---------------------------------------------------------------------------
 */

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Real-calendar check for an already range-checked date (month 1-12, day 1-31).
 *
 * @param {number} year
 * @param {number} month - 1-based month
 * @param {number} day
 * @returns {boolean}
 */
function isRealDate(year, month, day) {
	if (day <= DAYS_IN_MONTH[month - 1]) {
		return true;
	}
	return month === 2 && day === 29 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

// Two ASCII digits at offset i as an int, or -1 when either char is not a digit.
function num2(s, i) {
	// >>> 0 folds the two range checks per digit into one unsigned compare. Callers always
	// length-check first, so charCodeAt never returns NaN here.
	const a = (s.charCodeAt(i) - 48) >>> 0;
	const b = (s.charCodeAt(i + 1) - 48) >>> 0;
	if (a > 9 || b > 9) {
		return -1;
	}
	return a * 10 + b;
}

// Four ASCII digits at offset i as an int, or -1.
function num4(s, i) {
	const a = (s.charCodeAt(i) - 48) >>> 0;
	const b = (s.charCodeAt(i + 1) - 48) >>> 0;
	const c = (s.charCodeAt(i + 2) - 48) >>> 0;
	const d = (s.charCodeAt(i + 3) - 48) >>> 0;
	if (a > 9 || b > 9 || c > 9 || d > 9) {
		return -1;
	}
	return a * 1000 + b * 100 + c * 10 + d;
}

// regex.test() coerces its argument with ToString; validators must match that.
function asString(input) {
	return typeof input === 'string' ? input : String(input);
}

/**
 * Hour policy shared by all time validators. `hourMax` mirrors the legacy
 * regex of the template (29 for the `([01]\d|2[0-9])` day-overflow templates,
 * 23 for the compact/ISO ones). Strict additionally enforces wall-clock hours,
 * allowing hour 24 only when every finer field is absent (-1) or zero.
 */
function checkHour(hour, minute, second, ms, is_strict, hourMax) {
	if (hour < 0 || hour > hourMax) {
		return false;
	}
	if (is_strict && hour > 23) {
		return hour === 24 && minute <= 0 && second <= 0 && ms <= 0;
	}
	return true;
}

// "YYYY(sep)MM(sep)DD" occupying s[0..9] (4-digit year 1700-2199).
function ymd4At(s, sep, is_strict) {
	if (s.charCodeAt(4) !== sep || s.charCodeAt(7) !== sep) {
		return false;
	}
	const y = num4(s, 0);
	if (y < 1700 || y > 2199) {
		return false;
	}
	const m = num2(s, 5);
	const d = num2(s, 8);
	if (m < 1 || m > 12 || d < 1 || d > 31) {
		return false;
	}
	return !is_strict || isRealDate(y, m, d);
}

// Legacy 2-digit-year "YY(sep)MM(sep)DD" occupying s[0..7] (default mode only).
function ymd2At(s, sep) {
	if (s.charCodeAt(2) !== sep || s.charCodeAt(5) !== sep) {
		return false;
	}
	if (num2(s, 0) < 0) {
		return false;
	}
	const m = num2(s, 3);
	const d = num2(s, 6);
	return m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

// "DD(sep)MM(sep)YYYY" occupying s[0..9].
function dmy4At(s, sep, is_strict) {
	if (s.charCodeAt(2) !== sep || s.charCodeAt(5) !== sep) {
		return false;
	}
	const d = num2(s, 0);
	const m = num2(s, 3);
	const y = num4(s, 6);
	if (y < 1700 || y > 2199) {
		return false;
	}
	if (m < 1 || m > 12 || d < 1 || d > 31) {
		return false;
	}
	return !is_strict || isRealDate(y, m, d);
}

// Legacy 2-digit-year "DD(sep)MM(sep)YY" occupying s[0..7] (default mode only).
function dmy2At(s, sep) {
	if (s.charCodeAt(2) !== sep || s.charCodeAt(5) !== sep) {
		return false;
	}
	const d = num2(s, 0);
	const m = num2(s, 3);
	if (num2(s, 6) < 0) {
		return false;
	}
	return m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

// "HH:mm:ss" at offset i, optionally followed by ".SSS".
function hmsAt(s, i, is_strict, hourMax, hasMs) {
	if (s.charCodeAt(i + 2) !== 58 || s.charCodeAt(i + 5) !== 58) {
		return false;
	}
	const h = num2(s, i);
	const mi = num2(s, i + 3);
	const se = num2(s, i + 6);
	if (mi < 0 || mi > 59 || se < 0 || se > 59) {
		return false;
	}
	let ms = -1;
	if (hasMs) {
		if (s.charCodeAt(i + 8) !== 46) {
			return false;
		}
		const hiMs = num2(s, i + 9);
		const loMs = s.charCodeAt(i + 11) - 48;
		if (hiMs < 0 || loMs < 0 || loMs > 9) {
			return false;
		}
		ms = hiMs * 10 + loMs;
	}
	return checkHour(h, mi, se, ms, is_strict, hourMax);
}

// "HH:mm" at offset i.
function hmAt(s, i, is_strict, hourMax) {
	if (s.charCodeAt(i + 2) !== 58) {
		return false;
	}
	const h = num2(s, i);
	const mi = num2(s, i + 3);
	if (mi < 0 || mi > 59) {
		return false;
	}
	return checkHour(h, mi, -1, -1, is_strict, hourMax);
}

const format_validators = new Map();
{
	const DASH = 45;
	const DOT = 46;
	const SLASH = 47;
	const SPACE = 32;
	const COLON = 58;
	const UPPER_T = 84;

	const dateYmd = (sep) => (input, is_strict) => {
		const s = asString(input);
		if (s.length === 10) {
			return ymd4At(s, sep, is_strict);
		}
		return s.length === 8 && !is_strict && ymd2At(s, sep);
	};
	const dateDmy = (sep) => (input, is_strict) => {
		const s = asString(input);
		if (s.length === 10) {
			return dmy4At(s, sep, is_strict);
		}
		return s.length === 8 && !is_strict && dmy2At(s, sep);
	};
	// Rare legacy shape: 2-digit year datetime ("YY?MM?DD HH:mm[:ss]" / "DD?MM?YY ..."), kept out
	// of the hot validators so their primary path stays straight-line. Default mode only.
	const shortYearDateTime = (s, sep, dayFirst, withSeconds) => {
		if (s.charCodeAt(8) !== SPACE || s.charCodeAt(2) !== sep || s.charCodeAt(5) !== sep) {
			return false;
		}
		const y = num2(s, dayFirst ? 6 : 0);
		const m = num2(s, 3);
		const d = num2(s, dayFirst ? 0 : 6);
		if (y < 0 || m < 1 || m > 12 || d < 1 || d > 31 || s.charCodeAt(11) !== COLON) {
			return false;
		}
		const h = num2(s, 9);
		const mi = num2(s, 12);
		if (h < 0 || h > 29 || mi < 0 || mi > 59) {
			return false;
		}
		if (!withSeconds) {
			return true;
		}
		if (s.charCodeAt(14) !== COLON) {
			return false;
		}
		const se = num2(s, 15);
		return se >= 0 && se <= 59;
	};

	// The four space-separated datetime families are the longest hot inputs; each gets its own
	// straight-line literal (single length check, unconditional field reads, one range gate) —
	// that structure is what keeps them ahead of the legacy regexes.
	const dateTimeYmdSec = (sep) => (input, is_strict) => {
		const s = asString(input);
		if (s.length !== 19) {
			return s.length === 17 && !is_strict && shortYearDateTime(s, sep, false, true);
		}
		if (
			s.charCodeAt(4) !== sep ||
			s.charCodeAt(7) !== sep ||
			s.charCodeAt(10) !== SPACE ||
			s.charCodeAt(13) !== COLON ||
			s.charCodeAt(16) !== COLON
		) {
			return false;
		}
		const y = num4(s, 0);
		const m = num2(s, 5);
		const d = num2(s, 8);
		const h = num2(s, 11);
		const mi = num2(s, 14);
		const se = num2(s, 17);
		if (y < 1700 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 29 || mi < 0 || mi > 59 || se < 0 || se > 59) {
			return false;
		}
		if (is_strict) {
			if (h > 23 && !(h === 24 && mi === 0 && se === 0)) {
				return false;
			}
			return isRealDate(y, m, d);
		}
		return true;
	};
	const dateTimeYmdMin = (sep) => (input, is_strict) => {
		const s = asString(input);
		if (s.length !== 16) {
			return s.length === 14 && !is_strict && shortYearDateTime(s, sep, false, false);
		}
		if (s.charCodeAt(4) !== sep || s.charCodeAt(7) !== sep || s.charCodeAt(10) !== SPACE || s.charCodeAt(13) !== COLON) {
			return false;
		}
		const y = num4(s, 0);
		const m = num2(s, 5);
		const d = num2(s, 8);
		const h = num2(s, 11);
		const mi = num2(s, 14);
		if (y < 1700 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 29 || mi < 0 || mi > 59) {
			return false;
		}
		if (is_strict) {
			if (h > 23 && !(h === 24 && mi === 0)) {
				return false;
			}
			return isRealDate(y, m, d);
		}
		return true;
	};
	const dateTimeDmySec = (sep) => (input, is_strict) => {
		const s = asString(input);
		if (s.length !== 19) {
			return s.length === 17 && !is_strict && shortYearDateTime(s, sep, true, true);
		}
		if (
			s.charCodeAt(2) !== sep ||
			s.charCodeAt(5) !== sep ||
			s.charCodeAt(10) !== SPACE ||
			s.charCodeAt(13) !== COLON ||
			s.charCodeAt(16) !== COLON
		) {
			return false;
		}
		const d = num2(s, 0);
		const m = num2(s, 3);
		const y = num4(s, 6);
		const h = num2(s, 11);
		const mi = num2(s, 14);
		const se = num2(s, 17);
		if (y < 1700 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 29 || mi < 0 || mi > 59 || se < 0 || se > 59) {
			return false;
		}
		if (is_strict) {
			if (h > 23 && !(h === 24 && mi === 0 && se === 0)) {
				return false;
			}
			return isRealDate(y, m, d);
		}
		return true;
	};
	const dateTimeDmyMin = (sep) => (input, is_strict) => {
		const s = asString(input);
		if (s.length !== 16) {
			return s.length === 14 && !is_strict && shortYearDateTime(s, sep, true, false);
		}
		if (s.charCodeAt(2) !== sep || s.charCodeAt(5) !== sep || s.charCodeAt(10) !== SPACE || s.charCodeAt(13) !== COLON) {
			return false;
		}
		const d = num2(s, 0);
		const m = num2(s, 3);
		const y = num4(s, 6);
		const h = num2(s, 11);
		const mi = num2(s, 14);
		if (y < 1700 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 29 || mi < 0 || mi > 59) {
			return false;
		}
		if (is_strict) {
			if (h > 23 && !(h === 24 && mi === 0)) {
				return false;
			}
			return isRealDate(y, m, d);
		}
		return true;
	};

	format_validators.set('YYYY-MM-DD', dateYmd(DASH));
	format_validators.set('YYYY.MM.DD', dateYmd(DOT));
	format_validators.set('DD.MM.YYYY', dateDmy(DOT));
	format_validators.set('DD-MM-YYYY', dateDmy(DASH));
	format_validators.set('YYYY-MM-DD HH:mm:ss', dateTimeYmdSec(DASH));
	format_validators.set('YYYY.MM.DD HH:mm:ss', dateTimeYmdSec(DOT));
	format_validators.set('YYYY-MM-DD HH:mm', dateTimeYmdMin(DASH));
	format_validators.set('YYYY.MM.DD HH:mm', dateTimeYmdMin(DOT));
	format_validators.set('DD.MM.YYYY HH:mm:ss', dateTimeDmySec(DOT));
	format_validators.set('DD-MM-YYYY HH:mm:ss', dateTimeDmySec(DASH));
	format_validators.set('DD.MM.YYYY HH:mm', dateTimeDmyMin(DOT));
	format_validators.set('DD-MM-YYYY HH:mm', dateTimeDmyMin(DASH));
	format_validators.set('MM/DD/YYYY', (input, is_strict) => {
		const s = asString(input);
		if (s.length !== 10 || s.charCodeAt(2) !== SLASH || s.charCodeAt(5) !== SLASH) {
			return false;
		}
		const m = num2(s, 0);
		const d = num2(s, 3);
		const y = num4(s, 6);
		if (y < 1700 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31) {
			return false;
		}
		return !is_strict || isRealDate(y, m, d);
	});
	format_validators.set('DD/MM/YYYY', (input, is_strict) => {
		const s = asString(input);
		return s.length === 10 && dmy4At(s, SLASH, is_strict);
	});
	format_validators.set('YYYY-DD-MM', (input, is_strict) => {
		const s = asString(input);
		if (s.length !== 10 || s.charCodeAt(4) !== DASH || s.charCodeAt(7) !== DASH) {
			return false;
		}
		const y = num4(s, 0);
		const d = num2(s, 5);
		const m = num2(s, 8);
		if (y < 1700 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31) {
			return false;
		}
		return !is_strict || isRealDate(y, m, d);
	});
	format_validators.set('YYYY-MM', (input) => {
		const s = asString(input);
		if (s.length !== 7 || s.charCodeAt(4) !== DASH) {
			return false;
		}
		const y = num4(s, 0);
		const m = num2(s, 5);
		return y >= 1700 && y <= 2199 && m >= 1 && m <= 12;
	});
	format_validators.set('YYYYMMDD', (input, is_strict) => {
		const s = asString(input);
		if (s.length === 8) {
			const y = num4(s, 0);
			const m = num2(s, 4);
			const d = num2(s, 6);
			if (y < 1700 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31) {
				return false;
			}
			return !is_strict || isRealDate(y, m, d);
		}
		if (s.length === 6 && !is_strict) {
			if (num2(s, 0) < 0) {
				return false;
			}
			const m = num2(s, 2);
			const d = num2(s, 4);
			return m >= 1 && m <= 12 && d >= 1 && d <= 31;
		}
		return false;
	});
	format_validators.set('YYYYMMDDHHmmss', (input, is_strict) => {
		const s = asString(input);
		let timeAt;
		let y;
		let m;
		let d;
		if (s.length === 14) {
			y = num4(s, 0);
			m = num2(s, 4);
			d = num2(s, 6);
			if (y < 1700 || y > 2199) {
				return false;
			}
			timeAt = 8;
		} else if (s.length === 12 && !is_strict) {
			y = num2(s, 0);
			m = num2(s, 2);
			d = num2(s, 4);
			if (y < 0) {
				return false;
			}
			timeAt = 6;
		} else {
			return false;
		}
		if (m < 1 || m > 12 || d < 1 || d > 31) {
			return false;
		}
		const h = num2(s, timeAt);
		const mi = num2(s, timeAt + 2);
		const se = num2(s, timeAt + 4);
		if (h < 0 || h > 23 || mi < 0 || mi > 59 || se < 0 || se > 59) {
			return false;
		}
		return !is_strict || isRealDate(y, m, d);
	});
	format_validators.set('YYYY-MM-DDTHH:mm:ss', (input, is_strict) => {
		const s = asString(input);
		if (
			s.length !== 19 ||
			s.charCodeAt(10) !== UPPER_T ||
			s.charCodeAt(4) !== DASH ||
			s.charCodeAt(7) !== DASH ||
			s.charCodeAt(13) !== COLON ||
			s.charCodeAt(16) !== COLON
		) {
			return false;
		}
		const y = num4(s, 0);
		const m = num2(s, 5);
		const d = num2(s, 8);
		const h = num2(s, 11);
		const mi = num2(s, 14);
		const se = num2(s, 17);
		// The legacy T-format regex caps hours at 23 (no day-overflow support here).
		if (y < 1700 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23 || mi < 0 || mi > 59 || se < 0 || se > 59) {
			return false;
		}
		return !is_strict || isRealDate(y, m, d);
	});
	format_validators.set('HH:mm:ss', (input, is_strict) => {
		const s = asString(input);
		return s.length === 8 && hmsAt(s, 0, is_strict, 29, false);
	});
	format_validators.set('HH:mm:ss.SSS', (input, is_strict) => {
		const s = asString(input);
		return s.length === 12 && hmsAt(s, 0, is_strict, 29, true);
	});
	format_validators.set('HH:mm', (input, is_strict) => {
		const s = asString(input);
		if (s.length === 5) {
			return hmAt(s, 0, is_strict, 29);
		}
		// Legacy quirk: the HH:mm regex tolerates an optional :ss tail (default mode only).
		return s.length === 8 && !is_strict && hmsAt(s, 0, false, 29, false);
	});
	format_validators.set('HH', (input, is_strict) => {
		const s = asString(input);
		if (s.length !== 2) {
			return false;
		}
		const h = num2(s, 0);
		// strict: wall-clock hours plus a bare 24 (= 24:00, every finer field absent) like moment
		return h >= 0 && h <= (is_strict ? 24 : 29);
	});
	format_validators.set('mm:ss', (input) => {
		const s = asString(input);
		if (s.length !== 5 || s.charCodeAt(2) !== COLON) {
			return false;
		}
		const mi = num2(s, 0);
		const se = num2(s, 3);
		return mi >= 0 && mi <= 59 && se >= 0 && se <= 59;
	});
	format_validators.set('mm', (input) => {
		const s = asString(input);
		if (s.length !== 2) {
			return false;
		}
		const v = num2(s, 0);
		return v >= 0 && v <= 59;
	});
	format_validators.set('ss', format_validators.get('mm'));
	format_validators.set('YYYY', (input) => {
		const s = asString(input);
		if (s.length !== 4) {
			return false;
		}
		const y = num4(s, 0);
		return y >= 1700 && y <= 2199;
	});
	format_validators.set('MM', (input) => {
		const s = asString(input);
		if (s.length !== 2) {
			return false;
		}
		const m = num2(s, 0);
		return m >= 1 && m <= 12;
	});
	format_validators.set('DD', (input) => {
		const s = asString(input);
		if (s.length !== 2) {
			return false;
		}
		const d = num2(s, 0);
		return d >= 1 && d <= 31;
	});
}

/*
 * ---------------------------------------------------------------------------
 * Dynamic template validation: compiles any display-token template (the same
 * moment/dayjs vocabulary the formatter accepts, see format_token_regex) into
 * an anchored RegExp plus semantic slots for the post-match checks. This is
 * what lets the static isValid accept arbitrary templates beyond the
 * predefined format_types_regex table. Templates with no recognizable token
 * keep throwing 'Invalid template !'.
 * ---------------------------------------------------------------------------
 */

const ORDINAL_SUFFIX_ALTS = 'st|nd|rd|th|\\.|er|ème|te|º|ª|-й|वां|日|일|z|день';
const ORDINAL_SUFFIX_SRC = `(?:${ORDINAL_SUFFIX_ALTS})?`;
// Captures the (possibly empty) suffix so strict mode can require it on Do, like moment.
const ORDINAL_SUFFIX_CAPTURE = `(${ORDINAL_SUFFIX_ALTS})?`;
const NAME_TOKEN_SRC = '([\\p{L}\\p{M}.]+)';

// token -> { src: pattern, kind: semantic slot ('' = shape-only), ordinal: src carries a second
// group capturing the ordinal suffix, zeroless: strict mode rejects a zero-padded two-digit value
// (moment 2.30 strict: match1to2NoLeadingZero / match1to2HasZero) }
const validator_token_map = {
	YYYY: { src: '(\\d{4})', kind: 'year' },
	YY: { src: '(\\d{2})', kind: '' },
	MMMM: { src: NAME_TOKEN_SRC, kind: 'monthName' },
	MMM: { src: NAME_TOKEN_SRC, kind: 'monthName' },
	MM: { src: '(0[1-9]|1[0-2])', kind: 'month' },
	Mo: { src: `(0?[1-9]|1[0-2])${ORDINAL_SUFFIX_SRC}`, kind: 'month' },
	M: { src: '(0?[1-9]|1[0-2])', kind: 'month', zeroless: true },
	Qo: { src: `([1-4])${ORDINAL_SUFFIX_SRC}`, kind: '' },
	Q: { src: '([1-4])', kind: '' },
	DDDD: { src: '(\\d{3})', kind: 'doy' },
	DDDo: { src: `([1-9]\\d{0,2})${ORDINAL_SUFFIX_SRC}`, kind: 'doy' },
	DDD: { src: '([1-9]\\d{0,2})', kind: 'doy' },
	Do: { src: `(0?[1-9]|[12]\\d|3[01])${ORDINAL_SUFFIX_CAPTURE}`, kind: 'day', ordinal: true, zeroless: true },
	DD: { src: '(0[1-9]|[12]\\d|3[01])', kind: 'day' },
	D: { src: '(0?[1-9]|[12]\\d|3[01])', kind: 'day', zeroless: true },
	dddd: { src: NAME_TOKEN_SRC, kind: 'weekdayName' },
	ddd: { src: NAME_TOKEN_SRC, kind: 'weekdayName' },
	dd: { src: NAME_TOKEN_SRC, kind: 'weekdayName' },
	do: { src: `([0-6])${ORDINAL_SUFFIX_SRC}`, kind: '' },
	d: { src: '([0-6])', kind: '' },
	E: { src: '([1-7])', kind: '' },
	e: { src: '([0-6])', kind: '' },
	wo: { src: `([1-9]|[1-4]\\d|5[0-3])${ORDINAL_SUFFIX_SRC}`, kind: 'week' },
	ww: { src: '(0[1-9]|[1-4]\\d|5[0-3])', kind: 'week' },
	w: { src: '([1-9]|[1-4]\\d|5[0-3])', kind: 'week' },
	Wo: { src: `([1-9]|[1-4]\\d|5[0-3])${ORDINAL_SUFFIX_SRC}`, kind: 'isoWeek' },
	WW: { src: '(0[1-9]|[1-4]\\d|5[0-3])', kind: 'isoWeek' },
	W: { src: '([1-9]|[1-4]\\d|5[0-3])', kind: 'isoWeek' },
	gggg: { src: '(\\d{4})', kind: 'weekYear' },
	gg: { src: '(\\d{2})', kind: '' },
	GGGG: { src: '(\\d{4})', kind: 'isoWeekYear' },
	GG: { src: '(\\d{2})', kind: '' },
	HH: { src: '(\\d{2})', kind: 'hour' },
	H: { src: '(\\d{1,2})', kind: 'hour', zeroless: true },
	hh: { src: '(0[1-9]|1[0-2])', kind: '' },
	h: { src: '(0?[1-9]|1[0-2])', kind: '', zeroless: true },
	kk: { src: '(0[1-9]|1\\d|2[0-4])', kind: '' },
	k: { src: '([1-9]|1\\d|2[0-4])', kind: '' },
	mm: { src: '([0-5]\\d)', kind: 'minute' },
	m: { src: '([0-5]?\\d)', kind: 'minute', zeroless: true },
	ss: { src: '([0-5]\\d)', kind: 'second' },
	s: { src: '([0-5]?\\d)', kind: 'second', zeroless: true },
	SSS: { src: '(\\d{3})', kind: 'ms' },
	// moment parses the meridiem case-insensitively for both tokens, with optional dots and an
	// optional "m": "10:00 pm", "10:00 P", "10:00 p.m." all match "hh:mm A"
	A: { src: '([AaPp]\\.?[Mm]?\\.?)', kind: '' },
	a: { src: '([AaPp]\\.?[Mm]?\\.?)', kind: '' },
	X: { src: '(\\d{1,12})', kind: '' },
	x: { src: '(\\d{1,15})', kind: '' },
	zzz: { src: '([\\p{L}\\p{M} ]+)', kind: '' },
	zz: { src: '([\\p{L}\\p{M}+\\-:\\d]+)', kind: '' },
	z: { src: '([\\p{L}\\p{M}+\\-:\\d]+)', kind: '' },
	ZZ: { src: '([+-]\\d{4}|Z)', kind: 'offset' },
	Z: { src: '([+-]\\d{2}:\\d{2}|Z)', kind: 'offset' },
};

function escapeForRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compiles a display-token template into an anchored validation RegExp plus
 * the semantic slots (capture-group index -> field kind) needed for the
 * post-match range/calendar/strict checks. Throws 'Invalid template !' when
 * the template is not a string or contains no recognizable token, matching
 * the legacy isValid contract for unknown templates.
 *
 * @param {string} template
 * @returns {{regex: RegExp, slots: Array<{g: number, kind: string, zeroless: boolean, ordinal: number}>}}
 */
function compileValidator(template) {
	if (typeof template !== 'string') {
		throw new Error('Invalid template !');
	}
	let src = '';
	let tokenCount = 0;
	let groupIndex = 0;
	const slots = [];
	let lastIndex = 0;
	format_token_regex.lastIndex = 0;
	let match = format_token_regex.exec(template);
	while (match !== null) {
		if (match.index > lastIndex) {
			src += escapeForRegex(template.slice(lastIndex, match.index));
		}
		const token = match[0];
		if (match[1] !== undefined) {
			src += escapeForRegex(token.slice(1, -1));
		} else {
			tokenCount++;
			// S-runs other than SSS (S, SS, SSSS..SSSSSSSSS) are the only tokens missing from the map.
			const spec = validator_token_map[token] || { src: `(\\d{${token.length}})`, kind: 'ms' };
			src += spec.src;
			groupIndex++;
			const group = groupIndex;
			let ordinal = 0;
			if (spec.ordinal === true) {
				groupIndex++;
				ordinal = groupIndex;
			}
			if (spec.kind !== '' || spec.zeroless === true) {
				slots.push({ g: group, kind: spec.kind, zeroless: spec.zeroless === true, ordinal, token });
			}
		}
		lastIndex = format_token_regex.lastIndex;
		match = format_token_regex.exec(template);
	}
	if (lastIndex < template.length) {
		src += escapeForRegex(template.slice(lastIndex));
	}
	if (tokenCount === 0) {
		throw new Error('Invalid template !');
	}
	return { regex: new RegExp(`^${src}$`, 'u'), slots };
}

const compiled_validators = new Map();

// No date string any template describes comes close to this length; longer inputs are rejected
// before the regex runs, so templates with adjacent free-form tokens (e.g. two name tokens
// without a separator) cannot be driven into super-linear backtracking by long inputs.
const MAX_VALIDATION_INPUT_LENGTH = 256;

/**
 * ISO-8601 weeks in an ISO week-year (52 or 53): the year has 53 weeks when Dec 28 falls in week 53.
 *
 * @param {number} year
 * @returns {number}
 */
function isoWeeksInYear(year) {
	return getIsoWeekInfo(year, 12, 28).week;
}

/**
 * Locale weeks (weekStartDay-based, week 1 contains Jan 1) in a week-year: the week of the last
 * day of the week-year's final week.
 *
 * @param {number} year
 * @param {number} weekStartDay
 * @returns {number}
 */
function localeWeeksInYear(year, weekStartDay) {
	// Dec 31 is either in the last week of `year` or in week 1 of the next week-year; in the latter
	// case the last week of `year` is the one just before it.
	const info = getLocaleWeekInfo(year, 12, 31, weekStartDay);
	return info.year === year ? info.week : getLocaleWeekInfo(year, 12, 24, weekStartDay).week;
}

/**
 * Validates an input against an arbitrary display-token template (compiled and
 * memoized on first use). Default mode is shape-only, mirroring the predefined
 * templates' philosophy (hours up to 29 for day overflow); strict mode adds
 * moment-strict semantics: wall-clock hours (24 only as exactly 24:00[:00]),
 * 4-digit years 1700-2199, real-calendar day checks when numeric year+month+day
 * are present, no zero-padded values on single-letter tokens (D M H h m s), a
 * required ordinal suffix on Do, and week numbers that exist in their week-year.
 *
 * @param {string} template
 * @param {*} input
 * @param {boolean} is_strict
 * @returns {boolean}
 */
function validateDynamicTemplate(template, input, is_strict) {
	let compiled = compiled_validators.get(template);
	if (compiled === undefined) {
		compiled = compileValidator(template);
		if (compiled_validators.size > 1000) {
			compiled_validators.clear();
		}
		compiled_validators.set(template, compiled);
	}
	const s = asString(input);
	if (s.length > MAX_VALIDATION_INPUT_LENGTH) {
		return false;
	}
	const m = compiled.regex.exec(s);
	if (m === null) {
		return false;
	}
	const slots = compiled.slots;
	let year = -1;
	let month = -1;
	let day = -1;
	let hour = -1;
	let minute = -1;
	let second = -1;
	let ms = -1;
	let doy = -1;
	let week = -1;
	let isoWeek = -1;
	let weekYear = -1;
	let isoWeekYear = -1;
	let monthName = null;
	let monthToken = '';
	let weekdayName = null;
	let weekdayToken = '';
	let offset = null;
	for (let i = 0; i < slots.length; i++) {
		const slot = slots[i];
		const raw = m[slot.g];
		if (is_strict) {
			if (slot.zeroless && raw.length === 2 && raw.charCodeAt(0) === 48) {
				return false;
			}
			if (slot.ordinal !== 0 && m[slot.ordinal] === undefined) {
				return false;
			}
		}
		const v = +raw;
		switch (slot.kind) {
			case 'year':
				year = v;
				break;
			case 'month':
				month = v;
				break;
			case 'day':
				day = v;
				break;
			case 'hour':
				hour = v;
				break;
			case 'minute':
				minute = v;
				break;
			case 'second':
				second = v;
				break;
			case 'ms':
				if (v > ms) {
					ms = v;
				}
				break;
			case 'doy':
				doy = v;
				break;
			case 'week':
				week = v;
				break;
			case 'isoWeek':
				isoWeek = v;
				break;
			case 'weekYear':
				weekYear = v;
				break;
			case 'isoWeekYear':
				isoWeekYear = v;
				break;
			case 'monthName':
				monthName = raw;
				monthToken = slot.token;
				break;
			case 'weekdayName':
				weekdayName = raw;
				weekdayToken = slot.token;
				break;
			case 'offset':
				offset = raw;
				break;
			default:
				break;
		}
	}
	if (doy !== -1 && (doy < 1 || doy > 366)) {
		return false;
	}
	if (hour !== -1 && !checkHour(hour, minute, second, ms, is_strict, 29)) {
		return false;
	}
	if (is_strict) {
		if (year !== -1 && (year < 1700 || year > 2199)) {
			return false;
		}
		// Month names must be real names of the token's form (MMMM long, MMM short; any language).
		if (monthName !== null) {
			if (!isNameOfForm(monthName, monthToken)) {
				return false;
			}
			month = getMonthNumber(monthName);
		}
		// Year-less templates use a leap year so "29 Feb" stays acceptable without a year context.
		if (month !== -1 && day !== -1 && !isRealDate(year !== -1 ? year : 2000, month, day)) {
			return false;
		}
		if (weekdayName !== null && !isWeekdayConsistent(weekdayName, weekdayToken, year, month, day)) {
			return false;
		}
		if (doy === 366 && year !== -1 && !isRealDate(year, 2, 29)) {
			return false;
		}
		// Without an explicit week-year the calendar year is the week-year (moment).
		const isoYear = isoWeekYear !== -1 ? isoWeekYear : year;
		if (isoWeek === 53 && isoYear !== -1 && isoWeeksInYear(isoYear) < 53) {
			return false;
		}
		const localeYear = weekYear !== -1 ? weekYear : year;
		if (week !== -1 && localeYear !== -1 && week > localeWeeksInYear(localeYear, global_config.weekStartDay)) {
			return false;
		}
		if (offset !== null && !isValidUtcOffset(offset)) {
			return false;
		}
	}
	return true;
}

/**
 * Strict weekday check: a real weekday name of the token's form (dddd long, ddd short, dd
 * two letters; any language) that, when the full date is known, names that date's weekday
 * (moment rejects "Thursday, 09 February 2024").
 *
 * @param {string} name
 * @param {string} token
 * @param {number} year - -1 when absent
 * @param {number} month - 1-12, -1 when absent
 * @param {number} day - -1 when absent
 * @returns {boolean}
 */
function isWeekdayConsistent(name, token, year, month, day) {
	if (!isNameOfForm(name, token)) {
		return false;
	}
	if (year === -1 || month === -1 || day === -1) {
		return true;
	}
	const index = token === 'dd' ? getMinWeekdayIndex(name) : getWeekdayIndex(name);
	return index === -1 || index === getDayOfWeek(year, month, day);
}

/**
 * Two-letter weekday form ("Fr") to its day number via the short names it abbreviates; the
 * configured locale's language first (across languages "Th" is Thursday in English but the
 * Vietnamese "Th 2".."Th 7" are Monday..Saturday).
 *
 * @param {string} name
 * @returns {number} 0-6, or -1 when ambiguous/unknown
 */
function getMinWeekdayIndex(name) {
	const lower = name.toLowerCase();
	let own = -1;
	for (const [short, index] of getLanguageWeekdayTable(configuredLanguage())) {
		if (short.slice(0, 2) === lower) {
			if (own !== -1 && own !== index) {
				own = -1;
				break;
			}
			own = index;
		}
	}
	if (own !== -1) {
		return own;
	}
	let found = -1;
	for (const short of day_short_names) {
		if (short.slice(0, 2) === lower) {
			const index = getWeekdayIndex(short);
			if (found !== -1 && found !== index) {
				return -1;
			}
			found = index;
		}
	}
	return found;
}

/**
 * UTC offset designator range check (moment): Z, or ±hh:mm / ±hhmm with minutes 00-59 and at
 * most 14:00 away from UTC.
 *
 * @param {string} offset
 * @returns {boolean}
 */
function isValidUtcOffset(offset) {
	if (offset === 'Z') {
		return true;
	}
	const digits = offset.replace(':', '');
	const hours = +digits.slice(1, 3);
	const minutes = +digits.slice(3, 5);
	return minutes <= 59 && hours * 60 + minutes <= 14 * 60;
}

/*
 * ---------------------------------------------------------------------------
 * Predefined-template field extraction: the constructor's forced-format parser
 * and strict isValid for the predefined templates that have no charCode
 * validator (name templates, 12-hour times, 'YYYY-MM-DD HH' family). Inputs
 * reach it only after the template's legacy regex accepted them, so the
 * patterns here only need to split already-validated shapes into fields.
 * ---------------------------------------------------------------------------
 */

const forced_parse_tokens = {
	YYYY: { src: '(\\d{4}|\\d{2})', kind: 'year' },
	MMMM: { src: NAME_TOKEN_SRC, kind: 'monthName' },
	MMM: { src: NAME_TOKEN_SRC, kind: 'monthName' },
	MM: { src: '(\\d{2})', kind: 'month' },
	Do: { src: `(\\d{1,2})${ORDINAL_SUFFIX_CAPTURE}`, kind: 'day', ordinal: true },
	DD: { src: '(\\d{1,2})', kind: 'day' },
	D: { src: '(\\d{1,2})', kind: 'day' },
	dddd: { src: NAME_TOKEN_SRC, kind: 'weekday' },
	ddd: { src: NAME_TOKEN_SRC, kind: 'weekday' },
	HH: { src: '(\\d{2})', kind: 'hour' },
	hh: { src: '(\\d{2})', kind: 'hour12' },
	mm: { src: '(\\d{2})', kind: 'minute' },
	ss: { src: '(\\d{2})', kind: 'second' },
	SSS: { src: '(\\d{3})', kind: 'ms' },
};

/**
 * Compiles a predefined template into a field-extraction RegExp. Spaces match any whitespace run
 * (the ordinal templates' legacy regexes use \s+). Two legacy shape quirks are mirrored: 'HH:mm'
 * accepts an optional ':ss' tail, and the 12-hour templates carry a trailing ' AM'/' PM'.
 *
 * @param {string} template
 * @returns {{regex: RegExp, slots: Array<{g: number, kind: string, ordinal: number}>}|null} null when
 * the template uses a token the forced parser does not support
 */
function compileFieldParser(template) {
	let src = '';
	let groupIndex = 0;
	const slots = [];
	let lastIndex = 0;
	const literal = (text) => escapeForRegex(text).replace(/ /g, '\\s+');
	format_token_regex.lastIndex = 0;
	let match = format_token_regex.exec(template);
	while (match !== null) {
		if (match.index > lastIndex) {
			src += literal(template.slice(lastIndex, match.index));
		}
		const token = match[0];
		if (match[1] !== undefined) {
			src += literal(token.slice(1, -1));
		} else {
			const spec = forced_parse_tokens[token];
			if (spec === undefined) {
				return null;
			}
			src += spec.src;
			groupIndex++;
			const group = groupIndex;
			let ordinal = 0;
			if (spec.ordinal === true) {
				groupIndex++;
				ordinal = groupIndex;
			}
			slots.push({ g: group, kind: spec.kind, ordinal, token });
		}
		lastIndex = format_token_regex.lastIndex;
		match = format_token_regex.exec(template);
	}
	if (lastIndex < template.length) {
		src += literal(template.slice(lastIndex));
	}
	if (template === 'HH:mm') {
		src += '(?::(\\d{2}))?';
		groupIndex++;
		slots.push({ g: groupIndex, kind: 'second', ordinal: 0 });
	} else if (template.startsWith('hh:')) {
		src += '\\s+(AM|PM)';
		groupIndex++;
		slots.push({ g: groupIndex, kind: 'meridiem', ordinal: 0 });
	}
	return { regex: new RegExp(`^${src}$`, 'u'), slots };
}

const compiled_field_parsers = new Map();

/**
 * Splits an input that matches a predefined template into its fields.
 *
 * @param {string} template - a key of format_types
 * @param {string} input
 * @returns {{year: number, yearDigits: number, month: number, monthName: string|null, day: number,
 * ordinal: boolean, weekday: string|null, hour: number, hour12: number, meridiem: string|null,
 * minute: number, second: number, ms: number}|null} null when the input does not fit the template
 */
function parseTemplateFields(template, input) {
	let parser = compiled_field_parsers.get(template);
	if (parser === undefined) {
		parser = compileFieldParser(template);
		compiled_field_parsers.set(template, parser);
	}
	if (parser === null) {
		return null;
	}
	const m = parser.regex.exec(input);
	if (m === null) {
		return null;
	}
	const fields = {
		year: -1,
		yearDigits: 0,
		month: -1,
		monthName: null,
		monthToken: '',
		day: -1,
		dayRaw: '',
		dayToken: '',
		ordinal: false,
		weekday: null,
		weekdayToken: '',
		hour: -1,
		hour12: -1,
		meridiem: null,
		minute: -1,
		second: -1,
		ms: -1,
	};
	const slots = parser.slots;
	for (let i = 0; i < slots.length; i++) {
		const slot = slots[i];
		const raw = m[slot.g];
		if (raw === undefined) {
			continue;
		}
		switch (slot.kind) {
			case 'year':
				fields.year = +raw;
				fields.yearDigits = raw.length;
				break;
			case 'month':
				fields.month = +raw;
				break;
			case 'monthName':
				fields.monthName = raw;
				fields.monthToken = slot.token;
				break;
			case 'day':
				fields.day = +raw;
				fields.dayRaw = raw;
				fields.dayToken = slot.token;
				fields.ordinal = slot.ordinal !== 0 && m[slot.ordinal] !== undefined;
				break;
			case 'weekday':
				fields.weekday = raw;
				fields.weekdayToken = slot.token;
				break;
			case 'hour':
				fields.hour = +raw;
				break;
			case 'hour12':
				fields.hour12 = +raw;
				break;
			case 'meridiem':
				fields.meridiem = raw;
				break;
			case 'minute':
				fields.minute = +raw;
				break;
			case 'second':
				fields.second = +raw;
				break;
			case 'ms':
				fields.ms = +raw;
				break;
			default:
				break;
		}
	}
	return fields;
}

/**
 * Strict (moment-strict) semantics for a predefined template validated by its legacy regex:
 * 4-digit years 1700-2199, known month and weekday names, real calendar days (leap years
 * included; year-less templates assume a leap year), wall-clock hours with 24 allowed only as
 * 24:00[:00], and the ordinal suffix that 'Do' requires.
 *
 * @param {string} template
 * @param {string} input
 * @returns {boolean}
 */
function strictTemplateCheck(template, input) {
	const f = parseTemplateFields(template, input);
	if (f === null) {
		return false;
	}
	if (f.year !== -1 && (f.yearDigits !== 4 || f.year < 1700 || f.year > 2199)) {
		return false;
	}
	let month = f.month;
	if (f.monthName !== null) {
		// a real month name of the token's form (MMMM long, MMM short), in any supported language
		if (!isNameOfForm(f.monthName, f.monthToken)) {
			return false;
		}
		month = getMonthNumber(f.monthName);
	}
	if (month !== -1 && (month < 1 || month > 12)) {
		return false;
	}
	if (f.day !== -1) {
		if (f.day < 1 || f.day > 31) {
			return false;
		}
		// DD needs two digits; D and Do take none-padded values (moment 2.30 strict)
		if (f.dayToken === 'DD' ? f.dayRaw.length !== 2 : f.dayRaw.length === 2 && f.dayRaw.charCodeAt(0) === 48) {
			return false;
		}
		if (month !== -1 && !isRealDate(f.year !== -1 ? f.year : 2000, month, f.day)) {
			return false;
		}
		if (f.dayToken === 'Do' && !f.ordinal) {
			return false;
		}
	}
	if (f.weekday !== null && !isWeekdayConsistent(f.weekday, f.weekdayToken, f.year, month, f.day)) {
		return false;
	}
	if (f.hour12 !== -1 && (f.hour12 < 1 || f.hour12 > 12)) {
		return false;
	}
	if (f.hour !== -1 && !checkHour(f.hour, f.minute, f.second, f.ms, true, 29)) {
		return false;
	}
	return true;
}

module.exports.getTimezoneOffset = getTimezoneOffset;
module.exports.parseWithTimezone = parseWithTimezone;
module.exports.checkTimezone = checkTimezone;
module.exports.getTimezoneInfo = getTimezoneInfo;
module.exports.convertToTimezone = convertToTimezone;
module.exports.getAvailableTimezones = getAvailableTimezones;
module.exports.isDST = isDST;
module.exports.getTimezoneAbbreviation = getTimezoneAbbreviation;
module.exports.padZero = padZero;
module.exports.absFloor = absFloor;
module.exports.duration = duration;
module.exports.dateTimeFormat = dateTimeFormat;
module.exports.converter = converter;
module.exports.compileFormat = compileFormat;
module.exports.getCompiledTemplate = getCompiledTemplate;
module.exports.isValidMonth = isValidMonth;
module.exports.isValidDayName = isValidDayName;
module.exports.getMonthNumber = getMonthNumber;
module.exports.tryParseTextDate = tryParseTextDate;
module.exports.num2 = num2;
module.exports.num4 = num4;
module.exports.getOrdinal = getOrdinal;
module.exports.getDayOfWeek = getDayOfWeek;
module.exports.getDayOfYear = getDayOfYear;
module.exports.getIsoWeekInfo = getIsoWeekInfo;
module.exports.getLocaleWeekInfo = getLocaleWeekInfo;
module.exports.getTimezoneLongName = getTimezoneLongName;
module.exports.format_validators = format_validators;
module.exports.validateDynamicTemplate = validateDynamicTemplate;
module.exports.compileValidator = compileValidator;
module.exports.isRealDate = isRealDate;
module.exports.offsetAt = offsetAt;
module.exports.isUtcZone = isUtcZone;
module.exports.toWallClock = toWallClock;
module.exports.wallClockToInstant = wallClockToInstant;
module.exports.keepSystemOffset = keepSystemOffset;
module.exports.systemOffsetAt = systemOffsetAt;
module.exports.daysInMonth = daysInMonth;
module.exports.ensureToday = ensureToday;
module.exports.parseToday = parseToday;
module.exports.hasExplicitZone = hasExplicitZone;
module.exports.nativeZoneKind = nativeZoneKind;
module.exports.closedEngineText = closedEngineText;
module.exports.ZONE_NONE = ZONE_NONE;
module.exports.ZONE_EXPLICIT = ZONE_EXPLICIT;
module.exports.ZONE_UTC_DATE = ZONE_UTC_DATE;
module.exports.localFromFields = localFromFields;
module.exports.takeParsedWall = takeParsedWall;
module.exports.takeLocaleNamesUsed = takeLocaleNamesUsed;
module.exports.takeParsedToday = takeParsedToday;
module.exports.resetParseCapture = resetParseCapture;
module.exports.configuredLanguage = configuredLanguage;
module.exports.setWallCapture = setWallCapture;
module.exports.captureWallForParse = captureWallForParse;
module.exports.isWallCaptureEnabled = isWallCaptureEnabled;
module.exports.recordParsedWall = recordParsedWall;
module.exports.parseTemplateFields = parseTemplateFields;
module.exports.strictTemplateCheck = strictTemplateCheck;
module.exports.boundedSet = boundedSet;
module.exports.isNameOfForm = isNameOfForm;
module.exports.getWeekdayIndex = getWeekdayIndex;
module.exports.ABSOLUTE_FORMATS = ABSOLUTE_FORMATS;
