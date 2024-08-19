const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const format_types = {
	dddd: 'dddd',
	YYYY: 'YYYY',
	DD: 'DD',
	MM: 'MM',
	'YYYY-MM-DD': 'YYYY-MM-DD',
	'YYYY.MM.DD': 'YYYY.MM.DD',
	'DD.MM.YYYY': 'DD.MM.YYYY',
	'HH:mm:ss': 'HH:mm:ss',
	'HH:mm': 'HH:mm',
	HH: 'HH',
	mm: 'mm',
	ss: 'ss',
};
const format_types_regex = {
	YYYY: /^(17|18|19|20|21)\d\d$/,
	MM: /^(0[1-9]|1[0-2])$/,
	DD: /^(0[1-9]|[12][0-9]|3[01])$/,
	'YYYY-MM-DD': /^(|17|18|19|20|21)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
	'YYYY.MM.DD': /^(|17|18|19|20|21)\d\d.(0[1-9]|1[0-2]).(0[1-9]|[12][0-9]|3[01])$/,
	'DD.MM.YYYY': /^(0[1-9]|[12][0-9]|3[01]).(0[1-9]|1[0-2]).(|17|18|19|20|21)\d\d$/,
	'HH:mm:ss': /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/,
	'HH:mm': /^([01]\d|2[0-3]):([0-5]\d)$/,
	HH: /^([01]\d|2[0-3])$/,
	mm: /^([0-5]\d)$/,
	ss: /^([0-5]\d)$/,
};

/**
 * @newDate method
 */
class newDate {
	/**
	 *
	 * @param {string|Date|newDate} date - date/datetime/time
	 */
	constructor(date = null) {
		this.date = null;
		this.date_string = null;
		if (isNewDate(date)) {
			this.date = date.date;
			this.date_string = `${date.date}`;
		} else if (typeof date === 'number') {
			const stringed_date = `${date}`;
			if (stringed_date.length <= 10) {
				this.date = new Date(date * 1000);
			} else if (stringed_date.length > 10) {
				this.date = new Date(date);
			}
			this.date_string = `${this.date}`;
		} else {
			if (!date) {
				this.date = new Date();
				this.date_string = `${this.date}`;
			} else {
				this.date = new Date(`${date}`);
				this.date_string = `${date}`;
			}
			if (Number.isNaN(this.date.getTime())) {
				if (isValid(this.date_string, format_types['HH:mm:ss']) || isValid(this.date_string, format_types['HH:mm'])) {
					this.date = new Date(`${new Date().toISOString().split('T')[0]} ${this.date_string}`);
				} else {
					throw new Error('Invalid Date');
				}
			}
		}
	}

	/**
	 * isBefore
	 *
	 * @param {string|Date|newDate} date - date/datetime/time
	 * @returns {boolean}
	 */
	isBefore(date) {
		const converted = isNewDate(date) ? date.date : new newDate(date).date;
		return this.date.getTime() < converted.getTime();
	}

	/**
	 * isSameOrBefore
	 *
	 * @param {string|Date|newDate} date - date/datetime/time
	 * @returns {boolean}
	 */
	isSameOrBefore(date) {
		const converted = isNewDate(date) ? date.date : new newDate(date).date;
		return this.date.getTime() <= converted.getTime();
	}

	/**
	 * isAfter
	 *
	 * @param {string|Date|newDate} date - date/datetime/time
	 * @returns {boolean}
	 */
	isAfter(date) {
		const converted = isNewDate(date) ? date.date : new newDate(date).date;
		return this.date.getTime() > converted.getTime();
	}

	/**
	 * isSameOrAfter
	 *
	 * @param {string|Date|newDate} date - date/datetime/time
	 * @returns {boolean}
	 */
	isSameOrAfter(date) {
		const converted = isNewDate(date) ? date.date : new newDate(date).date;
		return this.date.getTime() >= converted.getTime();
	}

	/**
	 * isSame
	 *
	 * @param {string|Date|newDate} date - date/datetime/time
	 * @returns {boolean}
	 */
	isSame(date) {
		const converted = isNewDate(date) ? date.date : new newDate(date).date;
		return this.date.getTime() === converted.getTime();
	}

	/**
	 * isBetween
	 *
	 * @param {string|Date|newDate} date - date/datetime/time
	 * @param {string|Date|newDate} date - date/datetime/time
	 * @returns {boolean}
	 */
	isBetween(start, end) {
		const starts = isNewDate(start) ? start.date : new newDate(start).date;
		const ends = isNewDate(end) ? end.date : new newDate(end).date;
		return this.date.getTime() >= starts.getTime() && this.date.getTime() <= ends.getTime();
	}

	/**
	 * returns string of date
	 *
	 * @returns {string}
	 */
	toString() {
		return this.date.toString();
	}

	/**
	 * The toDateString() method of Date instances returns a string representing the date portion of this date interpreted in the local timezone.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toDateString
	 * @returns {string}
	 */
	toDateString() {
		return this.date.toDateString();
	}

	/**
	 * The toISOString() method of Date instances returns a string representing this date in the date time string format, a simplified format based on ISO 8601, which is always 24 or 27 characters long (YYYY-MM-DDTHH:mm:ss.sssZ or ±YYYYYY-MM-DDTHH:mm:ss.sssZ, respectively). The timezone is always UTC, as denoted by the suffix Z.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
	 *
	 * @returns {string}
	 */
	toISOString() {
		return this.date.toISOString();
	}

	/**
	 * The toJSON() method of Date instances returns a string representing this date in the same ISO format as toISOString().
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON
	 *
	 * @returns {Object}
	 */
	toJSON() {
		return this.date.toJSON();
	}

	/**
	 * The toUTCString() method of Date instances returns a string representing this date in the RFC 7231 format, with negative years allowed. The timezone is always UTC. toGMTString() is an alias of this method.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toUTCString
	 *
	 * @returns {string}
	 */
	toUTCString() {
		return this.date.toUTCString();
	}

	/**
	 * The locales and options parameters customize the behavior of the function and let applications specify the language whose formatting conventions should be used.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
	 *
	 * @param {*} locales
	 * @param {*} options
	 * @returns {string}
	 */
	toLocaleDateString(locales, options) {
		return this.date.toLocaleDateString(locales, options);
	}

	/**
	 * The toLocaleString() method of Date instances returns a string with a language-sensitive representation of this date in the local timezone. In implementations with Intl.DateTimeFormat API support, this method simply calls Intl.DateTimeFormat.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
	 *
	 * @param {*} locales
	 * @param {*} options
	 * @returns
	 */
	toLocaleString(locales, options) {
		return this.date.toLocaleString(locales, options);
	}

	/**
	 * The toLocaleTimeString() method of Date instances returns a string with a language-sensitive representation of the time portion of this date in the local timezone. In implementations with Intl.DateTimeFormat API support, this method simply calls Intl.DateTimeFormat.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString
	 *
	 * @param {*} locales
	 * @param {*} options
	 * @returns
	 */
	toLocaleTimeString(locales, options) {
		return this.date.toLocaleTimeString(locales, options);
	}

	/**
	 * The toTimeString() method of Date instances returns a string representing the time portion of this date interpreted in the local timezone.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toTimeString
	 *
	 * @returns {string}
	 */
	toTimeString() {
		return this.date.toTimeString();
	}

	/**
	 * The valueOf() method of Date instances returns the number of milliseconds for this date since the epoch, which is defined as the midnight at the beginning of January 1, 1970, UTC.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/valueOf
	 *
	 * @returns {number|NaN}
	 */
	valueOf() {
		return this.date.valueOf();
	}

	/**
	 * This is a pretty robust function for adding and subtracting time to an existing moment. To add time, specify the key of the time unit you want to add and the amount you want to add. Similarly, to subtract time, use the same key to subtract the amount of time.
	 *
	 * @param {number} amount
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @returns {newDate}
	 */
	add(amount, type) {
		if (typeof amount !== 'number') {
			throw new Error('amount is not number !');
		}
		switch (type) {
			case 'days':
				this.date.setDate(this.date.getDate() + amount);
				break;
			case 'minutes':
				this.date.setMinutes(this.date.getMinutes() + amount);
				break;
			case 'seconds':
				this.date.setSeconds(this.date.getSeconds() + amount);
				break;
			case 'hours':
				this.date.setHours(this.date.getHours() + amount);
				break;
			case 'months':
				this.date.setMonth(this.date.getMonth() + amount);
				break;
			case 'years': {
				const year_amount = amount * 12;
				this.date.setMonth(this.date.getMonth() + year_amount);
				break;
			}
			default:
				throw new Error('type is wrong');
		}
		return this;
	}
	/**
	 *
	 * @param {string|Date|newDate} start
	 * @param {string|Date|newDate} end
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @param {boolean} is_decimal
	 * @returns {number}
	 */
	diff(end, type, is_decimal = false) {
		return diff(this, end, type, is_decimal).diffTime;
	}

	/**
	 *
	 * @param {string|Date|newDate} start
	 * @param {string|Date|newDate} end
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @param {*} template
	 * @returns {Array}
	 */
	diff_range(end, type, template = 'YYYY-MM-DD') {
		const diffed = diff(this, end, type);
		const rangeDates = [];
		rangeDates.push(format(diffed.start, template));
		for (let index = 1; index < diffed.diffTime + 1; index++) {
			const date = new Date(diffed.start.date);
			date.setSeconds(diffed.start.date.getSeconds() + diffed.type_value * index);
			rangeDates.push(format(new newDate(date), template));
		}
		return rangeDates;
	}

	/**
	 *
	 * @param {string} separator [separator=' '] - The separator used to join the formatted date parts.
	 * @param  {...any} template
	 * @returns {string}
	 */
	format_c(separator = ' ', ...template) {
		const result = [];
		for (let index = 0; index < template.length; index++) {
			result.push(formatter(this.date, template[index]));
		}
		return result.join(separator);
	}

	/**
	 * basic formatter
	 *
	 * @param {string} template
	 * @returns {string}
	 */
	format(template) {
		return format(this, template);
	}
}

/**
 * isNewDate
 *
 * @param {newDate} value
 * @returns {boolean}
 */
function isNewDate(value = {}) {
	if (value instanceof newDate) {
		return true;
	}
	return false;
}

/**
 *
 * @param {newDate|Date} date
 * @param {string} template
 * @returns
 */
function format(date, template) {
	switch (template) {
		case 'YYYY-MM-DD HH:mm:ss':
			return `${formatter(date.date, 'YYYY-MM-DD')} ${formatter(date.date, 'HH:mm:ss')}`;
		case 'YYYY-MM-DD HH:mm':
			return `${formatter(date.date, 'YYYY-MM-DD')} ${formatter(date.date, 'HH:mm')}`;
		case 'YYYY-MM-DD HH':
			return `${formatter(date.date, 'YYYY-MM-DD')} ${formatter(date.date, 'HH:mm')}`;
		case 'YYYY-MM-DD':
			return formatter(date.date, template);
		case 'YYYY.MM.DD HH:mm':
			return `${formatter(date.date, 'YYYY.MM.DD')} ${formatter(date.date, 'HH:mm')}`;
		case 'YYYY.MM.DD HH':
			return `${formatter(date.date, 'YYYY.MM.DD')} ${formatter(date.date, 'HH')}`;
		case 'YYYY.MM.DD HH:mm:ss':
			return `${formatter(date.date, 'YYYY.MM.DD')} ${formatter(date.date, 'HH:mm:ss')}`;
		case 'DD.MM.YYYY HH:mm:ss':
			return `${formatter(date.date, 'DD.MM.YYYY')} ${formatter(date.date, 'HH:mm:ss')}`;
		case 'DD.MM.YYYY HH:mm':
			return `${formatter(date.date, 'DD.MM.YYYY')} ${formatter(date.date, 'HH:mm')}`;
		case 'dddd':
			return formatter(date.date, template);
		case 'HH:mm:ss':
			return `${formatter(date.date, template)}`;
		case 'HH:mm':
			return `${formatter(date.date, template)}`;
		default:
			throw new Error('template is not right (3)');
	}
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
 *
 * @param {string|Date|newDate} start
 * @param {string|Date|newDate} end
 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
 * @param {boolean} is_decimal
 * @returns {object}
 */
function diff(start, end, type, is_decimal = false) {
	const startDate = start.date;
	const endDate = new Date(new newDate(end).date);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		throw new Error('invalid date check start or end');
	}
	let type_value = null;
	switch (type) {
		case 'minutes':
			type_value = 60;
			break;
		case 'seconds':
			type_value = 1;
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
	return {
		start,
		type_value,
		endDate,
		diffTime: is_decimal ? diffTime_value : absFloor(diffTime_value),
	};
}

/**
 *
 * @param {Date} this.date
 * @param {string} template
 * @returns {string}
 */
function formatter(orj_this, template) {
	try {
		const year = orj_this.getFullYear();
		const month = String(orj_this.getMonth() + 1).padStart(2, '0'); // Aylar 0-11 arası olduğu için +1 ekliyoruz
		const day = String(orj_this.getDate()).padStart(2, '0');
		const minutes = String(orj_this.getMinutes()).padStart(2, '0');
		const seconds = String(orj_this.getSeconds()).padStart(2, '0');
		const hours = String(orj_this.getHours()).padStart(2, '0');

		switch (template) {
			case format_types.dddd:
				return days[orj_this.getDay()];
			case format_types.DD:
				return day;
			case format_types.MM:
				return month;
			case format_types['DD-MM-YYYY']:
				return `${day}-${month}-${year}`;
			case format_types['DD.MM.YYYY']:
				return `${day}-${month}-${year}`;
			case format_types['YYYY-MM-DD']:
				return `${year}-${month}-${day}`;
			case format_types['YYYY.MM.DD']:
				return `${year}.${month}.${day}`;
			case format_types.YYYY:
				return `${year}`;
			case format_types['HH:mm:ss']: {
				return `${hours}:${minutes}:${seconds}`;
			}
			case format_types['HH:mm']: {
				return `${hours}:${minutes}`;
			}
			case format_types.mm: {
				return `${minutes}`;
			}
			case format_types.ss: {
				return `${seconds}`;
			}
			case format_types.HH: {
				return `${hours}`;
			}
			default:
				throw new Error('template is not right (2)');
		}
	} catch (error) {
		throw new Error('Invalid Date');
	}
}

/**
 *
 * @param {newDate.date_string} date_string
 * @param {string} template
 * @returns {boolean}
 */
function isValid(date_string, template) {
	if (!format_types[template]) {
		throw new Error('Invalid template');
	}
	if (template === format_types.dddd) {
		if (days.includes(date_string) === false) {
			return false;
		}
		return true;
	}
	if (format_types_regex[template].test(date_string) === false) {
		return false;
	}
	return true;
}

module.exports = newDate;
