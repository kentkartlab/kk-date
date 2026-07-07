const nopeRedis = require('./nope-redis');
const {
	parseWithTimezone,
	getTimezoneOffset,
	absFloor,
	duration,
	padZero,
	checkTimezone,
	getTimezoneInfo,
	convertToTimezone,
	getAvailableTimezones,
	isDST,
	getTimezoneAbbreviation,
	dateTimeFormat,
	converter,
	isValidMonth,
	tryParseTextDate,
	num2,
	num4,
	getOrdinal,
	getCompiledTemplate,
	getDayOfWeek,
	getDayOfYear,
	getIsoWeekInfo,
	getLocaleWeekInfo,
	getTimezoneLongName,
	format_validators,
	validateDynamicTemplate,
} = require('./functions');
const {
	cached_dateTimeFormat,
	format_types,
	timeInMilliseconds,
	format_types_regex,
	global_config,
	format_types_regex_cache,
	formatter_cache,
	format_part_types,
	format_derived_flags,
	systemTimezone,
} = require('./constants');

nopeRedis.config({ defaultTtl: 1300 });

// Hoisted 'dddd' sentinel so the static isValid fast path is a single identity compare
// instead of a property load on every call (the detection ladder calls isValid per rung).
const TEMPLATE_DDDD = format_types.dddd;

// Mirrors nope-redis service status. When caching is disabled (the default), we skip all
// cache reads/writes so no cache-key string, Date clone, or Promise is allocated on the hot path.
let cachingEnabled = false;

// Shared frozen per-instance config: most instances never call config()/tz()/fromNow(), so the
// constructor assigns this sentinel instead of allocating a fresh { rtf: {} } per instance.
// Readers behave exactly as with a fresh object (every property is undefined); the few methods
// that write per-instance config go through ownTempConfig() first (copy-on-write).
const EMPTY_RTF = Object.freeze({});
const EMPTY_TEMP_CONFIG = Object.freeze({ timezone: undefined, locale: undefined, weekStartDay: undefined, rtf: EMPTY_RTF });

/**
 * Copy-on-write escape from the shared temp_config sentinel; call before any temp_config write.
 *
 * @param {KkDate} kkDate
 * @returns {object} the instance's own (writable) temp_config
 */
function ownTempConfig(kkDate) {
	if (kkDate.temp_config === EMPTY_TEMP_CONFIG) {
		kkDate.temp_config = { timezone: undefined, locale: undefined, weekStartDay: undefined, rtf: {} };
	}
	return kkDate.temp_config;
}

// True only while the global timezone differs from the system timezone — the single case where
// the constructor's parseWithTimezone() call can change the date. Kept in sync by config() and
// setTimezone() so the constructor can skip that call entirely in the default configuration.
let timezone_shift_enabled = global_config.timezone !== systemTimezone;

/**
 * Builds a local-time Date from already-split numeric date parts using the numeric Date
 * constructor, which skips the engine's (much slower) string date parser.
 *
 * Guarded on a 4-digit year: the parse regexes' `(|17|18|19|20|21)\d\d` empty-alternative also
 * matches 2-digit years, for which the numeric constructor maps to 19xx and would accept inputs
 * that the legacy string form rejects. 2-digit years fall back to the exact legacy string so
 * behavior is preserved.
 *
 * @param {string} year
 * @param {string} month - 1-based month
 * @param {string} day
 * @returns {Date}
 */
function fastLocalDate(year, month, day) {
	if (year.length === 4) {
		return new Date(+year, +month - 1, +day, 0, 0, 0, 0);
	}
	return new Date(`${year}-${month}-${day} 00:00:00`);
}

/**
 * Two ASCII digits at offset i as an int. Only called on strings whose shape was already
 * confirmed by a template validator, so no digit re-checking is needed.
 *
 * @param {string} s
 * @param {number} i
 * @returns {number}
 */
function cc2(s, i) {
	return (s.charCodeAt(i) - 48) * 10 + (s.charCodeAt(i + 1) - 48);
}

/**
 * Four ASCII digits at offset i as an int (validated shapes only).
 *
 * @param {string} s
 * @param {number} i
 * @returns {number}
 */
function cc4(s, i) {
	return cc2(s, i) * 100 + cc2(s, i + 2);
}

/**
 * Like {@link fastLocalDate} but with a time component. `timePart` is the raw "HH:mm[:ss]" slice;
 * seconds default to 0 when absent. Same 4-digit-year guard and legacy fallback.
 *
 * @param {string} year
 * @param {string} month - 1-based month
 * @param {string} day
 * @param {string} timePart - "HH:mm" or "HH:mm:ss"
 * @returns {Date}
 */
function fastLocalDateTime(year, month, day, timePart) {
	if (year.length === 4) {
		const [h, mi, s] = timePart.split(':');
		return new Date(+year, +month - 1, +day, +h, +mi || 0, +s || 0, 0);
	}
	return new Date(`${year}-${month}-${day}T${timePart}`);
}

/**
 * @class KkDate
 * @description A utility class for date parsing, validation, and formatting.
 * Accepts various input types (string, Date, KkDate) and supports multiple date formats
 * like "YYYY-MM-DD" or "YYYY-DD-MM".
 */

// ---------------------------------------------------------------------------
// Constructor auto-detection
//
// String inputs are routed by (length, separator charCode) so each input runs at most a
// couple of template validators instead of walking a long rung ladder. The validators are
// the same `format_validators` the ladder used — acceptance is unchanged — and every shape
// the fast paths decline falls through to `parseTextLegacy`, which keeps the original
// regex rung chain and the native `new Date(string)` fallback verbatim.
// ---------------------------------------------------------------------------

// Cached "today" fields for time-of-day inputs. Valid while Date.now() lies inside
// [today_from, today_until); both boundaries come from real local Date construction, so the
// window stays exact across DST transitions (23/25-hour days).
let today_year = 0;
let today_month = 0;
let today_day = 0;
let today_from = 1;
let today_until = 0;

function refreshToday(nowMs) {
	const now = new Date(nowMs);
	today_year = now.getFullYear();
	today_month = now.getMonth();
	today_day = now.getDate();
	today_from = new Date(today_year, today_month, today_day, 0, 0, 0, 0).getTime();
	today_until = new Date(today_year, today_month, today_day + 1, 0, 0, 0, 0).getTime();
}

/**
 * Parses bare time-of-day strings onto today's date in a single charCode pass (no split()).
 * Acceptance is bit-identical to the legacy validator/regex set:
 *   24-hour "HH:mm[:ss[.SSS]]" with hours 00-29 (24+ rolls into the next day),
 *   12-hour "hh:mm[:ss[.SSS]] AM|PM" with hours 01-12 (uppercase meridiem only).
 * Everything else returns false and must keep falling through — e.g. "12:30:60" reaches the
 * native parser, which reads ":60" as a 2-digit year (locked legacy behavior).
 *
 * detected_format quirks are load-bearing (tests and timezone reinterpretation key off them):
 * zero seconds report 'HH:mm' ("14:30:00", "02:30 PM" and "02:30:00 PM" all detect as
 * 'HH:mm'), and ".000" milliseconds do not count as a .SSS match.
 *
 * @param {KkDate} kk
 * @param {string} s - string with ":" at index 2 and length <= 15
 * @param {number} len
 * @returns {boolean}
 */
function parseTimeOnly(kk, s, len) {
	let hours = num2(s, 0);
	const minutes = num2(s, 3);
	if (hours < 0 || minutes < 0 || minutes > 59) {
		return false;
	}
	let seconds = 0;
	let hasSeconds = false;
	let milliseconds = 0;
	let end = 5; // index just past "HH:mm"
	if (len >= 8 && s.charCodeAt(5) === 58) {
		seconds = num2(s, 6);
		if (seconds < 0 || seconds > 59) {
			return false;
		}
		hasSeconds = true;
		end = 8;
		if (len >= 12 && s.charCodeAt(8) === 46) {
			const msHi = num2(s, 9);
			const msLo = s.charCodeAt(11) - 48;
			if (msHi < 0 || msLo < 0 || msLo > 9) {
				return false;
			}
			milliseconds = msHi * 10 + msLo;
			end = 12;
		}
	}
	let isTwelveHour = false;
	if (end !== len) {
		// Only a literal " AM"/" PM" tail may remain (12-hour forms).
		if (len !== end + 3 || s.charCodeAt(end) !== 32 || s.charCodeAt(end + 2) !== 77 || hours < 1 || hours > 12) {
			return false;
		}
		const meridiem = s.charCodeAt(end + 1);
		if (meridiem === 65) {
			if (hours === 12) {
				hours = 0;
			}
		} else if (meridiem === 80) {
			if (hours !== 12) {
				hours += 12;
			}
		} else {
			return false;
		}
		isTwelveHour = true;
	} else if (hours > 29) {
		return false;
	}
	const nowMs = Date.now();
	if (nowMs < today_from || nowMs >= today_until) {
		refreshToday(nowMs);
	}
	// Hours 24-29 spill into the following day through the day argument — the same
	// normalization the legacy setDate() + setHours() pair produced.
	const extraDay = hours >= 24 ? 1 : 0;
	kk.date = new Date(today_year, today_month, today_day + extraDay, hours - extraDay * 24, minutes, seconds, milliseconds);
	if (milliseconds !== 0) {
		kk.detected_format = isTwelveHour ? format_types['hh:mm:ss.SSS'] : format_types['HH:mm:ss.SSS'];
	} else if (hasSeconds && seconds !== 0) {
		kk.detected_format = isTwelveHour ? format_types['hh:mm:ss'] : format_types['HH:mm:ss'];
	} else {
		kk.detected_format = format_types['HH:mm'];
	}
	return true;
}

/**
 * Exact-shape ISO parser built straight from charCodes:
 *   len 19 "YYYY-MM-DDTHH:mm:ss"      → local time (utc = false)
 *   len 20 "YYYY-MM-DDTHH:mm:ssZ"     → UTC
 *   len 24 "YYYY-MM-DDTHH:mm:ss.SSSZ" → UTC
 * Day overflow rolls exactly like the native parser; the shapes where native semantics
 * differ from the numeric constructors (month 13, hour 24, year < 100 two-digit mapping)
 * return false so the caller's native `new Date(string)` keeps producing the locked result.
 *
 * @param {KkDate} kk
 * @param {string} s
 * @param {number} len - 19, 20 or 24 (already checked by the caller)
 * @param {boolean} utc
 * @returns {boolean}
 */
function parseIsoExact(kk, s, len, utc) {
	if (s.charCodeAt(13) !== 58 || s.charCodeAt(16) !== 58) {
		return false;
	}
	const year = num4(s, 0);
	const month = num2(s, 5);
	const day = num2(s, 8);
	const hours = num2(s, 11);
	const minutes = num2(s, 14);
	const seconds = num2(s, 17);
	if (
		year < 100 ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hours < 0 ||
		hours > 23 ||
		minutes < 0 ||
		minutes > 59 ||
		seconds < 0 ||
		seconds > 59
	) {
		return false;
	}
	let milliseconds = 0;
	if (len === 24) {
		if (s.charCodeAt(19) !== 46) {
			return false;
		}
		const msHi = num2(s, 20);
		const msLo = s.charCodeAt(22) - 48;
		if (msHi < 0 || msLo < 0 || msLo > 9) {
			return false;
		}
		milliseconds = msHi * 10 + msLo;
	}
	kk.date = utc
		? new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds))
		: new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
	return true;
}

/**
 * Claims a full-year "YYYY(sep)MM(sep)DD HH:mm[:ss]" input from fixed charCode offsets.
 * Only called after the template's validator accepted the string, so fields are digits and
 * hours are 00-29; hours 24-29 spill into the next day (legacy overflow result).
 */
function claimYmdDateTime(kk, s, template, withSeconds) {
	const hours = cc2(s, 11);
	const day = cc2(s, 8);
	const extraDay = hours >= 24 ? 1 : 0;
	kk.date = new Date(cc4(s, 0), cc2(s, 5) - 1, day + extraDay, hours - extraDay * 24, cc2(s, 14), withSeconds ? cc2(s, 17) : 0, 0);
	kk.detected_format = format_types[template];
	return true;
}

/** Mirror of claimYmdDateTime for "DD(sep)MM(sep)YYYY HH:mm[:ss]" layouts. */
function claimDmyDateTime(kk, s, template, withSeconds) {
	const hours = cc2(s, 11);
	const day = cc2(s, 0);
	const extraDay = hours >= 24 ? 1 : 0;
	kk.date = new Date(cc4(s, 6), cc2(s, 3) - 1, day + extraDay, hours - extraDay * 24, cc2(s, 14), withSeconds ? cc2(s, 17) : 0, 0);
	kk.detected_format = format_types[template];
	return true;
}

/**
 * Legacy construction for the rare 2-digit-year datetime shapes ("15-01-24 14:30", ...).
 * The exact split()-based pipeline is preserved — including the string round-trips — because
 * V8's string parser defines their (locked, often Invalid) results.
 */
function claimShortYearDateTime(kk, s, template, sep, dayFirst, withSeconds) {
	const [datePart, timePart] = s.split(' ');
	const dateParts = datePart.split(sep);
	const year = dayFirst ? dateParts[2] : dateParts[0];
	const month = dateParts[1];
	const day = dayFirst ? dateParts[0] : dateParts[2];
	const timeParts = timePart.split(':').map(Number);
	const hours = timeParts[0];
	if (hours >= 24) {
		const extraDays = Math.floor(hours / 24);
		const dateObj = fastLocalDate(year, month, day);
		dateObj.setDate(dateObj.getDate() + extraDays);
		const newDay = String(dateObj.getDate()).padStart(2, '0');
		const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
		const newYear = dateObj.getFullYear();
		const hoursText = (hours % 24).toString().padStart(2, '0');
		const minutesText = timeParts[1].toString().padStart(2, '0');
		kk.date = withSeconds
			? new Date(`${newYear}-${newMonth}-${newDay}T${hoursText}:${minutesText}:${timeParts[2].toString().padStart(2, '0')}`)
			: new Date(`${newYear}-${newMonth}-${newDay}T${hoursText}:${minutesText}`);
	} else {
		kk.date = fastLocalDateTime(year, month, day, timePart);
	}
	kk.detected_format = format_types[template];
	return true;
}

/**
 * Numeric date shapes ("-" / "." separated and compact digits), dispatched by length and
 * separator position. Branch order inside each length class preserves the legacy ladder's
 * claim precedence for overlapping shapes (dot DD.MM.YY before dot YY.MM.DD, dash YY-MM-DD
 * before dash DD-MM-YY, ...).
 *
 * @param {KkDate} kk
 * @param {string} s
 * @param {number} len
 * @param {number} probe2 - charCodeAt(2)
 * @param {number} probe4 - charCodeAt(4)
 * @returns {boolean}
 */
function parseNumericDate(kk, s, len, probe2, probe4) {
	switch (len) {
		case 19: {
			if (probe2 === 46 && isValid(s, format_types['DD.MM.YYYY HH:mm:ss'])) {
				return claimDmyDateTime(kk, s, 'DD.MM.YYYY HH:mm:ss', true);
			}
			if (probe4 === 45 && isValid(s, format_types['YYYY-MM-DD HH:mm:ss'])) {
				return claimYmdDateTime(kk, s, 'YYYY-MM-DD HH:mm:ss', true);
			}
			if (probe4 === 46 && isValid(s, format_types['YYYY.MM.DD HH:mm:ss'])) {
				return claimYmdDateTime(kk, s, 'YYYY.MM.DD HH:mm:ss', true);
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY HH:mm:ss'])) {
				return claimDmyDateTime(kk, s, 'DD-MM-YYYY HH:mm:ss', true);
			}
			return false;
		}
		case 16: {
			if (probe2 === 46 && isValid(s, format_types['DD.MM.YYYY HH:mm'])) {
				return claimDmyDateTime(kk, s, 'DD.MM.YYYY HH:mm', false);
			}
			if (probe4 === 45 && isValid(s, format_types['YYYY-MM-DD HH:mm'])) {
				return claimYmdDateTime(kk, s, 'YYYY-MM-DD HH:mm', false);
			}
			if (probe4 === 46 && isValid(s, format_types['YYYY.MM.DD HH:mm'])) {
				return claimYmdDateTime(kk, s, 'YYYY.MM.DD HH:mm', false);
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY HH:mm'])) {
				return claimDmyDateTime(kk, s, 'DD-MM-YYYY HH:mm', false);
			}
			return false;
		}
		case 10: {
			if (probe2 === 46 && isValid(s, format_types['DD.MM.YYYY'])) {
				kk.date = new Date(cc4(s, 6), cc2(s, 3) - 1, cc2(s, 0), 0, 0, 0, 0);
				kk.detected_format = format_types['DD.MM.YYYY'];
				return true;
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY'])) {
				kk.date = new Date(cc4(s, 6), cc2(s, 3) - 1, cc2(s, 0), 0, 0, 0, 0);
				kk.detected_format = format_types['DD-MM-YYYY'];
				return true;
			}
			if (probe4 === 45 && isValid(s, format_types['YYYY-DD-MM'])) {
				kk.date = new Date(cc4(s, 0), cc2(s, 8) - 1, cc2(s, 5), 0, 0, 0, 0);
				kk.detected_format = format_types['YYYY-DD-MM'];
				return true;
			}
			// New rung: date-only "YYYY.MM.DD" previously fell through to the native parser with
			// the same resulting instant; out-of-range shapes still do (e.g. "2300.01.15").
			if (probe4 === 46 && isValid(s, format_types['YYYY.MM.DD'])) {
				kk.date = new Date(cc4(s, 0), cc2(s, 5) - 1, cc2(s, 8), 0, 0, 0, 0);
				kk.detected_format = format_types['YYYY.MM.DD'];
				return true;
			}
			return false;
		}
		case 7: {
			if (probe4 === 45 && isValid(s, format_types['YYYY-MM'])) {
				kk.date = new Date(cc4(s, 0), cc2(s, 5) - 1, 1, 0, 0, 0, 0);
				kk.detected_format = format_types['YYYY-MM'];
				return true;
			}
			return false;
		}
		case 17: {
			// 2-digit-year datetime shapes share separator positions; ladder order decides.
			if (probe2 === 46) {
				if (isValid(s, format_types['DD.MM.YYYY HH:mm:ss'])) {
					return claimShortYearDateTime(kk, s, 'DD.MM.YYYY HH:mm:ss', '.', true, true);
				}
				if (isValid(s, format_types['YYYY.MM.DD HH:mm:ss'])) {
					return claimShortYearDateTime(kk, s, 'YYYY.MM.DD HH:mm:ss', '.', false, true);
				}
			} else if (probe2 === 45) {
				if (isValid(s, format_types['YYYY-MM-DD HH:mm:ss'])) {
					return claimShortYearDateTime(kk, s, 'YYYY-MM-DD HH:mm:ss', '-', false, true);
				}
				if (isValid(s, format_types['DD-MM-YYYY HH:mm:ss'])) {
					return claimShortYearDateTime(kk, s, 'DD-MM-YYYY HH:mm:ss', '-', true, true);
				}
			}
			return false;
		}
		case 14: {
			if (probe2 === 46) {
				if (isValid(s, format_types['DD.MM.YYYY HH:mm'])) {
					return claimShortYearDateTime(kk, s, 'DD.MM.YYYY HH:mm', '.', true, false);
				}
				if (isValid(s, format_types['YYYY.MM.DD HH:mm'])) {
					return claimShortYearDateTime(kk, s, 'YYYY.MM.DD HH:mm', '.', false, false);
				}
				return false;
			}
			if (probe2 === 45) {
				if (isValid(s, format_types['YYYY-MM-DD HH:mm'])) {
					return claimShortYearDateTime(kk, s, 'YYYY-MM-DD HH:mm', '-', false, false);
				}
				if (isValid(s, format_types['DD-MM-YYYY HH:mm'])) {
					return claimShortYearDateTime(kk, s, 'DD-MM-YYYY HH:mm', '-', true, false);
				}
				return false;
			}
			if (isValid(s, format_types['YYYYMMDDHHmmss'])) {
				kk.date = new Date(cc4(s, 0), cc2(s, 4) - 1, cc2(s, 6), cc2(s, 8), cc2(s, 10), cc2(s, 12), 0);
				kk.detected_format = format_types['YYYYMMDDHHmmss'];
				return true;
			}
			return false;
		}
		case 12: {
			if (isValid(s, format_types['YYYYMMDDHHmmss'])) {
				// Legacy body verbatim: fixed substrings produce a truncated string for
				// 12-char inputs, whose (Invalid) native-parse result is locked.
				const year = s.substring(0, 4);
				const month = s.substring(4, 6);
				const day = s.substring(6, 8);
				const hour = s.substring(8, 10);
				const minute = s.substring(10, 12);
				const second = s.substring(12, 14);
				kk.date = new Date(`${year}-${month}-${day} ${hour}:${minute}:${second}`);
				kk.detected_format = format_types['YYYYMMDDHHmmss'];
				return true;
			}
			return false;
		}
		case 8: {
			if (probe2 === 46 && isValid(s, format_types['DD.MM.YYYY'])) {
				const [day, month, year] = s.split('.');
				kk.date = fastLocalDate(year, month, day);
				kk.detected_format = format_types['DD.MM.YYYY'];
				return true;
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY'])) {
				const [day, month, year] = s.split('-');
				kk.date = fastLocalDate(year, month, day);
				kk.detected_format = format_types['DD-MM-YYYY'];
				return true;
			}
			if (probe2 !== 46 && probe2 !== 45 && isValid(s, format_types['YYYYMMDD'])) {
				kk.date = new Date(cc4(s, 0), cc2(s, 4) - 1, cc2(s, 6), 0, 0, 0, 0);
				kk.detected_format = format_types['YYYYMMDD'];
				return true;
			}
			return false;
		}
		case 6: {
			if (isValid(s, format_types['YYYYMMDD'])) {
				// Legacy body verbatim for the short compact form (locked Invalid result).
				const year = String(s.substring(0, 4), 10);
				const month = String(s.substring(4, 6), 10);
				const day = String(s.substring(6, 8), 10);
				kk.date = new Date(`${year}-${month}-${day} 00:00:00`);
				kk.detected_format = format_types['YYYYMMDD'];
				return true;
			}
			return false;
		}
		default:
			return false;
	}
}

/**
 * Legacy text-format regex chain — the cold fallback for every string the fast paths decline
 * (2-digit-year text forms, tab-separated ordinals, embedded 'Do' matches, unknown month
 * names, ...), ending in the native `new Date(string)` parser. Bodies are the original rung
 * bodies, verbatim: their string round-trip construction defines the locked results.
 *
 * @param {KkDate} kk
 * @param {string} date
 * @param {boolean} has_space
 * @returns {boolean} always true (kk.date is always assigned, possibly an Invalid Date)
 */
function parseTextLegacy(kk, date, has_space) {
	if (has_space && isValid(date, format_types['DD MMMM YYYY'])) {
		const parts = date.split(' ');
		const day = parseInt(parts[0], 10).toString();
		const month = isValidMonth(parts[1]);
		const year = parts[2];
		kk.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['DD MMMM YYYY'];
	} else if (has_space && isValid(date, format_types['DD MMMM dddd'])) {
		const currentYear = new Date().getFullYear();
		const parts = date.split(' '); // e.g., ['01', 'January', 'Monday']
		const day = parts[0];
		const month = isValidMonth(parts[1]);
		kk.date = new Date(`${currentYear}-${month}-${day} 00:00:00`);
		kk.detected_format = format_types['DD MMMM dddd'];
	} else if (has_space && isValid(date, format_types['D MMMM YYYY'])) {
		const parts = date.split(' '); // e.g., ['1', 'January', '2024'] or ['01', 'January', '2024']
		const day = parts[0];
		const year = parts[2];
		const month = isValidMonth(parts[1]);
		kk.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['D MMMM YYYY'];
	} else if (has_space && isValid(date, format_types['YYYY MMM DD'])) {
		const parts = date.split(' ');
		const year = parts[0];
		const month = isValidMonth(parts[1]);
		const day = parts[2];
		kk.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['YYYY MMM DD'];
	} else if (isValid(date, format_types['Do MMM YYYY'])) {
		const parts = date.split(' ');
		const day = parseInt(parts[0], 10).toString();
		const month = isValidMonth(parts[1]);
		const year = parts[2];
		kk.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['Do MMM YYYY'];
	} else if (has_space && isValid(date, format_types['DD MMMM dddd, YYYY'])) {
		const parts = date.split(' ');
		const day = parseInt(parts[0], 10).toString();
		const month = isValidMonth(parts[1]);
		const year = parts[3];
		kk.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['DD MMMM dddd, YYYY'];
	} else if (has_space && isValid(date, format_types['dddd, DD MMMM YYYY'])) {
		const parts = date.split(' ');
		const day = parseInt(parts[1], 10).toString();
		const month = isValidMonth(parts[2]);
		const year = parts[3];
		kk.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['dddd, DD MMMM YYYY'];
	} else if (has_space && isValid(date, format_types['DD MMMM'])) {
		const currentYear = new Date().getFullYear();
		const parts = date.split(' ');
		const day = parts[0];
		const month = isValidMonth(parts[1]);
		kk.date = new Date(`${currentYear}-${month}-${day.padStart(2, '0')} 00:00:00`);
		kk.detected_format = format_types['DD MMMM'];
	} else {
		kk.date = new Date(`${date}`);
	}
	return true;
}

/**
 * Offset source for the manipulation methods' offset dance (add/set/get/startOf/endOf/diff).
 * When the effective timezone IS the system timezone — the default configuration, since the
 * global timezone initializes to it — the native getTimezoneOffset() yields the identical
 * value with no Intl formatToParts call and no cache-key string allocation. The two sources
 * only diverge for pre-1901 sub-minute LMT instants, far outside the supported input range.
 *
 * @param {string} timezone - effective target timezone (always truthy at call sites)
 * @param {Date} date
 * @returns {number} offset in milliseconds
 */
function offsetForCalc(timezone, date) {
	if (timezone === systemTimezone) {
		return -date.getTimezoneOffset() * 60000;
	}
	return getTimezoneOffset(timezone, date);
}

/**
 * Auto-detects and parses a string input, assigning kk.date and kk.detected_format.
 *
 * @param {KkDate} kk
 * @param {string} date
 * @returns {boolean} the constructor's is_can_cache flag (auto-detected YYYY-MM-DD is not
 * cached; every other claim — including the native fallback — is; legacy behavior)
 */
function parseStringInput(kk, date) {
	const len = date.length;
	const probe2 = date.charCodeAt(2);
	const probe4 = date.charCodeAt(4);
	// Hottest shape first; also claims the lenient 2-digit-year "YY-MM-DD" (legacy precedence).
	if ((probe2 === 45 || probe4 === 45) && isValid(date, format_types['YYYY-MM-DD'])) {
		if (len === 10) {
			kk.date = new Date(cc4(date, 0), cc2(date, 5) - 1, cc2(date, 8), 0, 0, 0, 0);
		} else {
			const [year, month, day] = date.split('-');
			kk.date = fastLocalDate(year, month, day);
		}
		kk.detected_format = 'YYYY-MM-DD';
		return false;
	}
	if (probe2 === 58 && len <= 15 && parseTimeOnly(kk, date, len)) {
		return true;
	}
	if (date.charCodeAt(len - 1) === 90 && date.indexOf('T') !== -1) {
		// UTC ISO strings; the exact 20/24-char shapes skip the native string parser.
		if (!((len === 20 || len === 24) && parseIsoExact(kk, date, len, true))) {
			kk.date = new Date(date);
		}
		kk.detected_format = 'ISO8601';
		return true;
	}
	if (probe4 === 45 && date.charCodeAt(7) === 45 && date.charCodeAt(10) === 84) {
		// ISO datetime without a Z/offset suffix, matched precisely by shape "____-__-__T…"
		// (dashes at index 4 & 7, 'T' at 10) so weekday-name inputs like "Tuesday, …" are not
		// caught. detected_format stays null, matching the legacy behavior of this shape.
		if (!(len === 19 && parseIsoExact(kk, date, len, false))) {
			kk.date = new Date(date);
		}
		return true;
	}
	if (parseNumericDate(kk, date, len, probe2, probe4)) {
		return true;
	}
	const has_space = date.indexOf(' ') !== -1;
	if (has_space && tryParseTextDate(kk, date)) {
		return true;
	}
	return parseTextLegacy(kk, date, has_space);
}

class KkDate {
	/**
	 * Constructs a KkDate instance with the given input and format.
	 *
	 * @param {string|Date|KkDate|number} date - The input value. Can be:
	 *  - a date string (e.g. "2024-01-15", "15.01.2024"),
	 *  - a native Date object,
	 *  - another KkDate instance,
	 *  - a numeric Unix timestamp (≤10 digits treated as seconds, >10 digits as milliseconds).
	 *
	 * @param {string} [date_format] - Optional format hint for parsing the date string.
	 * Supported formats include: `"YYYY-MM-DD"`, `"DD.MM.YYYY"`, `"YYYY-MM-DD HH:mm:ss"`, etc.
	 */
	constructor(...params) {
		let is_can_cache = true;
		let cached = false;
		this.detected_format = null;
		this.temp_config = EMPTY_TEMP_CONFIG;
		// Formatter config-signature cache slot (-1 = not computed yet); see formatSig().
		this._fmt_sig = -1;
		this._fmt_sig_v = -1;
		if (params.length === 0) {
			this.date = new Date();
			this.detected_format = 'now';
		} else {
			const date = params[0];
			let forced_format_founded = false;
			if (cachingEnabled) {
				cached = nopeRedis.getItem(date instanceof Date || Number.isInteger(date) ? null : `${date}`);
			}
			if (typeof params[1] === 'string' && !cached) {
				if (!format_types_regex[params[1]]) {
					throw new Error(`Unsupported Format! ${params[1]} !`);
				}
				if (!format_types_regex[params[1]].test(params[0])) {
					throw new Error(`Invalid format ! ${format_types[params[1]]} !`);
				}
				if (params[1] === format_types['YYYY-DD-MM']) {
					is_can_cache = true;
					const [year, day, month] = date.split('-');
					this.date = fastLocalDate(year, month, day);
					forced_format_founded = true;
					this.detected_format = 'YYYY-DD-MM';
				} else if (params[1] === format_types['YYYY-MM-DD']) {
					is_can_cache = true;
					if (typeof date === 'string' && date.length === 10) {
						this.date = new Date(cc4(date, 0), cc2(date, 5) - 1, cc2(date, 8), 0, 0, 0, 0);
					} else {
						const [year, month, day] = date.split('-');
						this.date = fastLocalDate(year, month, day);
					}
					forced_format_founded = true;
					this.detected_format = 'YYYY-MM-DD';
				} else if (params[1] === format_types['mm:ss']) {
					// Time-only value on today's date, like the bare time formats below. Not cached:
					// the cache key is the raw input, and e.g. '03:45' means 03h45 when auto-detected
					// but 3m45s here — sharing one key would poison the other interpretation.
					is_can_cache = false;
					const time_str = typeof date === 'string' ? date : `${date}`;
					const d = new Date();
					d.setHours(0, cc2(time_str, 0), cc2(time_str, 3), 0);
					this.date = d;
					forced_format_founded = true;
					this.detected_format = format_types['mm:ss'];
				}
			}
			if (!forced_format_founded && !cached) {
				is_can_cache = false;
				if (typeof date === 'string') {
					is_can_cache = parseStringInput(this, date);
				} else if (Number.isInteger(date)) {
					const stringed_date_length = `${date}`.length;
					if (stringed_date_length <= 10) {
						// Unix timestamp (seconds) - always create as UTC
						this.date = new Date(date * 1000);
					} else {
						// JavaScript timestamp (milliseconds) - always create as UTC
						this.date = new Date(date);
					}
					this.detected_format = 'Xx';
				} else if (date instanceof KkDate) {
					// Clone from another KkDate - preserve the exact time
					this.date = new Date(date.date.getTime());
					this.detected_format = 'kkDate';
				} else if (date instanceof Date) {
					// Clone from Date object - preserve the exact time
					this.date = new Date(date.getTime());
					this.detected_format = 'now';
				} else {
					// Exotic inputs (null, floats, plain objects): parse their string coercion —
					// the legacy ladder validated the same coercion before running its bodies, and
					// non-parseable values still end at the native Invalid Date throw below.
					is_can_cache = parseStringInput(this, `${date}`);
				}
			}

			if (is_can_cache && cached) {
				// Restore detected_format alongside the instant: it drives timezone
				// reinterpretation and UTC formatting, so a hit must behave like the parse it cached.
				this.date = new Date(cached.t);
				this.detected_format = cached.f;
			} else {
				// Inline isInvalid(): this.date is always a Date here, so the helper's
				// try/catch adds nothing. The thrown error must stay byte-identical.
				if (!this.date || Number.isNaN(this.date.getTime())) {
					throw new Error('Invalid Date');
				}
				if (is_can_cache && cachingEnabled) {
					nopeRedis.setItemSync(`${date}`, { t: this.date.getTime(), f: this.detected_format });
				}
			}
		}
		// parseWithTimezone() can only change the date while the global timezone differs from
		// the system timezone (a fresh instance never has temp_config.timezone) — skip it otherwise.
		if (timezone_shift_enabled) {
			this.date = parseWithTimezone(this);
		}
	}

	/**
	 * returns native Date getTime value
	 *
	 * @returns {number|Error}
	 */
	getTime() {
		isInvalid(this.date);
		return this.date.getTime();
	}

	/**
	 * Optimized helper to get timestamp from various input types
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {number}
	 */
	_getTimestamp(date) {
		if (isKkDate(date) || date instanceof Date) {
			return date.getTime();
		}
		if (Number.isInteger(date)) {
			return date <= 10 ? date * 1000 : date;
		}
		// Only create KkDate instance for string inputs
		return new KkDate(date).getTime();
	}

	/**
	 * isBefore
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isBefore(date) {
		return this.getTime() < this._getTimestamp(date);
	}

	/**
	 * isSameOrBefore
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSameOrBefore(date) {
		return this.getTime() <= this._getTimestamp(date);
	}

	/**
	 * isAfter
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isAfter(date) {
		return this.date.getTime() > this._getTimestamp(date);
	}

	/**
	 * isSameOrAfter
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSameOrAfter(date) {
		return this.date.getTime() >= this._getTimestamp(date);
	}

	/**
	 * isSame
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSame(date) {
		return this.date.getTime() === this._getTimestamp(date);
	}

	/**
	 * isBetween
	 *
	 * @param {string|Date|KkDate} start - start date/datetime/time
	 * @param {string|Date|KkDate} end - end date/datetime/time
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} [unit='milliseconds']
	 * @returns {boolean|Error}
	 */
	isBetween(start, end, unit = 'milliseconds') {
		const starts = isKkDate(start) ? start.getTime() : new KkDate(start).getTime();
		const ends = isKkDate(end) ? end.getTime() : new KkDate(end).getTime();
		const date_time = this.date.getTime();

		if (unit === 'milliseconds') {
			return date_time >= starts && date_time <= ends;
		}

		if (!timeInMilliseconds[unit]) {
			throw new Error('Invalid unit type. Must be one of: milliseconds, seconds, minutes, hours, days, months, years');
		}

		const startUnit = Math.floor(starts / timeInMilliseconds[unit]);
		const endUnit = Math.floor(ends / timeInMilliseconds[unit]);
		const dateUnit = Math.floor(date_time / timeInMilliseconds[unit]);

		return dateUnit >= startUnit && dateUnit <= endUnit;
	}

	/**
	 * returns string of date
	 *
	 * @returns {string|Error}
	 */
	toString() {
		isInvalid(this.date);
		return this.date.toString();
	}

	/**
	 * The toDateString() method of Date instances returns a string representing the date portion of this date interpreted in the local timezone.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toDateString
	 * @returns {string|Error}
	 */
	toDateString() {
		isInvalid(this.date);
		return this.date.toDateString();
	}

	/**
	 * The toISOString() method of Date instances returns a string representing this date in the date time string format, a simplified format based on ISO 8601, which is always 24 or 27 characters long (YYYY-MM-DDTHH:mm:ss.sssZ or ±YYYYYY-MM-DDTHH:mm:ss.sssZ, respectively). The timezone is always UTC, as denoted by the suffix Z.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
	 *
	 * @returns {string|Error}
	 */
	toISOString() {
		isInvalid(this.date);
		return this.date.toISOString();
	}

	/**
	 * The toJSON() method of Date instances returns a string representing this date in the same ISO format as toISOString().
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON
	 *
	 * @returns {Object|Error}
	 */
	toJSON() {
		isInvalid(this.date);
		return this.date.toJSON();
	}

	/**
	 * The toUTCString() method of Date instances returns a string representing this date in the RFC 7231 format, with negative years allowed. The timezone is always UTC. toGMTString() is an alias of this method.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toUTCString
	 *
	 * @returns {string|Error}
	 */
	toUTCString() {
		isInvalid(this.date);
		return this.date.toUTCString();
	}

	/**
	 * The locale and options parameters customize the behavior of the function and let applications specify the language whose formatting conventions should be used.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
	 *
	 * @param {object} options
	 * @returns {string|Error}
	 */
	toLocaleDateString(options) {
		isInvalid(this.date);
		if (!this.temp_config) {
			this.temp_config = {
				locale: global_config.locale || 'en-en',
				rtf: {},
			};
		}
		return this.date.toLocaleDateString(this.temp_config.locale, options);
	}

	/**
	 * The toLocaleString() method of Date instances returns a string with a language-sensitive representation of this date in the local timezone. In implementations with Intl.DateTimeFormat API support, this method simply calls Intl.DateTimeFormat.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
	 *
	 * @param {object} options
	 * @returns {string|Error}
	 */
	toLocaleString(options) {
		isInvalid(this.date);
		if (!this.temp_config) {
			this.temp_config = {
				locale: global_config.locale || 'en-en',
				rtf: {},
			};
		}
		return this.date.toLocaleString(this.temp_config.locale, options);
	}

	/**
	 * The toLocaleTimeString() method of Date instances returns a string with a language-sensitive representation of the time portion of this date in the local timezone. In implementations with Intl.DateTimeFormat API support, this method simply calls Intl.DateTimeFormat.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString
	 *
	 * @param {object} options
	 * @returns {string|Error}
	 */
	toLocaleTimeString(options) {
		isInvalid(this.date);
		if (!this.temp_config) {
			this.temp_config = {
				locale: global_config.locale || 'en-en',
				rtf: {},
			};
		}
		return this.date.toLocaleTimeString(this.temp_config.locale, options);
	}

	/**
	 * The toTimeString() method of Date instances returns a string representing the time portion of this date interpreted in the local timezone.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toTimeString
	 *
	 * @returns {string|Error}
	 */
	toTimeString() {
		isInvalid(this.date);
		return this.date.toTimeString();
	}

	/**
	 * The valueOf() method of Date instances returns the number of milliseconds for this date since the epoch, which is defined as the midnight at the beginning of January 1, 1970, UTC.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/valueOf
	 *
	 * @returns {number|Error}
	 */
	valueOf() {
		isInvalid(this.date);
		return this.date.valueOf();
	}

	/**
	 * valueOfLocal() locale value of giving
	 *
	 * @param {boolean} [check_error=true]
	 * @returns {number}
	 */
	valueOfLocal(check_error = true) {
		if (check_error) {
			isInvalid(this.date);
		}
		const utcTime = this.date.getTime();
		const kk_ofset = this.date.getTimezoneOffset() * 60 * 1000;
		const global_timezone = getTimezoneOffset(global_config.timezone);
		const total = global_timezone + kk_ofset;
		return utcTime - total;
	}

	/**
	 * This is a pretty robust function for adding and subtracting time to an existing moment. To add time, specify the key of the time unit you want to add and the amount you want to add. Similarly, to subtract time, use the same key to subtract the amount of time.
	 *
	 * @param {number} amount
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @returns {KkDate}
	 */
	add(amount, type) {
		isInvalid(this.date);

		if (typeof amount === 'number' && amount === 0) {
			return this;
		}

		if (typeof amount !== 'number' || (typeof amount !== 'number' && typeof amount === 'object' && amount.$kk_date === undefined)) {
			throw new Error('amount is wrong');
		}

		let defined_amount = amount;
		let defined_type = type;

		if (typeof amount === 'object' && amount.$kk_date) {
			defined_type = 'seconds';
			defined_amount = amount.$kk_date.milliseconds / 1000;
		}

		const targetTimezone = this.temp_config.timezone || global_config.timezone;
		let dateToModify = this.date;
		let offset = 0;

		if (targetTimezone) {
			offset = offsetForCalc(targetTimezone, this.date);
			dateToModify = new Date(this.date.getTime() + offset);
		}

		switch (defined_type) {
			case 'days':
				if (targetTimezone) {
					dateToModify.setUTCDate(dateToModify.getUTCDate() + defined_amount);
				} else {
					dateToModify.setDate(dateToModify.getDate() + defined_amount);
				}
				break;
			case 'weeks':
				if (targetTimezone) {
					dateToModify.setUTCDate(dateToModify.getUTCDate() + defined_amount * 7);
				} else {
					dateToModify.setDate(dateToModify.getDate() + defined_amount * 7);
				}
				break;
			case 'minutes':
				if (targetTimezone) {
					dateToModify.setUTCMinutes(dateToModify.getUTCMinutes() + defined_amount);
				} else {
					dateToModify.setMinutes(dateToModify.getMinutes() + defined_amount);
				}
				break;
			case 'seconds':
				if (targetTimezone) {
					dateToModify.setUTCSeconds(dateToModify.getUTCSeconds() + defined_amount);
				} else {
					dateToModify.setSeconds(dateToModify.getSeconds() + defined_amount);
				}
				break;
			case 'hours':
				if (targetTimezone) {
					dateToModify.setUTCHours(dateToModify.getUTCHours() + defined_amount);
				} else {
					dateToModify.setHours(dateToModify.getHours() + defined_amount);
				}
				break;
			case 'months': {
				if (targetTimezone) {
					const currentDate = dateToModify.getUTCDate();
					const currentMonth = dateToModify.getUTCMonth();
					dateToModify.setUTCDate(1);
					dateToModify.setUTCMonth(currentMonth + defined_amount);
					const lastDay = new Date(Date.UTC(dateToModify.getUTCFullYear(), dateToModify.getUTCMonth() + 1, 0)).getUTCDate();
					dateToModify.setUTCDate(Math.min(currentDate, lastDay));
				} else {
					const currentDate = dateToModify.getDate();
					const currentMonth = dateToModify.getMonth();
					dateToModify.setDate(1);
					dateToModify.setMonth(currentMonth + defined_amount);
					const lastDay = new Date(dateToModify.getFullYear(), dateToModify.getMonth() + 1, 0).getDate();
					dateToModify.setDate(Math.min(currentDate, lastDay));
				}
				break;
			}
			case 'years': {
				const year_amount = defined_amount * 12;
				if (targetTimezone) {
					dateToModify.setUTCMonth(dateToModify.getUTCMonth() + year_amount);
				} else {
					dateToModify.setMonth(dateToModify.getMonth() + year_amount);
				}
				break;
			}
			default:
				throw new Error('type is wrong');
		}

		if (targetTimezone) {
			// Recalculate offset for the new date (DST may have changed)
			const newOffset = offsetForCalc(targetTimezone, dateToModify);
			this.date = new Date(dateToModify.getTime() - newOffset);
		}
		return this;
	}
	/**
	 * Calculates the difference between this date (start) and the given end date.
	 * @param {string|Date|KkDate|number} end
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type
	 * @param {boolean} [is_decimal=false]
	 * @returns {number}
	 */
	diff(end, type, is_decimal = false) {
		return diff(this, end, type, is_decimal, true);
	}

	/**
	 * Returns an array of formatted date strings between this date (start) and the given end date,
	 * stepping by the given unit.
	 * @param {string|Date|KkDate|number} end
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type
	 * @param {string} [template='YYYY-MM-DD']
	 * @returns {string[]}
	 */
	diff_range(end, type, template = format_types['YYYY-MM-DD']) {
		const diffed = diff(this, end, type);
		const rangeDates = [];
		rangeDates.push(formatter(this, template));
		const targetTimezone = this.temp_config.timezone || global_config.timezone;

		for (let index = 1; index < diffed.diffTime + 1; index++) {
			let date = new Date(this.date.getTime());

			if (targetTimezone) {
				const offset = offsetForCalc(targetTimezone, this.date);
				const dateToModify = new Date(date.getTime() + offset);
				dateToModify.setUTCSeconds(dateToModify.getUTCSeconds() + diffed.type_value * index);
				date = new Date(dateToModify.getTime() - offset);
			} else {
				date.setSeconds(date.getSeconds() + diffed.type_value * index);
			}

			const newKkDateInstance = new KkDate(date);
			newKkDateInstance.temp_config = this.temp_config;
			rangeDates.push(formatter(newKkDateInstance, template));
		}
		return rangeDates;
	}

	/**
	 * set method of Date instances changes
	 *
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @param {number} value
	 * @returns {KkDate}
	 */
	set(type, value) {
		const targetTimezone = this.temp_config.timezone || global_config.timezone;
		let dateToModify = this.date;
		let offset = 0;

		if (targetTimezone) {
			offset = offsetForCalc(targetTimezone, this.date);
			dateToModify = new Date(this.date.getTime() + offset);
		}

		switch (type) {
			case 'seconds':
				if (targetTimezone) {
					dateToModify.setUTCSeconds(value);
				} else {
					dateToModify.setSeconds(value);
				}
				break;
			case 'minutes':
				if (targetTimezone) {
					dateToModify.setUTCMinutes(value);
				} else {
					dateToModify.setMinutes(value);
				}
				break;
			case 'hours':
				if (targetTimezone) {
					dateToModify.setUTCHours(value);
				} else {
					dateToModify.setHours(value);
				}
				break;
			case 'days':
				if (targetTimezone) {
					dateToModify.setUTCDate(value);
				} else {
					dateToModify.setDate(value);
				}
				break;
			case 'months':
				if (targetTimezone) {
					dateToModify.setUTCMonth(value);
				} else {
					dateToModify.setMonth(value);
				}
				break;
			case 'years':
				if (targetTimezone) {
					dateToModify.setUTCFullYear(value);
				} else {
					dateToModify.setFullYear(value);
				}
				break;
			default:
				throw new Error('type wrong');
		}

		if (targetTimezone) {
			this.date = new Date(dateToModify.getTime() - offset);
		}
		return this;
	}

	/**
	 * get method of Date instances
	 *
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @returns {number}
	 */
	get(type) {
		const targetTimezone = this.temp_config.timezone || global_config.timezone;
		let dateToRead = this.date;

		if (targetTimezone) {
			const offset = offsetForCalc(targetTimezone, this.date);
			dateToRead = new Date(this.date.getTime() + offset);
		}

		switch (type) {
			case 'seconds':
				return targetTimezone ? dateToRead.getUTCSeconds() : dateToRead.getSeconds();
			case 'minutes':
				return targetTimezone ? dateToRead.getUTCMinutes() : dateToRead.getMinutes();
			case 'hours':
				return targetTimezone ? dateToRead.getUTCHours() : dateToRead.getHours();
			case 'days':
				return targetTimezone ? dateToRead.getUTCDate() : dateToRead.getDate();
			case 'months':
				return targetTimezone ? dateToRead.getUTCMonth() : dateToRead.getMonth();
			case 'years':
				return targetTimezone ? dateToRead.getUTCFullYear() : dateToRead.getFullYear();
			default:
				throw new Error('type is wrong');
		}
	}

	/**
	 * Formats the date according to the given template.
	 * Templates are compiled dynamically, so any combination of the supported tokens works,
	 * with [bracketed] literal text. Full moment/dayjs display-token vocabulary:
	 * year YYYY YY, month MMMM MMM MM Mo M, quarter Q Qo, day DD Do D,
	 * day of year DDDD DDDo DDD, weekday dddd ddd dd do d e E,
	 * week of year ww wo w + week-year gggg gg (weekStartDay-based, week 1 contains Jan 1),
	 * ISO week WW Wo W + ISO week-year GGGG GG, hour HH H hh h kk k,
	 * minute mm m, second ss s, fractional seconds S..SSSSSSSSS, meridiem A a,
	 * timezone Z ZZ z zz zzz and unix X x.
	 * A template with no recognizable token throws `Error('template is not right')`.
	 * Returns a `number` for the whole templates `'X'` (Unix seconds) and `'x'` (Unix
	 * milliseconds); inside larger templates X/x render as digit strings.
	 * Passing `null` or calling with no argument returns an ISO-style string with timezone offset (e.g. "2024-01-15T10:30:00+03:00").
	 *
	 * @param {string|null} [template] - Format template, e.g. 'YYYY-MM-DD', '[Week] w [of] gggg', 'DD.MM.YYYY HH:mm Z'
	 * @returns {string|number}
	 */
	format(template) {
		return formatter(this, template);
	}

	/**
	 * @description kk-date config for in call
	 * @param {object} options
	 * @param {string} options.locale BCP 47 language tag
	 * @param {string} options.timezone timezone
	 * @param {0|1|2|3|4|5|6} options.weekStartDay - The day of the week to start from (0 = Sunday, 1 = Monday ...)
	 * @returns {Error|KkDate}
	 */
	config(options) {
		ownTempConfig(this);
		if (options.timezone) {
			this.temp_config.timezone = options.timezone;
			this.temp_config.rtf = {};
			this._fmt_sig = -1;
		}
		if (typeof options.weekStartDay === 'number') {
			isValidWeekStartDay(options.weekStartDay);
			this.temp_config.weekStartDay = options.weekStartDay;
			// week tokens (w/ww/wo/gg/gggg/e) depend on the week start
			this._fmt_sig = -1;
		}
		try {
			if (options.locale) {
				this.temp_config.locale = options.locale;
				this._fmt_sig = -1;
				if (typeof Intl?.RelativeTimeFormat === 'function') {
					this.temp_config.rtf[options.locale] = new Intl.RelativeTimeFormat(options.locale, { numeric: 'auto' });
				}
				if (cached_dateTimeFormat.temp['dddd'][options.locale] && cached_dateTimeFormat.temp['dd'][options.locale]) {
					return this;
				}
				if (typeof Intl?.Locale === 'function') {
					new Intl.Locale(options.locale);
				}
				if (!cached_dateTimeFormat.temp['dddd'][options.locale]) {
					cached_dateTimeFormat.temp['dddd'][options.locale] = new Intl.DateTimeFormat(options.locale, {
						weekday: 'long',
					});
				}
				if (!cached_dateTimeFormat.temp['ddd'][options.locale]) {
					cached_dateTimeFormat.temp['ddd'][options.locale] = new Intl.DateTimeFormat(options.locale, {
						weekday: 'short',
					});
				}
				if (!cached_dateTimeFormat.temp['dd'][options.locale]) {
					cached_dateTimeFormat.temp['dd'][options.locale] = new Intl.DateTimeFormat(options.locale, {
						weekday: 'short',
					});
				}
				if (!cached_dateTimeFormat.temp['MMMM'][options.locale]) {
					cached_dateTimeFormat.temp['MMMM'][options.locale] = new Intl.DateTimeFormat(options.locale, {
						month: 'long',
					});
				}
				if (!cached_dateTimeFormat.temp['MMM'][options.locale]) {
					cached_dateTimeFormat.temp['MMM'][options.locale] = new Intl.DateTimeFormat(options.locale, { month: 'short' });
				}
			}
		} catch {
			throw new Error('locale not valid for BCP 47, config error !');
		}
		return this;
	}

	/**
	 * returns boolean about invalid date or not
	 * if invalid will be turn false
	 *
	 * @returns {boolean}
	 */
	isValid() {
		// Direct boolean equivalent of isInvalid(this.date) without the throw/catch round-trip,
		// so the invalid path allocates no Error object.
		return !!this.date && !Number.isNaN(this.date.valueOf());
	}

	/**
	 * returns native Date Object
	 *
	 * @returns {Date|Error}
	 */
	getDate() {
		isInvalid(this.date);
		return this.date;
	}

	/**
	 * @description It divides the date string into parts and returns an object.
	 * @param {number} time - Duration in seconds
	 * @returns {{years: number, months: number, weeks: number, days: number, hours: number, minutes: number, seconds: number}}
	 */
	duration(time) {
		return duration(time, 'seconds');
	}

	/**
	 * Convert to timezone
	 * @param {string} timezone
	 * @returns
	 */
	tz(timezone) {
		checkTimezone(timezone);
		ownTempConfig(this).timezone = timezone;
		this._fmt_sig = -1;
		this.date = parseWithTimezone(this);
		return this;
	}

	/**
	 * @description Get timezone information including DST status
	 * @param {string} timezone - IANA timezone identifier (optional, uses current timezone if not provided)
	 * @returns {object} - Timezone information
	 */
	getTimezoneInfo(timezone = null) {
		const targetTimezone = timezone || this.temp_config.timezone || global_config.timezone;
		return getTimezoneInfo(targetTimezone, this.date);
	}

	/**
	 * @description Check if current date is in DST
	 * @param {string} timezone - IANA timezone identifier (optional, uses current timezone if not provided)
	 * @returns {boolean} - True if DST is active
	 */
	isDST(timezone = null) {
		const targetTimezone = timezone || this.temp_config.timezone || global_config.timezone;
		return isDST(targetTimezone, this.date);
	}

	/**
	 * @description Get timezone abbreviation
	 * @param {string} timezone - IANA timezone identifier (optional, uses current timezone if not provided)
	 * @returns {string} - Timezone abbreviation
	 */
	getTimezoneAbbreviation(timezone = null) {
		const targetTimezone = timezone || this.temp_config.timezone || global_config.timezone;
		return getTimezoneAbbreviation(targetTimezone, this.date);
	}

	/**
	 * @description Returns startOf date of the unit of time.
	 * @param {'years'|'months'|'weeks'|'days'|'hours'|'minutes'|'seconds'} unit
	 * @returns {KkDate}
	 */
	startOf(unit) {
		const targetTimezone = this.temp_config.timezone || global_config.timezone;
		let dateToModify = this.date;
		let offset = 0;

		if (targetTimezone) {
			offset = offsetForCalc(targetTimezone, this.date);
			dateToModify = new Date(this.date.getTime() + offset);
		}

		switch (unit) {
			case 'years':
				if (targetTimezone) {
					dateToModify.setUTCMonth(0, 1);
					dateToModify.setUTCHours(0, 0, 0, 0);
				} else {
					dateToModify.setMonth(0, 1);
					dateToModify.setHours(0, 0, 0, 0);
				}
				break;
			case 'months':
				if (targetTimezone) {
					dateToModify.setUTCDate(1);
					dateToModify.setUTCHours(0, 0, 0, 0);
				} else {
					dateToModify.setDate(1);
					dateToModify.setHours(0, 0, 0, 0);
				}
				break;
			case 'weeks': {
				const dayOfWeek = targetTimezone ? dateToModify.getUTCDay() : dateToModify.getDay();
				const weekStartDay = this.temp_config.weekStartDay || global_config.weekStartDay;
				const diff = dayOfWeek < weekStartDay ? dayOfWeek + (7 - weekStartDay) : dayOfWeek - weekStartDay;
				if (targetTimezone) {
					dateToModify.setUTCDate(dateToModify.getUTCDate() - diff);
					dateToModify.setUTCHours(0, 0, 0, 0);
				} else {
					dateToModify.setDate(dateToModify.getDate() - diff);
					dateToModify.setHours(0, 0, 0, 0);
				}
				break;
			}
			case 'days':
				if (targetTimezone) {
					dateToModify.setUTCHours(0, 0, 0, 0);
				} else {
					dateToModify.setHours(0, 0, 0, 0);
				}
				break;
			case 'hours':
				if (targetTimezone) {
					dateToModify.setUTCMinutes(0, 0, 0);
				} else {
					dateToModify.setMinutes(0, 0, 0);
				}
				break;
			case 'minutes':
				if (targetTimezone) {
					dateToModify.setUTCSeconds(0, 0);
				} else {
					dateToModify.setSeconds(0, 0);
				}
				break;
			case 'seconds':
				if (targetTimezone) {
					dateToModify.setUTCMilliseconds(0);
				} else {
					dateToModify.setMilliseconds(0);
				}
				break;
			default:
				throw new Error(`Invalid unit for startOf: ${unit}`);
		}

		if (targetTimezone) {
			// Recalculate offset for the new date (DST may have changed)
			const newOffset = offsetForCalc(targetTimezone, dateToModify);
			this.date = new Date(dateToModify.getTime() - newOffset);
		}
		return this;
	}

	/**
	 * @description returns endOf date of the unit of time.
	 * @param {'years'|'months'|'weeks'|'days'|'hours'|'minutes'|'seconds'} unit
	 * @returns {KkDate}
	 */
	endOf(unit) {
		const targetTimezone = this.temp_config.timezone || global_config.timezone;
		let dateToModify = this.date;
		let offset = 0;

		if (targetTimezone) {
			offset = offsetForCalc(targetTimezone, this.date);
			dateToModify = new Date(this.date.getTime() + offset);
		}

		switch (unit) {
			case 'years':
				if (targetTimezone) {
					dateToModify.setUTCMonth(11, 31);
					dateToModify.setUTCHours(23, 59, 59, 999);
				} else {
					dateToModify.setMonth(11, 31);
					dateToModify.setHours(23, 59, 59, 999);
				}
				break;
			case 'months': {
				if (targetTimezone) {
					const year = dateToModify.getUTCFullYear();
					const month = dateToModify.getUTCMonth();
					dateToModify.setUTCDate(new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
					dateToModify.setUTCHours(23, 59, 59, 999);
				} else {
					const year = dateToModify.getFullYear();
					const month = dateToModify.getMonth();
					dateToModify.setDate(new Date(year, month + 1, 0).getDate());
					dateToModify.setHours(23, 59, 59, 999);
				}
				break;
			}
			case 'weeks': {
				if (targetTimezone) {
					// Reuse startOf logic for consistency
					const dayOfWeek = dateToModify.getUTCDay();
					const weekStartDay = this.temp_config.weekStartDay || global_config.weekStartDay;
					const diff = dayOfWeek < weekStartDay ? dayOfWeek + (7 - weekStartDay) : dayOfWeek - weekStartDay;
					dateToModify.setUTCDate(dateToModify.getUTCDate() - diff + 6);
					dateToModify.setUTCHours(23, 59, 59, 999);
				} else {
					this.startOf('weeks');
					this.date.setDate(this.date.getDate() + 6);
					this.date.setHours(23, 59, 59, 999);
					return this;
				}
				break;
			}
			case 'days':
				if (targetTimezone) {
					dateToModify.setUTCHours(23, 59, 59, 999);
				} else {
					dateToModify.setHours(23, 59, 59, 999);
				}
				break;
			case 'hours':
				if (targetTimezone) {
					dateToModify.setUTCMinutes(59, 59, 999);
				} else {
					dateToModify.setMinutes(59, 59, 999);
				}
				break;
			case 'minutes':
				if (targetTimezone) {
					dateToModify.setUTCSeconds(59, 999);
				} else {
					dateToModify.setSeconds(59, 999);
				}
				break;
			case 'seconds':
				if (targetTimezone) {
					dateToModify.setUTCMilliseconds(999);
				} else {
					dateToModify.setMilliseconds(999);
				}
				break;
			default:
				throw new Error(`Invalid unit for endOf: ${unit}`);
		}

		if (targetTimezone) {
			// Recalculate offset for the new date (DST may have changed)
			const newOffset = offsetForCalc(targetTimezone, dateToModify);
			this.date = new Date(dateToModify.getTime() - newOffset);
		}
		return this;
	}

	/**
	 * @description Returns the relative time from now.
	 * @returns {string|Error} - "5 minutes ago"
	 */
	fromNow() {
		isInvalid(this.date);

		const now = Date.now();
		const diffMs = this.date.getTime() - now;
		const diffSeconds = Math.round(diffMs / 1000);
		const diffMinutes = Math.round(diffSeconds / 60);
		const diffHours = Math.round(diffMinutes / 60);
		const diffDays = Math.round(diffHours / 24);
		const diffMonths = Math.round(diffDays / 30.44); // approx. 30.44 days in a month
		const diffYears = Math.round(diffDays / 365.25); // include leap years approx.

		const locale = this.temp_config?.locale || global_config.locale || 'en';

		let rtf = this.temp_config.rtf[locale] || global_config.rtf[locale];

		if (!rtf) {
			if (typeof Intl?.RelativeTimeFormat !== 'function') {
				throw new Error(`fromNow() requires Intl.RelativeTimeFormat which is not available in this environment.`);
			}
			try {
				rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
				ownTempConfig(this).rtf[locale] = rtf;
			} catch (error) {
				throw new Error(`Failed to create Intl.RelativeTimeFormat for locale "${locale}": ${error.message || 'Unkown Error'}.`);
			}
		}

		let value;
		let unit; // ! READ: unit must be validate for .format !

		// Determine the best unit to display
		if (Math.abs(diffSeconds) < 45) {
			value = diffSeconds;
			unit = 'second';
		} else if (Math.abs(diffMinutes) < 45) {
			value = diffMinutes;
			unit = 'minute';
		} else if (Math.abs(diffHours) < 22) {
			value = diffHours;
			unit = 'hour';
		} else if (Math.abs(diffDays) < 26) {
			value = diffDays;
			unit = 'day';
		} else if (Math.abs(diffMonths) < 11) {
			value = diffMonths;
			unit = 'month';
		} else {
			value = diffYears;
			unit = 'year';
		}

		try {
			return rtf.format(value, unit);
		} catch (error) {
			throw new Error(`couldn't format relative time: ${error.message || 'Unknown Error'}`);
		}
	}
}

/**
 *
 * @param {KkDate.date|Date} date
 * @returns
 */
function isInvalid(date) {
	try {
		if (!date) {
			throw new Error('Invalid Date');
		}
		if (Number.isNaN(date.valueOf())) {
			throw new Error('Invalid Date');
		}
	} catch {
		throw new Error('Invalid Date');
	}
	return true;
}

/**
 * isKkDate
 *
 * @param {KkDate} value
 * @returns {boolean}
 */
function isKkDate(value = {}) {
	if (value instanceof KkDate) {
		return true;
	}
	return false;
}

/**
 *
 * @param {string|Date|KkDate} start
 * @param {string|Date|KkDate} end
 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
 * @param {boolean} is_decimal
 * @returns {object}
 */
function diff(start, end, type, is_decimal = false, turn_difftime = false) {
	const startDate = start.getTime();
	const endDate = new KkDate(end).getTime();
	let type_value = 0;
	switch (type) {
		case 'seconds':
			type_value = 1;
			break;
		case 'minutes':
			type_value = 60;
			break;
		case 'hours':
			type_value = 3600;
			break;
		case 'days':
			type_value = 86400;
			break;
		case 'months':
			type_value = 2629800;
			break;
		case 'years':
			type_value = 31557600;
			break;
		default:
			throw new Error('invalid type for diff');
	}
	const diffTime_value = (endDate - startDate) / 1000 / type_value;
	if (turn_difftime) {
		return is_decimal ? diffTime_value : absFloor(diffTime_value);
	}
	return {
		type_value,
		diffTime: is_decimal ? diffTime_value : absFloor(diffTime_value),
	};
}

// Formatter result cache, two levels: outer key is the template (an interned
// literal, cheap to hash), inner key packs timestamp and config signature into
// one number — no per-call key string is built on the hot path.
// A config signature interns the resolved (timezone, locale, detected_format,
// weekStartDay) tuple to a small int, cached per instance and recomputed when
// the instance's temp_config or the global config changes (format_config_version).
let formatter_cache_count = 0;
let format_config_version = 0;
const format_sig_intern = new Map();

function formatSig(orj_this) {
	const timezone = orj_this.temp_config.timezone || global_config.timezone || 'none';
	const locale = orj_this.temp_config.locale || global_config.locale || 'none';
	// weekStartDay feeds the w/ww/wo/gg/gggg/e tokens — cached results must not
	// survive a week-start change. ?? so an instance override of 0 wins.
	const weekStartDay = orj_this.temp_config.weekStartDay ?? global_config.weekStartDay ?? 0;
	const key = `${timezone}_${locale}_${orj_this.detected_format || 'none'}_${weekStartDay}`;
	let sig = format_sig_intern.get(key);
	if (sig === undefined) {
		if (format_sig_intern.size >= 1024) {
			// Sig ids are baked into cached sub-keys and per-instance caches:
			// reset everything together so stale ids can never collide.
			format_sig_intern.clear();
			formatter_cache.clear();
			formatter_cache_count = 0;
			format_config_version++;
		}
		sig = format_sig_intern.size;
		format_sig_intern.set(key, sig);
	}
	orj_this._fmt_sig = sig;
	orj_this._fmt_sig_v = format_config_version;
	return sig;
}

/**
 *
 * @param {Date} this.date
 * @param {string} template
 * @returns {string}
 */
function formatter(orj_this, template = null) {
	isInvalid(orj_this.date);

	const timestamp = orj_this.date.getTime();

	// Unix timestamp templates need only the timestamp — return before touching the cache.
	if (template === 'x') {
		// Unix timestamp in milliseconds - always UTC, no timezone conversion
		return timestamp;
	}
	if (template === 'X') {
		// Unix timestamp in seconds - always UTC, no timezone conversion
		return Math.floor(timestamp / 1000);
	}

	let sig = orj_this._fmt_sig;
	if (sig < 0 || orj_this._fmt_sig_v !== format_config_version) {
		sig = formatSig(orj_this);
	}
	// |timestamp| < 2^43 (±year ~2248) packs losslessly into ts*1024+sig; anything
	// beyond falls back to a string sub-key.
	const subKey = timestamp < 8796093022208 && timestamp > -8796093022208 ? timestamp * 1024 + sig : `${timestamp}_${sig}`;

	let byTemplate = formatter_cache.get(template);
	if (byTemplate !== undefined) {
		const cachedResult = byTemplate.get(subKey);
		if (cachedResult !== undefined) {
			return cachedResult;
		}
	} else {
		byTemplate = new Map();
		formatter_cache.set(template, byTemplate);
	}

	// Limit total cached results to prevent memory leaks
	if (formatter_cache_count > 10000) {
		formatter_cache.clear();
		formatter_cache_count = 0;
		byTemplate = new Map();
		formatter_cache.set(template, byTemplate);
	}

	// Determine if this is a UTC date (ISO8601 format) or if timezone is explicitly UTC
	const timezone = orj_this.temp_config.timezone || global_config.timezone;
	const isUTC = orj_this.detected_format === 'ISO8601' || timezone === 'UTC';

	const result = _formatterCore(orj_this, template, isUTC);

	// Store result in cache
	byTemplate.set(subKey, result);
	formatter_cache_count++;
	return result;
}

/**
 * UTC offset in minutes of the instance's target timezone at its instant
 * (temp_config over global_config; system offset when neither is set).
 *
 * @param {KkDate} orj_this
 * @returns {number}
 */
function getTargetOffsetMinutes(orj_this) {
	const targetTimezone = orj_this.temp_config.timezone || global_config.timezone;
	if (targetTimezone) {
		if (targetTimezone === 'UTC') {
			return 0;
		}
		return getTimezoneOffset(targetTimezone, orj_this.date) / 60000;
	}
	return -orj_this.date.getTimezoneOffset();
}

/**
 * Renders offset minutes as ±HH<separator>mm (Z → '+03:00', ZZ → '+0300').
 *
 * @param {number} offsetMinutes
 * @param {string} separator
 * @returns {string}
 */
function formatUtcOffset(offsetMinutes, separator) {
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const absOffset = Math.abs(offsetMinutes);
	return `${sign}${padZero(Math.floor(absOffset / 60))}${separator}${padZero(absOffset % 60)}`;
}

function _formatterCore(orj_this, template, isUTC) {
	if (template === null) {
		// When template is null, always return YYYY-MM-DDTHH:mm:ss format with timezone offset
		const timezoneOffset = getTargetOffsetMinutes(orj_this);
		const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes', 'seconds'], {
			isUTC,
			detectedFormat: orj_this.detected_format,
			orj_this: orj_this,
		});
		return `${result.year}-${result.month}-${result.day}T${result.hours}:${result.minutes}:${result.seconds}${formatUtcOffset(timezoneOffset, ':')}`;
	}

	const compiled = getCompiledTemplate(template);
	const values = compiled.fields.length
		? converter(orj_this.date, compiled.fields, { isUTC, detectedFormat: orj_this.detected_format, orj_this: orj_this })
		: null;
	// Meridiem comes from the original 24h value, before the %12 conversion below.
	let meridiem = null;
	if (compiled.has12h) {
		meridiem = parseInt(values.hours, 10) >= 12 ? 'PM' : 'AM';
	}
	// Derived values (weekday, day of year, weeks, offset) are computed at most
	// once per call and only when the compiled template marked them as needed.
	// Every token behind YMD/DOW/DOY/*_WEEK registers year/month/day fields,
	// so values is never null when those bits are set.
	const needs = compiled.derived;
	let yearNum = 0;
	let monthNum = 0;
	let dayNum = 0;
	let dayOfWeek = 0;
	let dayOfYear = 0;
	let isoWeek = null;
	let localeWeek = null;
	let offsetMinutes = 0;
	if (needs !== 0) {
		if (needs & format_derived_flags.YMD) {
			yearNum = +values.year;
			monthNum = +values.month;
			dayNum = +values.day;
		}
		if (needs & format_derived_flags.DOW) {
			dayOfWeek = getDayOfWeek(yearNum, monthNum, dayNum);
		}
		if (needs & format_derived_flags.DOY) {
			dayOfYear = getDayOfYear(yearNum, monthNum, dayNum);
		}
		if (needs & format_derived_flags.ISO_WEEK) {
			isoWeek = getIsoWeekInfo(yearNum, monthNum, dayNum);
		}
		if (needs & format_derived_flags.LOCALE_WEEK) {
			localeWeek = getLocaleWeekInfo(yearNum, monthNum, dayNum, orj_this.temp_config.weekStartDay ?? global_config.weekStartDay);
		}
		if (needs & format_derived_flags.OFFSET) {
			offsetMinutes = getTargetOffsetMinutes(orj_this);
		}
	}
	const parts = compiled.parts;
	const parts_length = parts.length;
	let out = '';
	for (let i = 0; i < parts_length; i++) {
		const part = parts[i];
		switch (part.t) {
			case format_part_types.LITERAL:
				out += part.v;
				break;
			case format_part_types.YEAR:
				out += values.year;
				break;
			case format_part_types.MONTH:
				out += values.month;
				break;
			case format_part_types.DAY:
				out += values.day;
				break;
			case format_part_types.HOURS:
				out += values.hours;
				break;
			case format_part_types.MINUTES:
				out += values.minutes;
				break;
			case format_part_types.SECONDS:
				out += values.seconds;
				break;
			case format_part_types.MILLISECONDS:
				out += values.milliseconds;
				break;
			case format_part_types.NAME:
				out += formatNameToken(orj_this, part.v);
				break;
			case format_part_types.HOUR12: {
				let hours = parseInt(values.hours, 10) % 12;
				if (hours === 0) {
					hours = 12;
				}
				out += hours < 10 ? `0${hours}` : hours;
				break;
			}
			case format_part_types.DAY_UNPADDED: {
				const day = values.day;
				out += day[0] === '0' ? day.slice(1) : day;
				break;
			}
			case format_part_types.DAY_ORDINAL:
				out += getOrdinal(parseInt(values.day, 10));
				break;
			case format_part_types.MERIDIEM_UPPER:
				out += meridiem;
				break;
			case format_part_types.MERIDIEM_LOWER:
				out += meridiem === 'PM' ? 'pm' : 'am';
				break;
			case format_part_types.YEAR2:
				// Year is a number on the native converter path, a string on the Intl paths.
				out += String(values.year).slice(-2);
				break;
			case format_part_types.MONTH_UNPADDED: {
				const month = values.month;
				out += month[0] === '0' ? month.slice(1) : month;
				break;
			}
			case format_part_types.MONTH_ORDINAL:
				out += getOrdinal(parseInt(values.month, 10));
				break;
			case format_part_types.QUARTER:
				out += Math.ceil(parseInt(values.month, 10) / 3);
				break;
			case format_part_types.QUARTER_ORDINAL:
				out += getOrdinal(Math.ceil(parseInt(values.month, 10) / 3));
				break;
			case format_part_types.DAY_OF_YEAR:
				out += dayOfYear;
				break;
			case format_part_types.DAY_OF_YEAR_ORDINAL:
				out += getOrdinal(dayOfYear);
				break;
			case format_part_types.DAY_OF_YEAR_PADDED:
				out += dayOfYear < 100 ? (dayOfYear < 10 ? `00${dayOfYear}` : `0${dayOfYear}`) : dayOfYear;
				break;
			case format_part_types.WEEKDAY:
				out += dayOfWeek;
				break;
			case format_part_types.WEEKDAY_ORDINAL:
				out += getOrdinal(dayOfWeek);
				break;
			case format_part_types.WEEKDAY_LOCALE:
				out += (dayOfWeek - (orj_this.temp_config.weekStartDay ?? global_config.weekStartDay) + 7) % 7;
				break;
			case format_part_types.WEEKDAY_ISO:
				out += dayOfWeek === 0 ? 7 : dayOfWeek;
				break;
			case format_part_types.WEEK:
				out += localeWeek.week;
				break;
			case format_part_types.WEEK_ORDINAL:
				out += getOrdinal(localeWeek.week);
				break;
			case format_part_types.WEEK_PADDED:
				out += localeWeek.week < 10 ? `0${localeWeek.week}` : localeWeek.week;
				break;
			case format_part_types.WEEK_YEAR2:
				out += String(localeWeek.year).slice(-2);
				break;
			case format_part_types.WEEK_YEAR:
				out += localeWeek.year;
				break;
			case format_part_types.ISO_WEEK:
				out += isoWeek.week;
				break;
			case format_part_types.ISO_WEEK_ORDINAL:
				out += getOrdinal(isoWeek.week);
				break;
			case format_part_types.ISO_WEEK_PADDED:
				out += isoWeek.week < 10 ? `0${isoWeek.week}` : isoWeek.week;
				break;
			case format_part_types.ISO_WEEK_YEAR2:
				out += String(isoWeek.year).slice(-2);
				break;
			case format_part_types.ISO_WEEK_YEAR:
				out += isoWeek.year;
				break;
			case format_part_types.HOURS_UNPADDED: {
				const hours = values.hours;
				out += hours[0] === '0' ? hours.slice(1) : hours;
				break;
			}
			case format_part_types.HOUR12_UNPADDED: {
				let hours = parseInt(values.hours, 10) % 12;
				if (hours === 0) {
					hours = 12;
				}
				out += hours;
				break;
			}
			case format_part_types.HOUR24: {
				// 1-24 clock: midnight renders as 24.
				const hours = parseInt(values.hours, 10);
				out += hours === 0 ? 24 : hours;
				break;
			}
			case format_part_types.HOUR24_PADDED: {
				const hours = parseInt(values.hours, 10);
				out += hours === 0 ? '24' : hours < 10 ? `0${hours}` : hours;
				break;
			}
			case format_part_types.MINUTES_UNPADDED: {
				const minutes = values.minutes;
				out += minutes[0] === '0' ? minutes.slice(1) : minutes;
				break;
			}
			case format_part_types.SECONDS_UNPADDED: {
				const seconds = values.seconds;
				out += seconds[0] === '0' ? seconds.slice(1) : seconds;
				break;
			}
			case format_part_types.MS_FRACTION: {
				// milliseconds is always a 3-char padded string: S/SS truncate,
				// SSSS..SSSSSSSSS right-pad with zeros (moment semantics).
				const digits = part.v.length;
				out += digits < 3 ? values.milliseconds.slice(0, digits) : values.milliseconds.padEnd(digits, '0');
				break;
			}
			case format_part_types.OFFSET_COLON:
				out += formatUtcOffset(offsetMinutes, ':');
				break;
			case format_part_types.OFFSET_BASIC:
				out += formatUtcOffset(offsetMinutes, '');
				break;
			case format_part_types.TZ_ABBR:
				out += getTimezoneAbbreviation(orj_this.temp_config.timezone || global_config.timezone || systemTimezone, orj_this.date);
				break;
			case format_part_types.TZ_LONG:
				out += getTimezoneLongName(
					orj_this.temp_config.timezone || global_config.timezone || systemTimezone,
					orj_this.date,
					orj_this.temp_config.locale || global_config.locale,
				);
				break;
			case format_part_types.UNIX_SECONDS:
				out += Math.floor(orj_this.date.getTime() / 1000);
				break;
			case format_part_types.UNIX_MS:
				out += orj_this.date.getTime();
				break;
		}
	}
	if (compiled.appendMeridiem) {
		out += ` ${meridiem}`;
	}
	return out;
}

/**
 * Formats a locale-aware name token (dddd/ddd/dd/MMMM/MMM) for the date,
 * memoized in nope-redis per token, locale/timezone formatter and timestamp.
 * dd is the short weekday name sliced to its first two characters (the
 * closest Intl equivalent of moment's "min" weekday names).
 *
 * @param {KkDate} orj_this
 * @param {string} token
 * @returns {string}
 */
function formatNameToken(orj_this, token) {
	const formatter = dateTimeFormat(orj_this, token);
	const cache_key = `${token}_${formatter.id}_${orj_this.date.getTime()}`;
	const cache = nopeRedis.getItem(cache_key);
	if (cache) {
		return cache;
	}
	let value = formatter.value.format(orj_this.date);
	if (token === 'dd') {
		value = value.slice(0, 2);
	}
	nopeRedis.setItemSync(cache_key, value);
	return value;
}

/**
 * validation
 *
 * Accepts every predefined template plus any display-token template the formatter
 * understands (compiled on first use). Templates with no recognizable token throw
 * 'Invalid template !'.
 *
 * @param {KkDate.date_string} date_string
 * @param {string} template
 * @param {boolean} [is_strict=false] - Layers wall-clock semantics on top of the shape check
 * (moment strict parity): 4-digit years 1700-2199, real calendar days incl. leap years,
 * hours 00-23 plus exactly 24:00[:00], and no :ss tail on HH:mm.
 * @returns {boolean}
 */
function isValid(date_string, template, is_strict = false) {
	// Early return for special case
	if (template === TEMPLATE_DDDD) {
		return true;
	}

	// Hot path: hand-written charCode validators for the predefined numeric templates.
	// Default mode replicates the legacy regexes bit-for-bit; is_strict layers wall-clock
	// hours (24 only as exactly 24:00[:00]), 4-digit years (1700-2199) and real-calendar
	// day checks on top (moment strict parity).
	const validator = format_validators.get(template);
	if (validator !== undefined) {
		return validator(date_string, is_strict);
	}

	// Remaining predefined templates (name/unicode based) keep their legacy regexes.
	// is_strict has no additional effect for these.
	const regex = format_types_regex_cache.get(template);
	if (regex !== undefined) {
		return regex.test(date_string);
	}

	// Any other display-token template is compiled into a validator on first use.
	// Templates with no recognizable token keep throwing 'Invalid template !'.
	return validateDynamicTemplate(template, date_string, is_strict);
}

/**
 * @description checks the number of week start day
 * @param {number} weekStartDay
 * @returns {boolean}
 */
function isValidWeekStartDay(weekStartDay) {
	if (typeof weekStartDay !== 'number' || !Number.isInteger(weekStartDay)) {
		throw new Error('weekStartDay must be an integer');
	}
	if (weekStartDay < 0 || weekStartDay > 6) {
		throw new Error('weekStartDay must be between 0 and 6');
	}
	return true;
}

/**
 * @description It configures the global config.
 * @param {Object} options
 * @param {string} options.locale
 * @param {string} options.timezone
 * @param {0|1|2|3|4|5|6} options.weekStartDay - The day of the week to start from (0 = Sunday, 1 = Monday ...)
 * @returns {boolean}
 */
function config(options) {
	try {
		if (options.locale) {
			if (typeof Intl?.Locale === 'function') {
				new Intl.Locale(options.locale);
			}
			global_config.locale = options.locale;
			cached_dateTimeFormat.dddd = new Intl.DateTimeFormat(global_config.locale, {
				weekday: 'long',
			});
			cached_dateTimeFormat.ddd = new Intl.DateTimeFormat(global_config.locale, {
				weekday: 'short',
			});
			cached_dateTimeFormat.dd = new Intl.DateTimeFormat(global_config.locale, {
				weekday: 'short',
			});
			cached_dateTimeFormat.MMMM = new Intl.DateTimeFormat(global_config.locale, {
				month: 'long',
			});
			cached_dateTimeFormat.MMM = new Intl.DateTimeFormat(global_config.locale, {
				month: 'short',
			});
			if (typeof Intl?.RelativeTimeFormat === 'function') {
				try {
					global_config.rtf[global_config.locale] = new Intl.RelativeTimeFormat(global_config.locale, { numeric: 'auto' });
				} catch {
					throw new Error('locale not valid for BCP 47 / relative time formatting');
				}
			}
		}
	} catch (error) {
		throw new Error(error.message || 'locale not valid for BCP 47 / config');
	}
	if (typeof options.weekStartDay === 'number') {
		isValidWeekStartDay(options.weekStartDay);
		global_config.weekStartDay = options.weekStartDay;
	}
	if (options.timezone && global_config.timezone !== options.timezone) {
		checkTimezone(options.timezone);
		global_config.timezone = options.timezone;
		timezone_shift_enabled = global_config.timezone !== systemTimezone;
	}
	if (options.locale || options.timezone || typeof options.weekStartDay === 'number') {
		// Existing instances may have cached a config signature that resolved
		// through the old global timezone/locale/weekStartDay — force recomputation.
		format_config_version++;
	}
	return true;
}

/**
 * caching config
 *
 * @param {object} options
 * @param {boolean} options.status
 * @param {number|null} options.defaultTtl
 * @returns {boolean}
 */
function caching(options = { status: false, defaultTtl: null }) {
	if (typeof options.status === 'boolean') {
		if (options.status) {
			nopeRedis.SERVICE_START();
			cachingEnabled = true;
		} else {
			nopeRedis.SERVICE_KILL_SYNC();
			cachingEnabled = false;
		}
	}
	if (typeof options.defaultTtl === 'number') {
		nopeRedis.config({ defaultTtl: options.defaultTtl });
	}
	return true;
}

/**
 * caching config
 *
 * @param {boolean} status
 */
function caching_status() {
	return nopeRedis.stats({ showKeys: false, showTotal: true, showSize: true });
}

// kk date export default
module.exports = KkDate;

// another functions export
module.exports.config = config;
module.exports.duration = duration;
module.exports.caching = caching;
module.exports.caching_status = caching_status;
module.exports.caching_flush = nopeRedis.flushAll;
module.exports.isValid = isValid;
module.exports.getTimezoneInfo = getTimezoneInfo;
module.exports.convertToTimezone = convertToTimezone;
module.exports.getAvailableTimezones = getAvailableTimezones;
module.exports.isDST = isDST;
module.exports.getTimezoneAbbreviation = getTimezoneAbbreviation;
module.exports.checkTimezone = checkTimezone;
module.exports.getTimezoneOffset = getTimezoneOffset;

// Global timezone configuration functions
module.exports.getTimezone = () => global_config.timezone;
module.exports.setTimezone = (timezone) => {
	checkTimezone(timezone);
	global_config.timezone = timezone;
	timezone_shift_enabled = global_config.timezone !== systemTimezone;
	// Existing instances may have cached a config signature that resolved
	// through the old global timezone — force recomputation (see formatSig).
	format_config_version++;
};
module.exports.getUserTimezone = () => global_config.userTimezone;
module.exports.setUserTimezone = (timezone) => {
	checkTimezone(timezone);
	global_config.userTimezone = timezone;
};
