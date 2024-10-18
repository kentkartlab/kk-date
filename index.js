const global_config = {
	locales: 'en-en',
	options: {
		weekday: 'long',
	},
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
	YYYYMMDD: 'YYYYMMDD',
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
	YYYYMMDD: /^(|17|18|19|20|21)\d\d(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/,
	'YYYY-MM-DD HH:mm:ss': /^(|17|18|19|20|21)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'YYYY-MM-DD HH:mm': /^(|17|18|19|20|21)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-9]):([0-5]\d)$/,
	'YYYY.MM.DD': /^(|17|18|19|20|21)\d\d\.(0[1-9]|1[0-2])\.(0[1-9]|[12][0-9]|3[01])$/,
	'YYYY.MM.DD HH:mm:ss': /^(|17|18|19|20|21)\d\d\.(0[1-9]|1[0-2])\.(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'YYYY.MM.DD HH:mm': /^(|17|18|19|20|21)\d\d\.(0[1-9]|1[0-2])\.(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-9]):([0-5]\d)$/,
	'DD.MM.YYYY': /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(|17|18|19|20|21)\d\d$/,
	'DD.MM.YYYY HH:mm:ss': /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'DD.MM.YYYY HH:mm': /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d)$/,
	'DD-MM-YYYY': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(|17|18|19|20|21)\d\d$/,
	'DD-MM-YYYY HH:mm:ss': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'DD-MM-YYYY HH:mm': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d)$/,
	'HH:mm:ss': /^([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'HH:mm': /^([01]\d|2[0-9]):([0-5]\d)$/,
	HH: /^([01]\d|2[0-9])$/,
	mm: /^([0-5]\d)$/,
	ss: /^([0-5]\d)$/,
};

const timeInMilliseconds = {
	year: 365 * 24 * 60 * 60 * 1000, // 1 year (365 days)
	month: 31 * 24 * 60 * 60 * 1000, // 1 month (31 days)
	week: 7 * 24 * 60 * 60 * 1000, // 1 week (7 days)
	day: 24 * 60 * 60 * 1000, // 1 day (24 hours)
	hour: 60 * 60 * 1000, // 1 hour
	minute: 60 * 1000, // 1 minute
	second: 1000, // 1 second
};
/**
 * @kkDate method
 */
class KkDate {
	/**
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 */
	constructor(...params) {
		if (params.length === 0) {
			this.date = new Date();
		} else {
			const date = params[0];
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
						const [day, month, year] = date.split('-');
						this.date = new Date(`${year}-${month}-${day}`);
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
					} else if (isValid(date, format_types['YYYYMMDD'])) {
						const year = parseInt(date.substring(0, 4), 10); // Extract year
						const month = parseInt(date.substring(4, 6), 10) - 1; // Extract month (0-based index)
						const day = parseInt(date.substring(6, 8), 10); // Extract day

						this.date = new Date(`${year}-${month}-${day}`);
					}
					if (this.date === false) {
						this.date = new Date(`${date}`);
					}
				}
			}
			isInvalid(this.date);
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
	 * @param {object} options
	 * @returns {string|Error}
	 */
	toLocaleDateString(options) {
		isInvalid(this.date);
		if (!this.temp_config) {
			this.temp_config = {
				locales: global_config.locales || 'en-en',
			};
		}
		return this.date.toLocaleDateString(this.temp_config.locales, options);
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
				locales: global_config.locales || 'en-en',
			};
		}
		return this.date.toLocaleString(this.temp_config.locales, options);
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
				locales: global_config.locales || 'en-en',
			};
		}
		return this.date.toLocaleTimeString(this.temp_config.locales, options);
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

		if (typeof amount !== 'number' || (typeof amount !== 'number' && typeof amount === 'object' && amount.$kk_date === undefined)) {
			throw new Error('amount is wrong');
		}

		let defined_amount = amount;
		let defined_type = type;

		if (typeof amount === 'object' && amount.$kk_date) {
			defined_type = 'seconds';
			defined_amount = amount.$kk_date.milliseconds / timeInMilliseconds.second;
		}
		switch (defined_type) {
			case 'days':
				this.date.setDate(this.date.getDate() + defined_amount);
				break;
			case 'minutes':
				this.date.setMinutes(this.date.getMinutes() + defined_amount);
				break;
			case 'seconds':
				this.date.setSeconds(this.date.getSeconds() + defined_amount);
				break;
			case 'hours':
				this.date.setHours(this.date.getHours() + defined_amount);
				break;
			case 'months':
				this.date.setMonth(this.date.getMonth() + defined_amount);
				break;
			case 'years': {
				const year_amount = defined_amount * 12;
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
		rangeDates.push(format(this, template));
		for (let index = 1; index < diffed.diffTime + 1; index++) {
			const date = new Date(this.date.getTime());
			date.setSeconds(this.date.getSeconds() + diffed.type_value * index);
			rangeDates.push(format(new KkDate(date), template));
		}
		return rangeDates;
	}

	/**
	 * set method of Date instances changes
	 *
	 * @param {'second'|'minute'|'hour'|'day'|'month'|'year'} type - The unit of time type
	 * @param {number} value
	 * @returns {KkDate|Error}
	 */
	set(type, value) {
		switch (type) {
			case 'second':
				this.date.setSeconds(value);
				break;
			case 'minute':
				this.date.setMinutes(value);
				break;
			case 'hour':
				this.date.setHours(value);
				break;
			case 'day':
				this.date.setDate(value);
				break;
			case 'month':
				this.date.setMonth(value);
				break;
			case 'year':
				this.date.setFullYear(value);
				break;
			default:
				throw new Error('type wrong');
		}
		return this;
	}

	/**
	 * date format advanced
	 *
	 * @param  {string} template
	 * @returns {string|Error}
	 */
	format_c(separator = ' ', ...template) {
		isInvalid(this.date);
		const result = [];
		for (let index = 0; index < template.length; index++) {
			result.push(formatter(this, template[index]));
		}
		return result.join(separator);
	}

	/**
	 * basic formatter
	 *
	 * @param {'YYYY-MM-DD HH:mm:ss'|'YYYY-MM-DDTHH:mm:ss'|'YYYY-MM-DD HH:mm'|'YYYY-MM-DD HH'|'YYYY-MM-DD'|'YYYYMMDD'|'DD.MM.YYYY'|'YYYY.MM.DD HH:mm'|'YYYY.MM.DD HH'|'YYYY.MM.DD HH:mm:ss'|'DD.MM.YYYY HH:mm:ss'|'DD.MM.YYYY HH:mm'|'dddd'|'HH:mm:ss'|'HH:mm'|'X'|'x'|'DD-MM-YYYY'|'YYYY.MM.DD'|'DD-MM-YYYY HH'|'DD-MM-YYYY HH:mm'|'DD-MM-YYYY HH:mm:ss'} template - format template
	 * @returns {string|Error}
	 */
	format(template) {
		isInvalid(this.date);
		return format(this, template);
	}

	/**
	 * @description kk-date config for in call
	 *
	 * @param {string} locales BCP 47 language tag
	 * @param {object} options
	 * @param {'short'|'long'} options.weekday
	 * @returns {Error|KkDate}
	 */
	config(locales, options = null) {
		try {
			new Intl.Locale(locales);
			this.temp_config = {
				locales: locales,
				options: {
					weekday: 'long',
				},
			};
			if (options && typeof options === 'object') {
				if (options.weekday) {
					this.temp_config.options.weekday = options.weekday;
				}
			}
			return this;
		} catch (error) {
			throw new Error('locales not valid for BCP 47, config error !');
		}
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

	/**
	 * @description It divides the date string into parts and returns an object.
	 * @param {string} time - time seconds
	 * @returns {{year: number, month: number, week:number, day: number, hour: number, minute: number, second: number}}
	 */
	duration(time) {
		const response = {
			year: 0,
			month: 0,
			week: 0,
			day: 0,
			hour: 0,
			minute: 0,
			second: 0,
		};

		if (!time || typeof time !== 'number' || time < 0) {
			throw new Error('Invalid time');
		}

		let seconds = time;
		response.year = Math.floor(seconds / howManySeconds.year);
		seconds = seconds % howManySeconds.year;
		response.month = Math.floor(seconds / howManySeconds.month);
		seconds = seconds % howManySeconds.month;
		response.week = Math.floor(seconds / howManySeconds.week);
		seconds = seconds % howManySeconds.week;
		response.day = Math.floor(seconds / howManySeconds.day);
		seconds = seconds % howManySeconds.day;
		response.hour = Math.floor(seconds / howManySeconds.hour);
		seconds = seconds % howManySeconds.hour;
		response.minute = Math.floor(seconds / howManySeconds.minute);
		seconds = seconds % howManySeconds.minute;
		response.second = seconds;

		return response;
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
			return `${formatter(date, 'YYYY-MM-DD')} ${formatter(date, 'HH:mm:ss')}`;
		case 'YYYY-MM-DDTHH:mm:ss':
			return `${formatter(date, 'YYYY-MM-DD')}T${formatter(date, 'HH:mm:ss')}`;
		case 'YYYY-MM-DD HH:mm':
			return `${formatter(date, 'YYYY-MM-DD')} ${formatter(date, 'HH:mm')}`;
		case 'YYYY-MM-DD HH':
			return `${formatter(date, 'YYYY-MM-DD')} ${formatter(date, 'HH')}`;
		case 'YYYY-MM-DD':
			return formatter(date, template);
		case 'YYYYMMDD':
			return formatter(date, template);
		case 'DD.MM.YYYY':
			return formatter(date, template);
		case 'YYYY.MM.DD':
			return `${formatter(date, 'YYYY.MM.DD')}`;
		case 'YYYY.MM.DD HH:mm':
			return `${formatter(date, 'YYYY.MM.DD')} ${formatter(date, 'HH:mm')}`;
		case 'YYYY.MM.DD HH':
			return `${formatter(date, 'YYYY.MM.DD')} ${formatter(date, 'HH')}`;
		case 'YYYY.MM.DD HH:mm:ss':
			return `${formatter(date, 'YYYY.MM.DD')} ${formatter(date, 'HH:mm:ss')}`;
		case 'DD-MM-YYYY HH:mm:ss':
			return `${formatter(date, 'DD-MM-YYYY')} ${formatter(date, 'HH:mm:ss')}`;
		case 'DD-MM-YYYY HH:mm':
			return `${formatter(date, 'DD-MM-YYYY')} ${formatter(date, 'HH:mm')}`;
		case 'DD-MM-YYYY HH':
			return `${formatter(date, 'DD-MM-YYYY')} ${formatter(date, 'HH')}`;
		case 'DD-MM-YYYY':
			return `${formatter(date, 'DD-MM-YYYY')}`;
		case 'DD.MM.YYYY HH:mm:ss':
			return `${formatter(date, 'DD.MM.YYYY')} ${formatter(date, 'HH:mm:ss')}`;
		case 'DD.MM.YYYY HH:mm':
			return `${formatter(date, 'DD.MM.YYYY')} ${formatter(date, 'HH:mm')}`;
		case 'dddd':
			return formatter(date, template);
		case 'HH:mm:ss':
			return `${formatter(date, template)}`;
		case 'HH:mm':
			return `${formatter(date, template)}`;
		case 'X':
			return formatter(date, template);
		case 'x':
			return formatter(date, template);
		default:
			return formatter(date, template);
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
	const startDate = start.getTime();
	const endDate = new KkDate(end).getTime();
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
		type_value,
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
	isInvalid(orj_this.date);
	if (template === 'X') {
		return parseInt(orj_this.date.valueOf() / 1000, 10);
	}
	if (template === 'x') {
		return parseInt(orj_this.date.valueOf(), 10);
	}
	const year = orj_this.date.getFullYear();
	const month = String(orj_this.date.getMonth() + 1).padStart(2, '0'); // Aylar 0-11 arası olduğu için +1 ekliyoruz
	const day = String(orj_this.date.getDate()).padStart(2, '0');
	const minutes = String(orj_this.date.getMinutes()).padStart(2, '0');
	const seconds = String(orj_this.date.getSeconds()).padStart(2, '0');
	const hours = String(orj_this.date.getHours()).padStart(2, '0');

	switch (template) {
		case format_types.dddd:
			if (!orj_this.temp_config) {
				orj_this.temp_config = {};
			}
			return orj_this.date.toLocaleString(
				orj_this.temp_config.locales || global_config.locales,
				orj_this.temp_config.options || global_config.options,
			);
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
		case format_types['YYYYMMDD']:
			return `${year}${month}${day}`;
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
			const timezoneOffset = -orj_this.date.getTimezoneOffset();
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
		return true;
	}
	if (format_types_regex[template].test(date_string) === false) {
		return false;
	}
	return true;
}

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
 *
 * @param {*} locales
 * @param {object} options
 * @param {'short'|'long'} options.weekday
 * @returns {boolean}
 */
function config(locales, options = null) {
	try {
		new Intl.Locale(locales);
		global_config.locales = locales;
	} catch (error) {
		throw new Error('locales not valid for BCP 47');
	}
	if (options) {
		if (!Object.keys(options).length) {
			return true;
		}
		if (options && typeof options === 'object') {
			if (options.weekday) {
				global_config.options.weekday = options.weekday;
			}
		}
	}
	return true;
}

// kk date export default
module.exports = KkDate;

// another functions export
module.exports.config = config;
module.exports.duration = duration;
