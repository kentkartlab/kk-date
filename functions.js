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
} = require('./constants');

const months = {};
const days = {};

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
	try {
		// Validate timezone
		checkTimezone(timezone);

		// Check cache first
		const cacheKey = `${timezone}_${date.getTime()}`;
		if (timezone_cache.has(cacheKey)) {
			const { offset, timestamp } = timezone_cache.get(cacheKey);
			if (date.getTime() - timestamp < cache_ttl) {
				return offset;
			}
		}

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
		const offsetPart = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName');

		if (!offsetPart) {
			throw new Error('Could not determine timezone offset');
		}

		// Parse offset like "GMT-05:00" or "GMT+08:00"
		const offsetStr = offsetPart.value.replace('GMT', '');
		const isNegative = offsetStr.startsWith('-');
		const timeStr = offsetStr.replace(/[+-]/, '');
		const [hours, minutes = '0'] = timeStr.split(':').map(Number);

		const totalMinutes = hours * 60 + minutes;
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
		// This is a fallback method - not all environments support this
		const commonTimezones = [
			'UTC',
			'Europe/London',
			'Europe/Paris',
			'Europe/Berlin',
			'Europe/Istanbul',
			'America/New_York',
			'America/Chicago',
			'America/Denver',
			'America/Los_Angeles',
			'Asia/Tokyo',
			'Asia/Shanghai',
			'Asia/Kolkata',
			'Australia/Sydney',
			'Australia/Melbourne',
		];

		return commonTimezones.filter((tz) => {
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

	// Create cache key for this specific conversion
	const timestamp = date.getTime();
	const cacheKey = `${timestamp}_${to.join(',')}_${shouldPad}_${isUTC}_${targetTimezone || 'none'}_${detectedFormat || 'none'}`;

	// Check cache first
	if (converter_results_cache.has(cacheKey)) {
		return converter_results_cache.get(cacheKey);
	}

	// Limit cache size to prevent memory leaks
	if (converter_results_cache.size > 10000) {
		// Clear half of the cache when limit is reached
		const keysToDelete = Array.from(converter_results_cache.keys()).slice(0, 5000);
		for (const key of keysToDelete) {
			converter_results_cache.delete(key);
		}
	}

	const result = {};

	// Use timezone-aware formatting if targetTimezone is specified and not UTC
	// For ISO8601 UTC timestamps with .tz() calls, we also need timezone formatting
	if (targetTimezone && targetTimezone !== 'UTC') {
		// Use Intl.DateTimeFormat for timezone-aware formatting
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
					result.month = partsMap.month;
					break;
				case 'day':
					result.day = partsMap.day;
					break;
				case 'hours':
					// Fix: Convert hour 24 to 00 (midnight)
					result.hours = partsMap.hour === '24' ? '00' : partsMap.hour;
					break;
				case 'minutes':
					result.minutes = partsMap.minute;
					break;
				case 'seconds':
					result.seconds = partsMap.second;
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

	// Fast path: Use direct Date methods for most cases
	if (detectedFormat !== 'Xx' || !global_config.timezone || global_config.timezone === 'UTC') {
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
		converter_results_cache.set(cacheKey, result);
		return result;
	}

	// Timezone-aware formatting only when absolutely necessary
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
module.exports.isValidMonth = isValidMonth;
module.exports.isValidDayName = isValidDayName;
