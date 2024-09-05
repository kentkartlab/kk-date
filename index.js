const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const format_types = {
	dddd: 'dddd',
	YYYY: 'YYYY',
	DD: 'DD',
	MM: 'MM',
	'YYYY-MM-DD': 'YYYY-MM-DD',
	'YYYY-MM-DD HH:mm:ss': 'YYYY-MM-DD HH:mm:ss',
	'YYYY-MM-DD HH:mm': 'YYYY-MM-DD HH:mm',
	'YYYY.MM.DD': 'YYYY.MM.DD',
	'YYYY.MM.DD HH:mm:ss': 'YYYY.MM.DD HH:mm:ss',
	'YYYY.MM.DD HH:mm': 'YYYY.MM.DD HH:mm',
	'DD.MM.YYYY': 'DD.MM.YYYY',
	'DD.MM.YYYY HH:mm:ss': 'DD.MM.YYYY HH:mm:ss',
	'DD.MM.YYYY HH:mm': 'DD.MM.YYYY HH:mm',
	'DD-MM-YYYY': 'DD-MM-YYYY',
	'DD-MM-YYYY HH:mm:ss': 'DD-MM-YYYY HH:mm:ss',
	'DD-MM-YYYY HH:mm': 'DD-MM-YYYY HH:mm',
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
	'YYYY-MM-DD HH:mm:ss': /^(|17|18|19|20|21)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'YYYY-MM-DD HH:mm': /^(|17|18|19|20|21)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-9]):([0-5]\d)$/,
	'YYYY.MM.DD': /^(|17|18|19|20|21)\d\d.(0[1-9]|1[0-2]).(0[1-9]|[12][0-9]|3[01])$/,
	'YYYY.MM.DD HH:mm:ss': /^(|17|18|19|20|21)\d\d.(0[1-9]|1[0-2]).(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'YYYY.MM.DD HH:mm': /^(|17|18|19|20|21)\d\d.(0[1-9]|1[0-2]).(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-9]):([0-5]\d)$/,
	'DD.MM.YYYY': /^(0[1-9]|[12][0-9]|3[01]).(0[1-9]|1[0-2]).(|17|18|19|20|21)\d\d$/,
	'DD.MM.YYYY HH:mm:ss': /^(0[1-9]|[12][0-9]|3[01]).(0[1-9]|1[0-2]).(|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'DD.MM.YYYY HH:mm': /^(0[1-9]|[12][0-9]|3[01]).(0[1-9]|1[0-2]).(|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d)$/,
	'DD-MM-YYYY': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(|17|18|19|20|21)\d\d$/,
	'DD-MM-YYYY HH:mm:ss': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'DD-MM-YYYY HH:mm': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d)$/,
	'HH:mm:ss': /^([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'HH:mm': /^([01]\d|2[0-9]):([0-5]\d)$/,
	HH: /^([01]\d|2[0-9])$/,
	mm: /^([0-5]\d)$/,
	ss: /^([0-5]\d)$/,
};

/**
 * @kkDate method
 */
class KkDate {
	/**
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 */
	constructor(date = null) {
		this.date = null;
		if (!date) {
			this.date = new Date();
		} else {
			if (Number.isInteger(date)) {
				const stringed_date_length = `${date}`.length;
				if (stringed_date_length <= 10) {
					this.date = new Date(date * 1000);
				} else if (stringed_date_length > 10) {
					this.date = new Date(date);
				}
			} else if (isKkDate(date)) {
				this.date = new Date(date.date.toUTCString());
			} else if (date instanceof Date) {
				this.date = new Date(date.toUTCString());
			} else {
				if (isValid(date, format_types['HH:mm:ss']) || isValid(date, format_types['HH:mm'])) {
					let [hours, minutes, seconds] = date.split(':').map(Number);
					if (hours >= 24) {
						const extraDays = Math.floor(hours / 24);
						hours = hours % 24;

						const dateObj = new Date();
						dateObj.setDate(dateObj.getDate() + extraDays);

						const newDay = String(dateObj.getDate()).padStart(2, '0');
						const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
						const newYear = dateObj.getFullYear();
						let date_string = `${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
						if (seconds) {
							date_string += seconds.toString().padStart(2, '0');
						}
						this.date = new Date(date_string);
					} else {
						this.date = new Date(`${new Date().toISOString().split('T')[0]} ${date}`);
					}
				} else {
					this.date = new Date(`${date}`);
					if (Number.isNaN(this.date.getTime()) === true) {
						this.date = false;
						if (isValid(date, format_types['DD.MM.YYYY HH:mm:ss'])) {
							const [datePart, timePart] = date.split(' ');
							const [day, month, year] = datePart.split('.');
							let [hours, minutes, seconds] = timePart.split(':').map(Number);
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								hours = hours % 24;

								const dateObj = new Date(`${year}-${month}-${day}`);
								dateObj.setDate(dateObj.getDate() + extraDays);

								const newDay = String(dateObj.getDate()).padStart(2, '0');
								const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
								const newYear = dateObj.getFullYear();

								this.date = new Date(
									`${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
								);
							} else {
								this.date = new Date(`${year}-${month}-${day}T${timePart}`);
							}
						} else if (isValid(date, format_types['DD.MM.YYYY HH:mm'])) {
							const [datePart, timePart] = date.split(' ');
							const [day, month, year] = datePart.split('.');
							let [hours, minutes] = timePart.split(':').map(Number);
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								hours = hours % 24;

								const dateObj = new Date(`${year}-${month}-${day}`);
								dateObj.setDate(dateObj.getDate() + extraDays);

								const newDay = String(dateObj.getDate()).padStart(2, '0');
								const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
								const newYear = dateObj.getFullYear();

								this.date = new Date(`${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
							} else {
								this.date = new Date(`${year}-${month}-${day}T${timePart}`);
							}
						} else if (isValid(date, format_types['DD.MM.YYYY'])) {
							const [day, month, year] = date.split('.');
							this.date = new Date(`${year}-${month}-${day}`);
						} else if (isValid(date, format_types['YYYY-MM-DD HH:mm:ss'])) {
							const [datePart, timePart] = date.split(' ');
							const [year, month, day] = datePart.split('-');
							let [hours, minutes, seconds] = timePart.split(':').map(Number);
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								hours = hours % 24;
								const dateObj = new Date(`${year}-${month}-${day}`);
								dateObj.setDate(dateObj.getDate() + extraDays);

								const newDay = String(dateObj.getDate()).padStart(2, '0');
								const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
								const newYear = dateObj.getFullYear();

								this.date = new Date(
									`${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
								);
							} else {
								this.date = new Date(`${year}-${month}-${day}T${timePart}`);
							}
						} else if (isValid(date, format_types['YYYY-MM-DD HH:mm'])) {
							const [datePart, timePart] = date.split(' ');
							const [year, month, day] = datePart.split('-');
							let [hours, minutes] = timePart.split(':').map(Number);
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								hours = hours % 24;
								const dateObj = new Date(`${year}-${month}-${day}`);
								dateObj.setDate(dateObj.getDate() + extraDays);

								const newDay = String(dateObj.getDate()).padStart(2, '0');
								const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
								const newYear = dateObj.getFullYear();

								this.date = new Date(`${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
							} else {
								this.date = new Date(`${year}-${month}-${day}T${timePart}`);
							}
						} else if (isValid(date, format_types['YYYY.MM.DD HH:mm:ss'])) {
							const [datePart, timePart] = date.split(' ');
							const [year, month, day] = datePart.split('.');
							let [hours, minutes, seconds] = timePart.split(':').map(Number);
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								hours = hours % 24;

								const dateObj = new Date(`${year}-${month}-${day}`);
								dateObj.setDate(dateObj.getDate() + extraDays);

								const newDay = String(dateObj.getDate()).padStart(2, '0');
								const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
								const newYear = dateObj.getFullYear();

								this.date = new Date(
									`${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
								);
							} else {
								this.date = new Date(`${year}-${month}-${day}T${timePart}`);
							}
						} else if (isValid(date, format_types['YYYY.MM.DD HH:mm'])) {
							const [datePart, timePart] = date.split(' ');
							const [year, month, day] = datePart.split('.');
							let [hours, minutes] = timePart.split(':').map(Number);
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								hours = hours % 24;

								const dateObj = new Date(`${year}-${month}-${day}`);
								dateObj.setDate(dateObj.getDate() + extraDays);

								const newDay = String(dateObj.getDate()).padStart(2, '0');
								const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
								const newYear = dateObj.getFullYear();

								this.date = new Date(`${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}}`);
							} else {
								this.date = new Date(`${year}-${month}-${day}T${timePart}`);
							}
						} else if (isValid(date, format_types['DD-MM-YYYY'])) {
							const [day, month, year] = datePart.split('-');
							this.date = new Date(`${day}-${month}-${year}`);
						} else if (isValid(date, format_types['DD-MM-YYYY HH:mm:ss'])) {
							const [datePart, timePart] = date.split(' ');
							const [day, month, year] = datePart.split('-');
							let [hours, minutes, seconds] = timePart.split(':').map(Number);
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								hours = hours % 24;

								const dateObj = new Date(`${year}-${month}-${day}`);
								dateObj.setDate(dateObj.getDate() + extraDays);

								const newDay = String(dateObj.getDate()).padStart(2, '0');
								const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
								const newYear = dateObj.getFullYear();

								this.date = new Date(
									`${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
								);
							} else {
								this.date = new Date(`${year}-${month}-${day}T${timePart}`);
							}
						} else if (isValid(date, format_types['DD-MM-YYYY HH:mm'])) {
							const [datePart, timePart] = date.split(' ');
							const [day, month, year] = datePart.split('-');
							let [hours, minutes] = timePart.split(':').map(Number);
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								hours = hours % 24;

								const dateObj = new Date(`${year}-${month}-${day}`);
								dateObj.setDate(dateObj.getDate() + extraDays);

								const newDay = String(dateObj.getDate()).padStart(2, '0');
								const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
								const newYear = dateObj.getFullYear();

								this.date = new Date(`${newYear}-${newMonth}-${newDay}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
							} else {
								this.date = new Date(`${year}-${month}-${day}T${timePart}`);
							}
						}
					}
				}
			}
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
	 * isBefore
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isBefore(date) {
		const converted = isKkDate(date) ? date.getTime() : new KkDate(date).getTime();
		return this.getTime() < converted;
	}

	/**
	 * isSameOrBefore
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSameOrBefore(date) {
		const converted = isKkDate(date) ? date.getTime() : new KkDate(date).getTime();
		return this.getTime() <= converted;
	}

	/**
	 * isAfter
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isAfter(date) {
		const converted = isKkDate(date) ? date.getTime() : new KkDate(date).getTime();
		return this.date.getTime() > converted;
	}

	/**
	 * isSameOrAfter
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSameOrAfter(date) {
		const converted = isKkDate(date) ? date.getTime() : new KkDate(date).getTime();
		return this.date.getTime() >= converted;
	}

	/**
	 * isSame
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSame(date) {
		const converted = isKkDate(date) ? date.getTime() : new KkDate(date).getTime();
		return this.date.getTime() === converted;
	}

	/**
	 * isBetween
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isBetween(start, end) {
		const starts = isKkDate(start) ? start.getTime() : new KkDate(start).getTime();
		const ends = isKkDate(end) ? end.getTime() : new KkDate(end).getTime();
		const date_time = this.date.getTime();
		return date_time >= starts && date_time <= ends;
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
	 * The locales and options parameters customize the behavior of the function and let applications specify the language whose formatting conventions should be used.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
	 *
	 * @param {*} locales
	 * @param {*} options
	 * @returns {string|Error}
	 */
	toLocaleDateString(locales, options) {
		isInvalid(this.date);
		return this.date.toLocaleDateString(locales, options);
	}

	/**
	 * The toLocaleString() method of Date instances returns a string with a language-sensitive representation of this date in the local timezone. In implementations with Intl.DateTimeFormat API support, this method simply calls Intl.DateTimeFormat.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
	 *
	 * @param {*} locales
	 * @param {*} options
	 * @returns {string|Error}
	 */
	toLocaleString(locales, options) {
		isInvalid(this.date);
		return this.date.toLocaleString(locales, options);
	}

	/**
	 * The toLocaleTimeString() method of Date instances returns a string with a language-sensitive representation of the time portion of this date in the local timezone. In implementations with Intl.DateTimeFormat API support, this method simply calls Intl.DateTimeFormat.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString
	 *
	 * @param {*} locales
	 * @param {*} options
	 * @returns {string|Error}
	 */
	toLocaleTimeString(locales, options) {
		isInvalid(this.date);
		return this.date.toLocaleTimeString(locales, options);
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
	 * This is a pretty robust function for adding and subtracting time to an existing moment. To add time, specify the key of the time unit you want to add and the amount you want to add. Similarly, to subtract time, use the same key to subtract the amount of time.
	 *
	 * @param {number} amount
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @returns {KkDate|Error}
	 */
	add(amount, type) {
		isInvalid(this.date);
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
	 * @param {string|Date|KkDate} start
	 * @param {string|Date|KkDate} end
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @param {boolean} is_decimal
	 * @returns {number|Error}
	 */
	diff(end, type, is_decimal = false) {
		return diff(this, end, type, is_decimal, true);
	}

	/**
	 *
	 * @param {string|Date|KkDate} start
	 * @param {string|Date|KkDate} end
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @param {*} template
	 * @returns {Array|Error}
	 */
	diff_range(end, type, template = 'YYYY-MM-DD') {
		const diffed = diff(this, end, type);
		const rangeDates = [];
		rangeDates.push(format(diffed.start, template));
		for (let index = 1; index < diffed.diffTime + 1; index++) {
			const date = new Date(diffed.start.date);
			date.setSeconds(diffed.start.date.getSeconds() + diffed.type_value * index);
			rangeDates.push(format(new KkDate(date), template));
		}
		return rangeDates;
	}

	/**
	 *
	 * @param {string} separator [separator=' '] - The separator used to join the formatted date parts.
	 * @param  {...any} template
	 * @returns {string|Error}
	 */
	format_c(separator = ' ', ...template) {
		isInvalid(this.date);
		const result = [];
		for (let index = 0; index < template.length; index++) {
			result.push(formatter(this.date, template[index]));
		}
		return result.join(separator);
	}

	/**
	 * basic formatter
	 *
	 * @param {'YYYY-MM-DD HH:mm:ss'|'YYYY-MM-DDTHH:mm:ss'|'YYYY-MM-DD HH:mm'|'YYYY-MM-DD HH'|'YYYY-MM-DD'|'DD.MM.YYYY'|'YYYY.MM.DD HH:mm'|'YYYY.MM.DD HH'|'YYYY.MM.DD HH:mm:ss'|'DD.MM.YYYY HH:mm:ss'|'DD.MM.YYYY HH:mm'|'dddd'|'HH:mm:ss'|'HH:mm'|'X'|'x'|'DD-MM-YYYY'|'YYYY.MM.DD'|'DD-MM-YYYY HH'|'DD-MM-YYYY HH:mm'|'DD-MM-YYYY HH:mm:ss'} template - format template
	 * @returns {string|Error}
	 */
	format(template) {
		isInvalid(this.date);
		return format(this, template);
	}

	/**
	 * returns boolean about invalid date or not
	 * if invalid will be turn false
	 *
	 * @returns {boolean}
	 */
	isValid() {
		try {
			isInvalid(this.date);
		} catch (error) {
			return false;
		}
		return true;
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
}

/**
 *
 * @param {KkDate.date|Date} date
 * @returns
 */
function isInvalid(date) {
	try {
		if (!date || Number.isNaN(date.valueOf())) {
			throw new Error('Invalid Date');
		}
	} catch (error) {
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
 * @param {KkDate|Date} date
 * @param {string} template
 * @returns {string|Error}
 */
function format(date, template) {
	switch (template) {
		case 'YYYY-MM-DD HH:mm:ss':
			return `${formatter(date.date, 'YYYY-MM-DD')} ${formatter(date.date, 'HH:mm:ss')}`;
		case 'YYYY-MM-DDTHH:mm:ss':
			return `${formatter(date.date, 'YYYY-MM-DD')}T${formatter(date.date, 'HH:mm:ss')}`;
		case 'YYYY-MM-DD HH:mm':
			return `${formatter(date.date, 'YYYY-MM-DD')} ${formatter(date.date, 'HH:mm')}`;
		case 'YYYY-MM-DD HH':
			return `${formatter(date.date, 'YYYY-MM-DD')} ${formatter(date.date, 'HH')}`;
		case 'YYYY-MM-DD':
			return formatter(date.date, template);
		case 'DD.MM.YYYY':
			return formatter(date.date, template);
		case 'YYYY.MM.DD':
			return `${formatter(date.date, 'YYYY.MM.DD')}`;
		case 'YYYY.MM.DD HH:mm':
			return `${formatter(date.date, 'YYYY.MM.DD')} ${formatter(date.date, 'HH:mm')}`;
		case 'YYYY.MM.DD HH':
			return `${formatter(date.date, 'YYYY.MM.DD')} ${formatter(date.date, 'HH')}`;
		case 'YYYY.MM.DD HH:mm:ss':
			return `${formatter(date.date, 'YYYY.MM.DD')} ${formatter(date.date, 'HH:mm:ss')}`;
		case 'DD-MM-YYYY HH:mm:ss':
			return `${formatter(date.date, 'DD-MM-YYYY')} ${formatter(date.date, 'HH:mm:ss')}`;
		case 'DD-MM-YYYY HH:mm':
			return `${formatter(date.date, 'DD-MM-YYYY')} ${formatter(date.date, 'HH:mm')}`;
		case 'DD-MM-YYYY HH':
			return `${formatter(date.date, 'DD-MM-YYYY')} ${formatter(date.date, 'HH')}`;
		case 'DD-MM-YYYY':
			return `${formatter(date.date, 'DD-MM-YYYY')}`;
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
		case 'X':
			return formatter(date.date, template);
		case 'x':
			return formatter(date.date, template);
		default:
			return formatter(date.date, template);
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
 * @param {string|Date|KkDate} start
 * @param {string|Date|KkDate} end
 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
 * @param {boolean} is_decimal
 * @returns {object}
 */
function diff(start, end, type, is_decimal = false, turn_difftime = false) {
	const startDate = start.getDate();
	const endDate = new KkDate(end).getDate();
	let type_value = null;
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
function formatter(orj_this, template = null) {
	isInvalid(orj_this);
	if (template === 'X') {
		return parseInt(orj_this.valueOf() / 1000, 10);
	}
	if (template === 'x') {
		return parseInt(orj_this.valueOf(), 10);
	}
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
			return `${day}.${month}.${year}`;
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
		case null: {
			const timezoneOffset = -orj_this.getTimezoneOffset();
			const sign = timezoneOffset >= 0 ? '+' : '-';
			const absOffset = Math.abs(timezoneOffset);
			const offsetHours = padZero(Math.floor(absOffset / 60));
			const offsetMinutes = padZero(absOffset % 60);
			return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
		}
		default:
			throw new Error('template is not right');
	}
}
/**
 * padZero
 *
 * @param {number} num
 * @returns {string}
 */
const padZero = (num) => String(num).padStart(2, '0');

/**
 *
 * @param {KkDate.date_string} date_string
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

module.exports = KkDate;
