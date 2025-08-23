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
	global_config,
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
		// Check cache first
		const cacheKey = `${timezone}_${date.getTime()}`;
		if (timezone_cache.has(cacheKey)) {
			const { offset, timestamp } = timezone_cache.get(cacheKey);
			if (date.getTime() - timestamp < cache_ttl) {
				return offset;
			}
		}

		// Validate timezone
		checkTimezone(timezone);

		// Get timezone offset using Intl.DateTimeFormat with timeZoneName
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			timeZoneName: 'longOffset',
		});

		const parts = formatter.formatToParts(date);
		const offsetPart = parts.find((part) => part.type === 'timeZoneName');

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
		if(timezone_abbreviation_cache.has(timezone)) {
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
	// If no timezone conversion needed, return original date
	if (!kkDate.temp_config.timezone) {
		return kkDate.date;
	}

	const targetTimezone = kkDate.temp_config.timezone;

	// Special handling for UTC - return original UTC time
	if (targetTimezone === 'UTC') {
		return kkDate.date;
	}

	// For timezone conversion, we need to work with the original UTC time
	// If this is an ISO8601 date, use the original UTC time
	// Otherwise, use the current date's time
	let baseTime;
	if (kkDate.detected_format === 'ISO8601') {
		// For ISO8601 dates, we need to reconstruct the original UTC time
		// This is a limitation - we don't store the original UTC timestamp
		// For now, we'll use the current date's time
		baseTime = kkDate.date.getTime();
	} else {
		baseTime = kkDate.date.getTime();
	}

	// Get the offset of the target timezone
	const targetOffset = getTimezoneOffset(targetTimezone, kkDate.date);

	// Create a new date by adjusting for the timezone offset
	// The offset represents the difference between UTC and the target timezone
	// We add the offset to convert from UTC to the target timezone
	const adjustedTime = baseTime + targetOffset;

	return new Date(adjustedTime);
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
 * date converter
 *
 * @param {Date} date
 * @param {Array} to
 * @param {object} [options={pad: true, isUTC: false}]
 * @returns {Object}
 */
function converter(date, to, options = { pad: true }) {
	const result = {};
	const shouldPad = options.pad !== false; // Default to true if options.pad is not explicitly false
	const isUTC = options.isUTC || false; // Use UTC methods for UTC dates

	for (let index = 0; index < to.length; index++) {
		switch (to[index]) {
			case 'year':
				result['year'] = isUTC ? date.getUTCFullYear() : date.getFullYear();
				break;
			case 'month': {
				const month = isUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1;
				result['month'] = shouldPad ? String(month).padStart(2, '0') : month;
				break;
			}
			case 'day': {
				const day = isUTC ? date.getUTCDate() : date.getDate();
				result['day'] = shouldPad ? String(day).padStart(2, '0') : day;
				break;
			}
			case 'hours': {
				const hours = isUTC ? date.getUTCHours() : date.getHours();
				result['hours'] = shouldPad ? String(hours).padStart(2, '0') : hours;
				break;
			}
			case 'minutes': {
				const minutes = isUTC ? date.getUTCMinutes() : date.getMinutes();
				result['minutes'] = shouldPad ? String(minutes).padStart(2, '0') : minutes;
				break;
			}
			case 'seconds': {
				const seconds = isUTC ? date.getUTCSeconds() : date.getSeconds();
				result['seconds'] = shouldPad ? String(seconds).padStart(2, '0') : seconds;
				break;
			}
			case 'milliseconds': {
				const milliseconds = isUTC ? date.getUTCMilliseconds() : date.getMilliseconds();
				result['milliseconds'] = shouldPad ? String(milliseconds).padStart(3, '0') : milliseconds; // Pad milliseconds to 3 digits
				break;
			}
		}
	}
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
