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
	compiled_templates,
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

// Longest-first alternation so multi-char tokens win over their prefixes
// (MMMM > MMM > MM, dddd > ddd, DD > Do > D). The leading group captures
// [bracketed] literals, dayjs/moment style.
const format_token_regex = /(\[[^\]]*\])|YYYY|MMMM|MMM|MM|dddd|ddd|DD|Do|D|HH|hh|mm|ss|SSS|A|a/g;

// Numeric-field tokens: part kind + the converter field it needs.
const token_parts = {
	YYYY: { t: format_part_types.YEAR, field: 'year' },
	MM: { t: format_part_types.MONTH, field: 'month' },
	DD: { t: format_part_types.DAY, field: 'day' },
	HH: { t: format_part_types.HOURS, field: 'hours' },
	mm: { t: format_part_types.MINUTES, field: 'minutes' },
	ss: { t: format_part_types.SECONDS, field: 'seconds' },
	SSS: { t: format_part_types.MILLISECONDS, field: 'milliseconds' },
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
 * Tokens: YYYY MM DD HH mm ss SSS (numeric fields), MMMM MMM dddd ddd
 * (locale-aware names), hh (12-hour), D (unpadded day), Do (ordinal day),
 * A/a (meridiem). [Bracketed] text is emitted literally; any other
 * character passes through as-is. When hh is used without an explicit A/a,
 * ' AM'/' PM' is appended to the end of the output (legacy hh:mm behavior).
 *
 * @param {string} template
 * @returns {{parts: Array<{t: number, v: string}>, fields: string[], has12h: boolean, appendMeridiem: boolean}}
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
				parts.push({ t: token_part.t, v: '' });
				addField(fields, token_part.field);
			} else if (token === 'hh') {
				parts.push({ t: format_part_types.HOUR12, v: '' });
				addField(fields, 'hours');
				usedHour12 = true;
			} else if (token === 'D') {
				parts.push({ t: format_part_types.DAY_UNPADDED, v: '' });
				addField(fields, 'day');
			} else if (token === 'Do') {
				parts.push({ t: format_part_types.DAY_ORDINAL, v: '' });
				addField(fields, 'day');
			} else if (token === 'A') {
				parts.push({ t: format_part_types.MERIDIEM_UPPER, v: '' });
				addField(fields, 'hours');
				explicitMeridiem = true;
			} else if (token === 'a') {
				parts.push({ t: format_part_types.MERIDIEM_LOWER, v: '' });
				addField(fields, 'hours');
				explicitMeridiem = true;
			} else {
				// dddd | ddd | MMMM | MMM
				parts.push({ t: format_part_types.NAME, v: token });
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
	});
}

/**
 * Returns the cached compiled template, compiling it on first use.
 *
 * @param {string} template
 * @returns {{parts: Array<{t: number, v: string}>, fields: string[], has12h: boolean, appendMeridiem: boolean}}
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
