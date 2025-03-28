const timezoneCache = new Map(); // cache object
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const timeInMilliseconds = {
	year: 365 * 24 * 60 * 60 * 1000, // 1 year (365 days)
	month: 31 * 24 * 60 * 60 * 1000, // 1 month (31 days)
	week: 7 * 24 * 60 * 60 * 1000, // 1 week (7 days)
	day: 24 * 60 * 60 * 1000, // 1 day (24 hours)
	hour: 60 * 60 * 1000, // 1 hour
	minute: 60 * 1000, // 1 minute
	second: 1000, // 1 second
};

const format_types = {
	dddd: 'dddd',
	YYYY: 'YYYY',
	DD: 'DD',
	MM: 'MM',
	'YYYY-MM-DD': 'YYYY-MM-DD',
	'YYYY-MM-DD HH:mm:ss': 'YYYY-MM-DD HH:mm:ss',
	'YYYY-MM-DD HH:mm': 'YYYY-MM-DD HH:mm',
	'YYYY.MM.DD': 'YYYY.MM.DD',
	'MM/DD/YYYY': 'MM/DD/YYYY',
	'DD/MM/YYYY': 'DD/MM/YYYY',
	'YYYY-MM-DD HH': 'YYYY-MM-DD HH',
	'DD-MM-YYYY HH': 'DD-MM-YYYY HH',
	'YYYY.MM.DD HH': 'YYYY.MM.DD HH',
	YYYYMMDD: 'YYYYMMDD',
	'YYYY.MM.DD HH:mm:ss': 'YYYY.MM.DD HH:mm:ss',
	'YYYY.MM.DD HH:mm': 'YYYY.MM.DD HH:mm',
	'DD.MM.YYYY': 'DD.MM.YYYY',
	'DD.MM.YYYY HH:mm:ss': 'DD.MM.YYYY HH:mm:ss',
	'DD.MM.YYYY HH:mm': 'DD.MM.YYYY HH:mm',
	'DD-MM-YYYY': 'DD-MM-YYYY',
	'DD-MM-YYYY HH:mm:ss': 'DD-MM-YYYY HH:mm:ss',
	'DD-MM-YYYY HH:mm': 'DD-MM-YYYY HH:mm',
	'DD MMMM YYYY': 'DD MMMM YYYY',
	'DD MMMM YYYY dddd': 'DD MMMM YYYY dddd',
	'DD MMMM dddd YYYY': 'DD MMMM dddd YYYY',
	'MMMM YYYY': 'MMMM YYYY',
	'HH:mm:ss': 'HH:mm:ss',
	'HH:mm:ss.SSS': 'HH:mm:ss.SSS',
	'HH:mm': 'HH:mm',
	HH: 'HH',
	mm: 'mm',
	ss: 'ss',
	MMM: 'MMM', // Short month name (Jan, Feb, etc.)
	MMMM: 'MMMM', // Full month name (January, February, etc.)
	ddd: 'ddd', // Short weekday name (Mon, Tue, etc.)
	'DD MMM YYYY': 'DD MMM YYYY', // 01 Jan 2024
	'DD MMM': 'DD MMM', // 01 Jan
	'MMM YYYY': 'MMM YYYY', // Jan 2024
	'DD MMM YYYY HH:mm': 'DD MMM YYYY HH:mm', // 01 Jan 2024 13:45
	'YYYY-MM-DDTHH:mm:ss': 'YYYY-MM-DDTHH:mm:ss',
};

const cached_dateTimeFormat = {
	dddd: new Intl.DateTimeFormat('en', {
		weekday: 'long',
	}),
	ddd: new Intl.DateTimeFormat('en', {
		weekday: 'short',
	}),
	MMMM: new Intl.DateTimeFormat('en', {
		month: 'long',
	}),
	MMM: new Intl.DateTimeFormat('en', { month: 'short' }),
	temp: {
		dddd: {},
		ddd: {},
		MMMM: {},
		MMM: {},
	},
};

/**
 * get timezone offset
 *
 * @param {string} timezone
 * @returns {Number}
 */
function getTimezoneOffset(timezone) {
	try {
		const now = Date.now();

		if (timezoneCache.has(timezone)) {
			const { offset, timestamp } = timezoneCache.get(timezone);
			if (now - timestamp < CACHE_TTL) {
				return offset; // Cache is avaible return from cache
			}
		}

		const resolver = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(new Date());
		const offset = resolver.find((part) => part.type === 'timeZoneName');
		const offsetValue = offset.value.split('GMT')[1];
		const [offsetHours, offsetMinutes = '0'] = offsetValue.split(':').map(Number);
		const totalOffset = offsetHours * 3600 + offsetMinutes * 60;

		// save to cache
		timezoneCache.set(timezone, { offset: totalOffset, timestamp: now });
		return totalOffset;
	} catch (error) {
		throw Error('check timezone');
	}
}

/**
 * @description It parses the date with the timezone and returns the date.
 * @param {KkDate} kkDate
 * @param {string} global_timezone
 * @param {string} timezone
 * @param {boolean} is_init
 * @returns {Date|Error}
 */
function parseWithTimezone(kkDate, global_timezone, timezone, is_init = false) {
	if (timezone === global_timezone && !is_init) {
		return kkDate.date;
	}
	const utcTime = kkDate.date.getTime();
	const localOffset = kkDate.date.getTimezoneOffset() * 60 * 1000;
	const targetOffset = getTimezoneOffset(timezone) * 1000;
	let extraAddDiff = 0;
	if (kkDate.temp_config && global_timezone && timezone === kkDate.temp_config.timezone) {
		extraAddDiff = getTimezoneOffset(timezone) - getTimezoneOffset(global_timezone);
	}
	const tzTime = utcTime + targetOffset + localOffset + extraAddDiff;
	return new Date(tzTime);
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
	} catch (error) {
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
 * @param {"year" | "month" | "week" | "day" | "hour" | "minute" | "second"} type
 * @returns {{year: number, month: number, week:number, day: number, hour: number, minute: number, second: number}}
 * @example
 * // Example usage:
 * const result = duration(1234, 'minute');
 * console.log(result);
 * // Output: { year: 0, month: 0, week: 0, day: 0, hour: 20, minute: 34, second: 0,millisecond: 0 }
 */
function duration(time, type) {
	const response = {
		year: 0,
		month: 0,
		week: 0,
		day: 0,
		hour: 0,
		minute: 0,
		second: 0,
		millisecond: 0,
		$kk_date: { milliseconds: 0 },
	};

	if (!time || typeof time !== 'number' || time < 0) {
		throw new Error('Invalid time');
	}

	if (!timeInMilliseconds[type]) {
		throw new Error('Invalid type');
	}

	response.$kk_date.milliseconds = time * timeInMilliseconds[type];
	let milliseconds = time * timeInMilliseconds[type];
	response.year = Math.floor(milliseconds / timeInMilliseconds.year);
	milliseconds = milliseconds % timeInMilliseconds.year;
	response.month = Math.floor(milliseconds / timeInMilliseconds.month);
	milliseconds = milliseconds % timeInMilliseconds.month;
	response.week = Math.floor(milliseconds / timeInMilliseconds.week);
	milliseconds = milliseconds % timeInMilliseconds.week;
	response.day = Math.floor(milliseconds / timeInMilliseconds.day);
	milliseconds = milliseconds % timeInMilliseconds.day;
	response.hour = Math.floor(milliseconds / timeInMilliseconds.hour);
	milliseconds = milliseconds % timeInMilliseconds.hour;
	response.minute = Math.floor(milliseconds / timeInMilliseconds.minute);
	milliseconds = milliseconds % timeInMilliseconds.minute;
	response.second = Math.floor(milliseconds / timeInMilliseconds.second);
	milliseconds = milliseconds % timeInMilliseconds.second;
	response.millisecond = milliseconds;

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

	if (template === format_types.dddd) {
		if (tempLocale) {
			return cached_dateTimeFormat.temp[template][tempLocale];
		}
		return cached_dateTimeFormat.dddd;
	}

	if (template === format_types.ddd) {
		if (tempLocale) {
			return cached_dateTimeFormat.temp[template][tempLocale];
		}
		return cached_dateTimeFormat.ddd;
	}

	if (template === format_types.MMMM) {
		if (tempLocale) {
			return cached_dateTimeFormat.temp[template][tempLocale];
		}
		return cached_dateTimeFormat.MMMM;
	}

	if (template === format_types.MMM) {
		if (tempLocale) {
			return cached_dateTimeFormat.temp[template][tempLocale];
		}
		return cached_dateTimeFormat.MMM;
	}

	throw new Error('unkown template for dateTimeFormat !');
}

/**
 * date converter
 *
 * @param {Date} date
 * @param {Array} to
 * @returns {Object}
 */
function converter(date, to) {
	const result = {};
	for (let index = 0; index < to.length; index++) {
		switch (to[index]) {
			case 'year':
				result['year'] = date.getFullYear();
				break;
			case 'month':
				result['month'] = String(date.getMonth() + 1).padStart(2, '0');
				break;
			case 'day':
				result['day'] = String(date.getDate()).padStart(2, '0');
				break;
			case 'hours':
				result['hours'] = String(date.getHours()).padStart(2, '0');
				break;
			case 'minutes':
				result['minutes'] = String(date.getMinutes()).padStart(2, '0');
				break;
			case 'seconds':
				result['seconds'] = String(date.getSeconds()).padStart(2, '0');
				break;
			case 'milliseconds':
				result['milliseconds'] = String(date.getMilliseconds()).padStart(2, '0');
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
module.exports.format_types = format_types;
module.exports.cached_dateTimeFormat = cached_dateTimeFormat;
module.exports.converter = converter;
