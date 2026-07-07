const {
	iso6391_languages,
	default_en_day_number,
	day_numbers,
	cache_ttl,
	month_numbers,
	timeInMilliseconds,
	format_types,
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

const months = {};
const days = {};

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

for (const key in iso6391_languages) {
	const month_long = new Intl.DateTimeFormat(key, { month: 'long' });
	const month_short = new Intl.DateTimeFormat(key, { month: 'short' });
	const day_long = new Intl.DateTimeFormat(key, { weekday: 'long' });
	const day_short = new Intl.DateTimeFormat(key, { weekday: 'short' });
	for (let i = 1; i < 13; i++) {
		const date = new Date(2021, i, '0');
		months[month_long.format(date).toLowerCase()] = i;
		months[month_short.format(date).toLowerCase()] = i;
	}
	for (let i = 1; i < 8; i++) {
		const date = new Date(2021, 1, i);
		const number = parseInt(default_en_day_number.format(date), 10);
		days[day_long.format(date).toLowerCase()] = number;
		days[day_short.format(date).toLowerCase()] = number;
	}
}

/**
 * if valid will be turn english month name
 *
 * @param {string} monthName
 * @returns {string|Boolean}
 */
function isValidMonth(monthName) {
	const monthNameLower = monthName.toLowerCase();
	return months[monthNameLower] ? month_numbers[months[monthNameLower]] : false;
}

/**
 * if valid will be turn english day name
 *
 * @param {string} dayname
 * @returns {string|Boolean}
 */
function isValidDayName(dayname) {
	const dayNameLower = dayname.toLowerCase();
	return days[dayNameLower] ? day_numbers[days[dayNameLower]] : false;
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

	// Check cache first (single lookup)
	const cacheKey = `${timezone}_${date.getTime()}`;
	const cachedOffset = timezone_cache.get(cacheKey);
	if (cachedOffset !== undefined) {
		if (date.getTime() - cachedOffset.timestamp < cache_ttl) {
			return cachedOffset.offset;
		}
	}

	try {
		let formatter;
		if (long_timezone_cache.has(timezone)) {
			formatter = long_timezone_cache.get(timezone);
		} else {
			formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				timeZoneName: 'longOffset',
			});
			long_timezone_cache.set(timezone, formatter);
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
		const [hours, minutes = '0'] = timeStr.split(':').map(Number);

		const totalMinutes = hours * 60 + minutes;

		// Check for NaN (Hermes splits timeZoneName into multiple parts)
		if (Number.isNaN(totalMinutes)) {
			throw new Error('Invalid offset parsing - falling back');
		}

		// For timezone conversion, we need the offset from UTC to the target timezone
		// GMT-05:00 means the timezone is 5 hours behind UTC, so offset should be -5
		// GMT+08:00 means the timezone is 8 hours ahead of UTC, so offset should be +8
		const offsetMs = (isNegative ? -totalMinutes : totalMinutes) * 60 * 1000;

		// Cache the result
		timezone_cache.set(cacheKey, {
			offset: offsetMs,
			timestamp: date.getTime(),
		});

		return offsetMs;
	} catch {
		// Fallback: Use date comparison method (Hermes/React Native compatible)
		return getTimezoneOffsetFallback(timezone, date, cacheKey);
	}
}

/**
 * Fallback method for timezone offset calculation
 * Used when longOffset is not supported (e.g., React Native Hermes)
 *
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Date for which to calculate offset
 * @param {string} cacheKey - Cache key for storing result
 * @returns {number} - Offset in milliseconds
 */
function getTimezoneOffsetFallback(timezone, date, cacheKey) {
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

		// Handle hour: '24' edge case (midnight)
		let hour = parseInt(p.hour, 10);
		let dayOffset = 0;
		if (hour === 24) {
			hour = 0;
			dayOffset = 86400000; // 1 day in ms
		}

		const tzTimeAsUtc =
			Date.UTC(parseInt(p.year, 10), parseInt(p.month, 10) - 1, parseInt(p.day, 10), hour, parseInt(p.minute, 10), parseInt(p.second, 10)) +
			dayOffset;

		// Add milliseconds from original date (formatter doesn't include ms)
		const offsetMs = tzTimeAsUtc - (date.getTime() - date.getMilliseconds());

		// Cache the result
		if (cacheKey) {
			timezone_cache.set(cacheKey, {
				offset: offsetMs,
				timestamp: date.getTime(),
			});
		}

		return offsetMs;
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
	try {
		if (timezone_check_cache.has(timezone)) {
			return true;
		}
		// Test if timezone is valid by trying to format a date
		new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
		timezone_check_cache.set(timezone, true);
		return true;
	} catch {
		throw new Error(`Invalid timezone: ${timezone}`);
	}
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

		// Get offset for same date in winter (to detect DST)
		const winterDate = new Date(date.getFullYear(), 0, 1); // January 1st
		const winterOffset = getTimezoneOffset(timezone, winterDate);

		// Get offset for same date in summer (to detect DST)
		const summerDate = new Date(date.getFullYear(), 6, 1); // July 1st
		const summerOffset = getTimezoneOffset(timezone, summerDate);

		// Determine if DST is active
		const isDST = currentOffset !== winterOffset;

		let formatter;
		if (timezone_abbreviation_cache.has(timezone)) {
			formatter = timezone_abbreviation_cache.get(timezone);
		} else {
			formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				timeZoneName: 'short',
			});
			timezone_abbreviation_cache.set(timezone, formatter);
		}
		// Get timezone abbreviation
		const abbreviation = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value || timezone;

		return {
			timezone,
			offset: currentOffset,
			isDST,
			abbreviation,
			standardOffset: winterOffset,
			daylightOffset: summerOffset,
		};
	} catch (error) {
		throw new Error(`Failed to get timezone info for ${timezone}: ${error.message}`);
	}
}

/**
 * Enhanced timezone parsing with automatic DST detection
 *
 * @param {KkDate} kkDate - KkDate instance
 * @param {boolean} is_init - Whether this is initial parsing
 * @returns {Date} - Parsed date with timezone conversion
 */
function parseWithTimezone(kkDate) {
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

	if (
		globalTimezone &&
		globalTimezone !== systemTimezone &&
		kkDate.detected_format !== 'ISO8601' &&
		kkDate.detected_format !== 'now' &&
		kkDate.detected_format !== 'Xx' &&
		kkDate.detected_format !== 'kkDate'
	) {
		// Reinterpret the input as being in global timezone
		const systemOffset = getTimezoneOffset(systemTimezone, kkDate.date);
		const globalOffset = getTimezoneOffset(globalTimezone, kkDate.date);
		const offsetDiff = globalOffset - systemOffset;

		// Adjust the date to represent the same clock time in global timezone
		const adjustedTime = kkDate.date.getTime() - offsetDiff;
		return new Date(adjustedTime);
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
			timezone_long_name_cache.set(cacheKey, formatter);
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
 * const result = duration(1234, 'minute');
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

/**
 * @description It formats the date with the locale and template.
 * @param {KkDate} orj_this
 * @param {string} template
 * @returns {Intl.DateTimeFormat}
 */
function dateTimeFormat(orj_this, template) {
	const tempLocale = orj_this.temp_config.locale;

	// For timestamp inputs with configured timezone, use timezone-aware formatting
	// For timestamp inputs with configured timezone, use timezone-aware formatting
	const timezone = orj_this.temp_config.timezone || global_config.timezone;
	if (timezone) {
		const locale = tempLocale || global_config.locale;

		if (template === format_types.dddd) {
			if (cached_dateTimeFormat_with_locale.dddd[`${locale}_${timezone}`]) {
				return cached_dateTimeFormat_with_locale.dddd[`${locale}_${timezone}`];
			}
			cached_dateTimeFormat_with_locale.dddd[`${locale}_${timezone}`] = {
				value: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: timezone }),
				id: `${locale}_${timezone}_dddd`,
			};
			return cached_dateTimeFormat_with_locale.dddd[`${locale}_${timezone}`];
		}
		if (template === format_types.ddd) {
			if (cached_dateTimeFormat_with_locale.ddd[`${locale}_${timezone}`]) {
				return cached_dateTimeFormat_with_locale.ddd[`${locale}_${timezone}`];
			}
			cached_dateTimeFormat_with_locale.ddd[`${locale}_${timezone}`] = {
				value: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: timezone }),
				id: `${locale}_${timezone}_ddd`,
			};
			return cached_dateTimeFormat_with_locale.ddd[`${locale}_${timezone}`];
		}
		// dd is a formatting-only token (never in format_types): short weekday
		// name, sliced to 2 chars by formatNameToken.
		if (template === 'dd') {
			if (cached_dateTimeFormat_with_locale.dd[`${locale}_${timezone}`]) {
				return cached_dateTimeFormat_with_locale.dd[`${locale}_${timezone}`];
			}
			cached_dateTimeFormat_with_locale.dd[`${locale}_${timezone}`] = {
				value: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: timezone }),
				id: `${locale}_${timezone}_dd`,
			};
			return cached_dateTimeFormat_with_locale.dd[`${locale}_${timezone}`];
		}
		if (template === format_types.MMMM) {
			if (cached_dateTimeFormat_with_locale.MMMM[`${locale}_${timezone}`]) {
				return cached_dateTimeFormat_with_locale.MMMM[`${locale}_${timezone}`];
			}
			cached_dateTimeFormat_with_locale.MMMM[`${locale}_${timezone}`] = {
				value: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: timezone }),
				id: `${locale}_${timezone}_MMMM`,
			};
			return cached_dateTimeFormat_with_locale.MMMM[`${locale}_${timezone}`];
		}
		if (template === format_types.MMM) {
			if (cached_dateTimeFormat_with_locale.MMM[`${locale}_${timezone}`]) {
				return cached_dateTimeFormat_with_locale.MMM[`${locale}_${timezone}`];
			}
			cached_dateTimeFormat_with_locale.MMM[`${locale}_${timezone}`] = {
				value: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: timezone }),
				id: `${locale}_${timezone}_MMM`,
			};
			return cached_dateTimeFormat_with_locale.MMM[`${locale}_${timezone}`];
		}
	}

	if (tempLocale) {
		return { value: cached_dateTimeFormat.temp[template][tempLocale], id: `${orj_this.temp_config.locale}_0` };
	}
	if (template === format_types.dddd) {
		return { value: cached_dateTimeFormat.dddd, id: '1' };
	}
	if (template === format_types.ddd) {
		return { value: cached_dateTimeFormat.ddd, id: '2' };
	}
	if (template === format_types.MMMM) {
		return { value: cached_dateTimeFormat.MMMM, id: '3' };
	}
	if (template === format_types.MMM) {
		return { value: cached_dateTimeFormat.MMM, id: '4' };
	}
	if (template === 'dd') {
		return { value: cached_dateTimeFormat.dd, id: '5' };
	}

	throw new Error('unkown template for dateTimeFormat !');
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
		let formatter = null;
		const partsMap = {};

		if (cached_converter_int[targetTimezone]) {
			formatter = cached_converter_int[targetTimezone];
		} else {
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
			cached_converter_int[targetTimezone] = formatter;
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
					result.hours = partsMap.hour === '24' ? '00' : shouldPad ? partsMap.hour : parseInt(partsMap.hour, 10);
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
	let formatter_value;
	if (timezone_formatter_cache.has(useTimezone)) {
		formatter_value = timezone_formatter_cache.get(useTimezone);
	} else {
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
		timezone_formatter_cache.set(useTimezone, formatter_value);
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
				result.hours = shouldPad ? in_result.hour : parseInt(in_result.hour, 10);
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
		return h >= 0 && h <= (is_strict ? 23 : 29);
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

const ORDINAL_SUFFIX_SRC = '(?:st|nd|rd|th|\\.|er|ème|te|º|ª|-й|वां|日|일|z|день)?';
const NAME_TOKEN_SRC = '([\\p{L}\\p{M}.]+)';

// token -> { src: one-capture-group pattern, kind: semantic slot ('' = shape-only) }
const validator_token_map = {
	YYYY: { src: '(\\d{4})', kind: 'year' },
	YY: { src: '(\\d{2})', kind: '' },
	MMMM: { src: NAME_TOKEN_SRC, kind: '' },
	MMM: { src: NAME_TOKEN_SRC, kind: '' },
	MM: { src: '(0[1-9]|1[0-2])', kind: 'month' },
	Mo: { src: `(0?[1-9]|1[0-2])${ORDINAL_SUFFIX_SRC}`, kind: 'month' },
	M: { src: '(0?[1-9]|1[0-2])', kind: 'month' },
	Qo: { src: `([1-4])${ORDINAL_SUFFIX_SRC}`, kind: '' },
	Q: { src: '([1-4])', kind: '' },
	DDDD: { src: '(\\d{3})', kind: 'doy' },
	DDDo: { src: `([1-9]\\d{0,2})${ORDINAL_SUFFIX_SRC}`, kind: 'doy' },
	DDD: { src: '([1-9]\\d{0,2})', kind: 'doy' },
	Do: { src: `(0?[1-9]|[12]\\d|3[01])${ORDINAL_SUFFIX_SRC}`, kind: 'day' },
	DD: { src: '(0[1-9]|[12]\\d|3[01])', kind: 'day' },
	D: { src: '(0?[1-9]|[12]\\d|3[01])', kind: 'day' },
	dddd: { src: NAME_TOKEN_SRC, kind: '' },
	ddd: { src: NAME_TOKEN_SRC, kind: '' },
	dd: { src: NAME_TOKEN_SRC, kind: '' },
	do: { src: `([0-6])${ORDINAL_SUFFIX_SRC}`, kind: '' },
	d: { src: '([0-6])', kind: '' },
	E: { src: '([1-7])', kind: '' },
	e: { src: '([0-6])', kind: '' },
	wo: { src: `([1-9]|[1-4]\\d|5[0-3])${ORDINAL_SUFFIX_SRC}`, kind: '' },
	ww: { src: '(0[1-9]|[1-4]\\d|5[0-3])', kind: '' },
	w: { src: '([1-9]|[1-4]\\d|5[0-3])', kind: '' },
	Wo: { src: `([1-9]|[1-4]\\d|5[0-3])${ORDINAL_SUFFIX_SRC}`, kind: '' },
	WW: { src: '(0[1-9]|[1-4]\\d|5[0-3])', kind: '' },
	W: { src: '([1-9]|[1-4]\\d|5[0-3])', kind: '' },
	gggg: { src: '(\\d{4})', kind: '' },
	gg: { src: '(\\d{2})', kind: '' },
	GGGG: { src: '(\\d{4})', kind: '' },
	GG: { src: '(\\d{2})', kind: '' },
	HH: { src: '(\\d{2})', kind: 'hour' },
	H: { src: '(\\d{1,2})', kind: 'hour' },
	hh: { src: '(0[1-9]|1[0-2])', kind: '' },
	h: { src: '(0?[1-9]|1[0-2])', kind: '' },
	kk: { src: '(0[1-9]|1\\d|2[0-4])', kind: '' },
	k: { src: '([1-9]|1\\d|2[0-4])', kind: '' },
	mm: { src: '([0-5]\\d)', kind: 'minute' },
	m: { src: '([0-5]?\\d)', kind: 'minute' },
	ss: { src: '([0-5]\\d)', kind: 'second' },
	s: { src: '([0-5]?\\d)', kind: 'second' },
	SSS: { src: '(\\d{3})', kind: 'ms' },
	A: { src: '(AM|PM)', kind: '' },
	a: { src: '(am|pm)', kind: '' },
	X: { src: '(\\d{1,12})', kind: '' },
	x: { src: '(\\d{1,15})', kind: '' },
	zzz: { src: '([\\p{L}\\p{M} ]+)', kind: '' },
	zz: { src: '([\\p{L}\\p{M}+\\-:\\d]+)', kind: '' },
	z: { src: '([\\p{L}\\p{M}+\\-:\\d]+)', kind: '' },
	ZZ: { src: '([+-]\\d{4}|Z)', kind: '' },
	Z: { src: '([+-]\\d{2}:\\d{2}|Z)', kind: '' },
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
 * @returns {{regex: RegExp, slots: Array<{g: number, kind: string}>}}
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
			if (spec.kind !== '') {
				slots.push({ g: groupIndex, kind: spec.kind });
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

/**
 * Validates an input against an arbitrary display-token template (compiled and
 * memoized on first use). Default mode is shape-only, mirroring the predefined
 * templates' philosophy (hours up to 29 for day overflow); strict mode adds
 * wall-clock hours (24 only as exactly 24:00[:00]), 4-digit years 1700-2199
 * and real-calendar day checks when numeric year+month+day are all present.
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
	const m = compiled.regex.exec(asString(input));
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
	for (let i = 0; i < slots.length; i++) {
		const v = +m[slots[i].g];
		switch (slots[i].kind) {
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
		// Year-less templates use a leap year so "29 Feb" stays acceptable without a year context.
		if (month !== -1 && day !== -1 && !isRealDate(year !== -1 ? year : 2000, month, day)) {
			return false;
		}
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
