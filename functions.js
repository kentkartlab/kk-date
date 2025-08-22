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
 * get timezone offset
 *
 * @param {string} timezone
 * @returns {Number}
 */
function getTimezoneOffset(timezone) {
	try {
		const new_date = new Date();

		if (timezone_cache.has(timezone)) {
			const { offset, timestamp } = timezone_cache.get(timezone);
			if (new_date.getTime() - timestamp < cache_ttl) {
				return offset; // Cache is avaible return from cache
			}
		}

		const resolver = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(new_date);
		const offset = resolver.find((part) => part.type === 'timeZoneName');
		const offsetValue = offset.value.split('GMT')[1];
		const [offsetHours, offsetMinutes = '0'] = offsetValue.split(':').map(Number);
		const totalOffset = offsetHours * 3600 + offsetMinutes * 60;
		// save to cache
		timezone_cache.set(timezone, { offset: totalOffset * 1000, timestamp: new_date.getTime() });
		return totalOffset * 1000;
	} catch {
		throw Error('check timezone');
	}
}
/**
 * @description It parses the date with the timezone and returns the date.
 * @param {KkDate} kkDate
 * @param {string} customTimezone
 * @returns {Date|Error}
 */
function parseWithTimezone(kkDate, is_init = false) {
	if (!kkDate.temp_config.timezone && global_config.timezone === global_config.userTimezone) {
		return kkDate.date;
	}
	if (kkDate.detected_format === 'Xx' || (kkDate.temp_config.timezone && global_config.timezone !== kkDate.temp_config.timezone)) {
		const utcTime = kkDate.date.getTime();
		if (kkDate.detected_format === 'Xx' && global_config.timezone === global_config.userTimezone && is_init) {
			return new Date(utcTime);
		}
		const temp_timezone = getTimezoneOffset(kkDate.temp_config.timezone);
		const global_timezone = getTimezoneOffset(global_config.timezone);
		const kk_ofset = kkDate.date.getTimezoneOffset() * 60 * 1000;

		if (kkDate.detected_format === 'Xx' && global_config.timezone !== global_config.userTimezone && is_init) {
			return new Date(utcTime + kk_ofset + global_timezone);
		}

		// to +plus
		if (temp_timezone > 0) {
			return new Date(utcTime + temp_timezone + global_timezone);
		}

		// minus to minus TODO:
		if (temp_timezone < 0 && global_timezone < 0 && kk_ofset > 0) {
			return new Date(utcTime + global_timezone - (temp_timezone - global_timezone));
		}

		// minus to minus TODO:
		if (temp_timezone < 0 && global_timezone < 0 && kk_ofset >= 0) {
			return new Date(utcTime + global_timezone - (temp_timezone - global_timezone) - kk_ofset);
		}

		// timezone minus + global minux + offset minus
		if (temp_timezone < 0 && global_timezone < 0 && kk_ofset < 0) {
			return new Date(utcTime + global_timezone - (temp_timezone - global_timezone));
		}

		// utc
		return new Date(utcTime + temp_timezone - global_timezone + (global_timezone + temp_timezone));
	}
	return kkDate.date;
}

/**
 * check timezone is valid
 *
 * @param {string} timezone
 * @returns {Boolean}
 */
function checkTimezone(timezone) {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: timezone });
	} catch {
		throw Error('Invalid/Timezone');
	}
	return true;
}

/**
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
 * @param {object} [options={pad: true}]
 * @returns {Object}
 */
function converter(date, to, options = { pad: true }) {
	const result = {};
	const shouldPad = options.pad !== false; // Default to true if options.pad is not explicitly false

	for (let index = 0; index < to.length; index++) {
		switch (to[index]) {
			case 'year':
				result['year'] = date.getFullYear();
				break;
			case 'month':
				result['month'] = shouldPad ? String(date.getMonth() + 1).padStart(2, '0') : date.getMonth() + 1;
				break;
			case 'day':
				result['day'] = shouldPad ? String(date.getDate()).padStart(2, '0') : date.getDate();
				break;
			case 'hours':
				result['hours'] = shouldPad ? String(date.getHours()).padStart(2, '0') : date.getHours();
				break;
			case 'minutes':
				result['minutes'] = shouldPad ? String(date.getMinutes()).padStart(2, '0') : date.getMinutes();
				break;
			case 'seconds':
				result['seconds'] = shouldPad ? String(date.getSeconds()).padStart(2, '0') : date.getSeconds();
				break;
			case 'milliseconds':
				result['milliseconds'] = shouldPad ? String(date.getMilliseconds()).padStart(3, '0') : date.getMilliseconds(); // Pad milliseconds to 3 digits
				break;
		}
	}
	return result;
}

module.exports.getTimezoneOffset = getTimezoneOffset;
module.exports.parseWithTimezone = parseWithTimezone;
module.exports.checkTimezone = checkTimezone;
module.exports.padZero = padZero;
module.exports.absFloor = absFloor;
module.exports.duration = duration;
module.exports.dateTimeFormat = dateTimeFormat;
module.exports.converter = converter;
module.exports.isValidMonth = isValidMonth;
module.exports.isValidDayName = isValidDayName;
