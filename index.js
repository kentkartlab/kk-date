const nopeRedis = require('./nope-redis');
const {
	parseWithTimezone,
	getTimezoneOffset,
	absFloor,
	duration,
	padZero,
	checkTimezone,
	dateTimeFormat,
	converter,
	isValidMonth,
} = require('./functions');
const { cached_dateTimeFormat, format_types, timeInMilliseconds, format_types_regex, global_config } = require('./constants');

nopeRedis.config({ defaultTtl: 1300 });

/**
 * @class KkDate
 * @description A utility class for date parsing, validation, and formatting.
 * Accepts various input types (string, Date, KkDate) and supports multiple date formats
 * like "YYYY-MM-DD" or "YYYY-DD-MM".
 */
class KkDate {
	/**
	 * Constructs a KkDate instance with the given input and format.
	 *
	 * @param {string|Date|KkDate} date - The input value. Can be:
	 *  - a date string,
	 *  - a native Date object,
	 *  - another KkDate instance.
	 *
	 * @param {string} date_format - The format used to parse and validate the input.
	 * Supported formats include: `"YYYY-MM-DD"`, `"YYYY-DD-MM"`.
	 */
	constructor(...params) {
		let is_can_cache = false;
		let cached = false;
		this.detected_format = null;
		this.temp_config = {};
		if (params.length === 0) {
			this.date = new Date();
		} else {
			const date = params[0];
			let forced_format_founded = false;
			if (params[1]) {
				cached = nopeRedis.getItem(`${date}`);
				if (!cached) {
					if (!format_types_regex[params[1]]) {
						throw new Error(`Unsupported Format! ${params[1]} !`);
					}
					if (!format_types_regex[params[1]].test(params[0])) {
						throw new Error(`Invalid format ! ${format_types[params[1]]} !`);
					}
					if (params[1] === format_types['YYYY-DD-MM']) {
						is_can_cache = true;
						const [year, day, month] = date.split('-');
						this.date = new Date(`${year}-${month}-${day} 00:00:00`);
						forced_format_founded = true;
						this.detected_format = 'YYYY-DD-MM';
					} else if (params[1] === format_types['YYYY-MM-DD']) {
						is_can_cache = true;
						const [year, month, day] = date.split('-');
						this.date = new Date(`${year}-${month}-${day} 00:00:00`);
						forced_format_founded = true;
						this.detected_format = 'YYYY-MM-DD';
					}
				}
			}

			if (!forced_format_founded) {
				if (Number.isInteger(date)) {
					const stringed_date_length = `${date}`.length;
					if (stringed_date_length <= 10) {
						this.date = new Date(date * 1000);
					} else if (stringed_date_length > 10) {
						this.date = new Date(date);
					}
					this.detected_format = 'Xx';
				} else if (isKkDate(date)) {
					this.date = new Date(date.date.toUTCString());
					this.detected_format = 'kkDate';
				} else if (date instanceof Date) {
					this.date = new Date(date.getTime());
					this.detected_format = 'Date';
				} else {
					is_can_cache = true;
					cached = nopeRedis.getItem(`${date}`);
					if (!cached) {
						if (
							isValid(date, format_types['HH:mm:ss.SSS']) ||
							isValid(date, format_types['HH:mm:ss']) ||
							isValid(date, format_types['HH:mm']) ||
							isValid(date, format_types['hh:mm']) ||
							isValid(date, format_types['hh:mm:ss']) ||
							isValid(date, format_types['hh:mm:ss.SSS'])
						) {
							const [hours, minutes, seconds] = date.split(':').map((n) => parseInt(n, 10));
							const finalSeconds = Number.isNaN(seconds) || !seconds ? 0 : seconds;
							if (hours >= 24) {
								const extraDays = Math.floor(hours / 24);
								const remainingHours = hours % 24;
								const currentDate = new Date();
								currentDate.setDate(currentDate.getDate() + extraDays);
								currentDate.setHours(remainingHours, minutes, finalSeconds, 0);
								this.date = currentDate;
							} else {
								const currentDate = new Date();
								currentDate.setHours(hours, minutes, finalSeconds, 0);
								this.date = currentDate;
							}
							this.detected_format = format_types['HH:mm:ss'];
						} else {
							this.date = false;
							if (isValid(date, format_types['DD.MM.YYYY HH:mm:ss'])) {
								const [datePart, timePart] = date.split(' ');
								const [day, month, year] = datePart.split('.');
								const [hours, minutes, seconds] = timePart.split(':').map(Number);
								if (hours >= 24) {
									const extraDays = Math.floor(hours / 24);

									const dateObj = new Date(`${year}-${month}-${day} 00:00:00`);
									dateObj.setDate(dateObj.getDate() + extraDays);

									const newDay = String(dateObj.getDate()).padStart(2, '0');
									const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
									const newYear = dateObj.getFullYear();

									this.date = new Date(
										`${newYear}-${newMonth}-${newDay}T${(hours % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
									);
								} else {
									this.date = new Date(`${year}-${month}-${day}T${timePart}`);
								}
								this.detected_format = format_types['DD.MM.YYYY HH:mm:ss'];
							} else if (isValid(date, format_types['DD.MM.YYYY HH:mm'])) {
								const [datePart, timePart] = date.split(' ');
								const [day, month, year] = datePart.split('.');
								const [hours, minutes] = timePart.split(':').map(Number);
								if (hours >= 24) {
									const extraDays = Math.floor(hours / 24);

									const dateObj = new Date(`${year}-${month}-${day} 00:00:00`);
									dateObj.setDate(dateObj.getDate() + extraDays);

									const newDay = String(dateObj.getDate()).padStart(2, '0');
									const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
									const newYear = dateObj.getFullYear();

									this.date = new Date(
										`${newYear}-${newMonth}-${newDay}T${(hours % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
									);
								} else {
									this.date = new Date(`${year}-${month}-${day}T${timePart}`);
								}
								this.detected_format = format_types['DD.MM.YYYY HH:mm'];
							} else if (isValid(date, format_types['DD.MM.YYYY'])) {
								const [day, month, year] = date.split('.');
								this.date = new Date(`${year}-${month}-${day} 00:00:00`);
								this.detected_format = format_types['DD.MM.YYYY'];
							} else if (isValid(date, format_types['YYYY-MM-DD HH:mm:ss'])) {
								const [datePart, timePart] = date.split(' ');
								const [year, month, day] = datePart.split('-');
								const [hours, minutes, seconds] = timePart.split(':').map(Number);
								if (hours >= 24) {
									const extraDays = Math.floor(hours / 24);
									const dateObj = new Date(`${year}-${month}-${day} 00:00:00`);
									dateObj.setDate(dateObj.getDate() + extraDays);

									const newDay = String(dateObj.getDate()).padStart(2, '0');
									const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
									const newYear = dateObj.getFullYear();

									this.date = new Date(
										`${newYear}-${newMonth}-${newDay}T${(hours % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
									);
								} else {
									this.date = new Date(`${year}-${month}-${day}T${timePart}`);
								}
								this.detected_format = format_types['YYYY-MM-DD HH:mm:ss'];
							} else if (isValid(date, format_types['YYYY-MM-DD HH:mm'])) {
								const [datePart, timePart] = date.split(' ');
								const [year, month, day] = datePart.split('-');
								const [hours, minutes] = timePart.split(':').map(Number);
								if (hours >= 24) {
									const extraDays = Math.floor(hours / 24);
									const dateObj = new Date(`${year}-${month}-${day} 00:00:00`);
									dateObj.setDate(dateObj.getDate() + extraDays);

									const newDay = String(dateObj.getDate()).padStart(2, '0');
									const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
									const newYear = dateObj.getFullYear();

									this.date = new Date(
										`${newYear}-${newMonth}-${newDay}T${(hours % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
									);
								} else {
									this.date = new Date(`${year}-${month}-${day}T${timePart}`);
								}
								this.detected_format = format_types['YYYY-MM-DD HH:mm'];
							} else if (isValid(date, format_types['YYYY.MM.DD HH:mm:ss'])) {
								const [datePart, timePart] = date.split(' ');
								const [year, month, day] = datePart.split('.');
								const [hours, minutes, seconds] = timePart.split(':').map(Number);
								if (hours >= 24) {
									const extraDays = Math.floor(hours / 24);

									const dateObj = new Date(`${year}-${month}-${day} 00:00:00`);
									dateObj.setDate(dateObj.getDate() + extraDays);

									const newDay = String(dateObj.getDate()).padStart(2, '0');
									const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
									const newYear = dateObj.getFullYear();

									this.date = new Date(
										`${newYear}-${newMonth}-${newDay}T${(hours % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
									);
								} else {
									this.date = new Date(`${year}-${month}-${day}T${timePart}`);
								}
								this.detected_format = format_types['YYYY.MM.DD HH:mm:ss'];
							} else if (isValid(date, format_types['YYYY.MM.DD HH:mm'])) {
								const [datePart, timePart] = date.split(' ');
								const [year, month, day] = datePart.split('.');
								const [hours, minutes] = timePart.split(':').map(Number);
								if (hours >= 24) {
									const extraDays = Math.floor(hours / 24);

									const dateObj = new Date(`${year}-${month}-${day} 00:00:00`);
									dateObj.setDate(dateObj.getDate() + extraDays);

									const newDay = String(dateObj.getDate()).padStart(2, '0');
									const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
									const newYear = dateObj.getFullYear();

									this.date = new Date(
										`${newYear}-${newMonth}-${newDay}T${(hours % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}}`,
									);
								} else {
									this.date = new Date(`${year}-${month}-${day}T${timePart}`);
								}
								this.detected_format = format_types['YYYY.MM.DD HH:mm'];
							} else if (isValid(date, format_types['DD-MM-YYYY'])) {
								const [day, month, year] = date.split('-');
								this.date = new Date(`${year}-${month}-${day} 00:00:00`);
								this.detected_format = format_types['DD-MM-YYYY'];
							} else if (isValid(date, format_types['DD-MM-YYYY HH:mm:ss'])) {
								const [datePart, timePart] = date.split(' ');
								const [day, month, year] = datePart.split('-');
								const [hours, minutes, seconds] = timePart.split(':').map(Number);
								if (hours >= 24) {
									const extraDays = Math.floor(hours / 24);

									const dateObj = new Date(`${year}-${month}-${day} 00:00:00`);
									dateObj.setDate(dateObj.getDate() + extraDays);

									const newDay = String(dateObj.getDate()).padStart(2, '0');
									const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
									const newYear = dateObj.getFullYear();

									this.date = new Date(
										`${newYear}-${newMonth}-${newDay}T${(hours % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
									);
								} else {
									this.date = new Date(`${year}-${month}-${day}T${timePart}`);
								}
								this.detected_format = format_types['DD-MM-YYYY HH:mm:ss'];
							} else if (isValid(date, format_types['DD-MM-YYYY HH:mm'])) {
								const [datePart, timePart] = date.split(' ');
								const [day, month, year] = datePart.split('-');
								const [hours, minutes] = timePart.split(':').map(Number);
								if (hours >= 24) {
									const extraDays = Math.floor(hours / 24);

									const dateObj = new Date(`${year}-${month}-${day} 00:00:00`);
									dateObj.setDate(dateObj.getDate() + extraDays);

									const newDay = String(dateObj.getDate()).padStart(2, '0');
									const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
									const newYear = dateObj.getFullYear();

									this.date = new Date(
										`${newYear}-${newMonth}-${newDay}T${(hours % 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
									);
								} else {
									this.date = new Date(`${year}-${month}-${day}T${timePart}`);
								}
								this.detected_format = format_types['DD-MM-YYYY HH:mm'];
							} else if (isValid(date, format_types['DD MMMM YYYY'])) {
								const parts = date.split(' ');
								const day = parseInt(parts[0], 10).toString();
								const month = isValidMonth(parts[1]);
								const year = parts[2];
								this.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
								this.detected_format = format_types['DD MMMM YYYY'];
							} else if (isValid(date, format_types['YYYYMMDD'])) {
								const year = String(date.substring(0, 4), 10); // Extract year
								const month = String(date.substring(4, 6), 10); // Extract month
								const day = String(date.substring(6, 8), 10); // Extract day
								this.date = new Date(`${year}-${month}-${day} 00:00:00`);
								this.detected_format = format_types['YYYYMMDD'];
							} else if (isValid(date, format_types['YYYY-MM'])) {
								const [year, month] = date.split('-');
								this.date = new Date(`${year}-${month}-01 00:00:00`);
								this.detected_format = format_types['YYYY-MM'];
							} else if (isValid(date, format_types['DD MMMM dddd'])) {
								const currentYear = new Date().getFullYear();
								const parts = date.split(' '); // e.g., ['01', 'January', 'Monday']
								const day = parts[0];
								const month = isValidMonth(parts[1]);
								this.date = new Date(`${currentYear}-${month}-${day} 00:00:00`);
								this.detected_format = format_types['DD MMMM dddd'];
							} else if (isValid(date, format_types['YYYY-MM-DD'])) {
								const [year, month, day] = date.split('-');
								this.date = new Date(`${year}-${month}-${day} 00:00:00`);
								this.detected_format = format_types['YYYY-MM-DD'];
							} else if (isValid(date, format_types['YYYY-DD-MM'])) {
								const [year, day, month] = date.split('-');
								this.date = new Date(`${year}-${month}-${day} 00:00:00`);
								this.detected_format = format_types['YYYY-DD-MM'];
							} else if (isValid(date, format_types['D MMMM YYYY'])) {
								const parts = date.split(' '); // e.g., ['1', 'January', '2024'] or ['01', 'January', '2024']
								const day = parts[0];
								const year = parts[2];
								const month = isValidMonth(parts[1]);
								this.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
								this.detected_format = format_types['D MMMM YYYY'];
							} else if (isValid(date, format_types['YYYY MMM DD']) || isValid(date, format_types['YYYY MMMM DD'])) {
								const parts = date.split(' ');
								const year = parts[0];
								const month = isValidMonth(parts[1]);
								const day = parts[2];
								this.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
								this.detected_format = format_types['YYYY MMM DD'];
							} else if (isValid(date, format_types['Do MMM YYYY']) || isValid(date, format_types['Do MMM YYYY'])) {
								const parts = date.split(' ');
								const day = parseInt(parts[0], 10).toString();
								const month = isValidMonth(parts[1]);
								const year = parts[2];
								this.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
								this.detected_format = format_types['Do MMM YYYY'];
							} else if (isValid(date, format_types['DD MMMM dddd, YYYY'])) {
								const parts = date.split(' ');
								const day = parseInt(parts[0], 10).toString();
								const month = isValidMonth(parts[1]);
								const year = parts[3];
								this.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
								this.detected_format = format_types['YYYY.MM.DD HH:mm'];
							} else if (isValid(date, format_types['dddd, DD MMMM YYYY'])) {
								const parts = date.split(' ');
								const day = parseInt(parts[1], 10).toString();
								const month = isValidMonth(parts[2]);
								const year = parts[3];
								this.date = new Date(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
								this.detected_format = format_types['dddd, DD MMMM YYYY'];
							} else if (isValid(date, format_types['DD MMMM'])) {
								const currentYear = new Date().getFullYear();
								const parts = date.split(' ');
								const day = parts[0];
								const month = isValidMonth(parts[1]);
								this.date = new Date(`${currentYear}-${month}-${day.padStart(2, '0')} 00:00:00`);
								this.detected_format = format_types['DD MMMM'];
							}
							if (this.date === false) {
								this.date = new Date(`${date}`);
							}
						}
					}
				}
			}

			if (is_can_cache && cached) {
				this.date = new Date(cached.getTime());
			} else {
				isInvalid(this.date);
				if (is_can_cache) {
					nopeRedis.setItemAsync(`${date}`, new Date(this.date.getTime()));
				}
			}
		}
		this.temp_config.rtf = {};
		this.date = parseWithTimezone(this, true);
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
	 * @returns {number|Error}
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
			case 'months': {
				const currentDate = this.date.getDate();
				const currentMonth = this.date.getMonth();
				// Ay eklemenin düzgün olması için tarihin 1. gününü kullanıyoruz.
				this.date.setDate(1);
				this.date.setMonth(currentMonth + defined_amount);
				// 29 çeken şubat aylarında, değişkendeki günle güncel günü karşılaştırıp son günü alıyoruz.
				const lastDay = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).getDate();
				this.date.setDate(Math.min(currentDate, lastDay));
				break;
			}
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
	diff_range(end, type, template = format_types['YYYY-MM-DD']) {
		const diffed = diff(this, end, type);
		const rangeDates = [];
		rangeDates.push(formatter(this, template));
		for (let index = 1; index < diffed.diffTime + 1; index++) {
			const date = new Date(this.date.getTime());
			date.setSeconds(this.date.getSeconds() + diffed.type_value * index);
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
		switch (type) {
			case 'seconds':
				this.date.setSeconds(value);
				break;
			case 'minutes':
				this.date.setMinutes(value);
				break;
			case 'hours':
				this.date.setHours(value);
				break;
			case 'days':
				this.date.setDate(value);
				break;
			case 'months':
				this.date.setMonth(value);
				break;
			case 'years':
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
	 * @param {'YYYY-MM-DD HH:mm:ss'|'YYYY-MM-DDTHH:mm:ss'|'YYYY-MM-DD HH:mm'|'YYYY-MM-DD HH'|
	 * 'YYYY-MM-DD'|'YYYYMMDD'|'DD.MM.YYYY'|'YYYY.MM.DD HH:mm'|'YYYY.MM.DD HH'|
	 * 'YYYY.MM.DD HH:mm:ss'|'DD.MM.YYYY HH:mm:ss'|'DD.MM.YYYY HH:mm'|'dddd'|
	 * 'HH:mm:ss'|'HH:mm'|'X'|'x'|'DD-MM-YYYY'|'YYYY.MM.DD'|'DD-MM-YYYY HH'|
	 * 'DD-MM-YYYY HH:mm'|'DD-MM-YYYY HH:mm:ss'|'DD MMMM YYYY'|'DD MMMM YYYY dddd'|
	 * 'MMMM YYYY'|'DD MMMM dddd YYYY'|'MMM'|'MMMM'|'ddd'|'DD MMM YYYY'|'DD MMM'|
	 * 'MMM YYYY'|'DD MMM YYYY HH:mm'} template - format template
	 * @returns {string|Error}
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
		if (options.timezone) {
			this.temp_config.timezone = options.timezone;
			this.temp_config.rtf = {};
		}
		if (typeof options.weekStartDay === 'number') {
			isValidWeekStartDay(options.weekStartDay);
			this.temp_config.weekStartDay = options.weekStartDay;
		}
		try {
			if (options.locale) {
				this.temp_config.locale = options.locale;
				this.temp_config.rtf[options.locale] = new Intl.RelativeTimeFormat(options.locale, { numeric: 'auto' });
				if (cached_dateTimeFormat.temp['dddd'][options.locale]) {
					return this;
				}
				new Intl.Locale(options.locale);
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
		try {
			isInvalid(this.date);
		} catch {
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
		this.temp_config.timezone = timezone;
		this.date = parseWithTimezone(this);
		return this;
	}

	/**
	 * @description Returns startOf date of the unit of time.
	 * @param {'years'|'months'|'weeks'|'days'|'hours'|'minutes'|'seconds'} unit
	 * @returns {KkDate}
	 */
	startOf(unit) {
		switch (unit) {
			case 'years':
				this.date.setMonth(0, 1);
				this.date.setHours(0, 0, 0, 0);
				break;
			case 'months':
				this.date.setDate(1);
				this.date.setHours(0, 0, 0, 0);
				break;
			case 'weeks': {
				const dayOfWeek = this.date.getDay();
				const weekStartDay = this.temp_config.weekStartDay || global_config.weekStartDay;
				const diff = dayOfWeek < weekStartDay ? dayOfWeek + (7 - weekStartDay) : dayOfWeek - weekStartDay;
				this.date.setDate(this.date.getDate() - diff);
				this.date.setHours(0, 0, 0, 0);
				break;
			}
			case 'days':
				this.date.setHours(0, 0, 0, 0);
				break;
			case 'hours':
				this.date.setMinutes(0, 0, 0);
				break;
			case 'minutes':
				this.date.setSeconds(0, 0);
				break;
			case 'seconds':
				this.date.setMilliseconds(0);
				break;
			default:
				throw new Error(`Invalid unit for startOf: ${unit}`);
		}
		return this;
	}

	/**
	 * @description returns endOf date of the unit of time.
	 * @param {'years'|'months'|'weeks'|'days'|'hours'|'minutes'|'seconds'} unit
	 * @returns {KkDate}
	 */
	endOf(unit) {
		switch (unit) {
			case 'years':
				this.date.setMonth(11, 31);
				this.date.setHours(23, 59, 59, 999);
				break;
			case 'months': {
				const year = this.date.getFullYear();
				const month = this.date.getMonth();
				this.date.setDate(new Date(year, month + 1, 0).getDate());
				this.date.setHours(23, 59, 59, 999);
				break;
			}
			case 'weeks': {
				this.startOf('weeks');
				this.date.setDate(this.date.getDate() + 6);
				this.date.setHours(23, 59, 59, 999);
				break;
			}
			case 'days':
				this.date.setHours(23, 59, 59, 999);
				break;
			case 'hours':
				this.date.setMinutes(59, 59, 999);
				break;
			case 'minutes':
				this.date.setSeconds(59, 999);
				break;
			case 'seconds':
				this.date.setMilliseconds(999);
				break;
			default:
				throw new Error(`Invalid unit for endOf: ${unit}`);
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
			try {
				rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
				this.temp_config.rtf[locale] = rtf;
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

/**
 *
 * @param {Date} this.date
 * @param {string} template
 * @returns {string}
 */
function formatter(orj_this, template = null) {
	isInvalid(orj_this.date);
	switch (template) {
		case 'x': {
			return parseInt(orj_this.valueOfLocal(true), 10);
		}
		case 'X': {
			return parseInt(orj_this.valueOfLocal(true) / 1000, 10);
		}
		case format_types.dddd: {
			return dateTimeFormat(orj_this, template).format(orj_this.date);
		}
		case format_types.DD: {
			return converter(orj_this.date, ['day']).day;
		}
		case format_types.MM: {
			return converter(orj_this.date, ['month']).month;
		}
		case format_types['DD-MM-YYYY']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.day}-${result.month}-${result.year}`;
		}
		case format_types['DD-MM-YYYY HH:mm']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes']);
			return `${result.day}-${result.month}-${result.year} ${result.hours}:${result.minutes}`;
		}
		case format_types['DD-MM-YYYY HH:mm:ss']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes', 'seconds']);
			return `${result.day}-${result.month}-${result.year} ${result.hours}:${result.minutes}:${result.seconds}`;
		}
		case format_types['DD.MM.YYYY']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.day}.${result.month}.${result.year}`;
		}
		case format_types['MM/DD/YYYY']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.month}/${result.day}/${result.year}`;
		}
		case format_types['DD/MM/YYYY']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.day}/${result.month}/${result.year}`;
		}
		case format_types['DD.MM.YYYY HH:mm:ss']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes', 'seconds']);
			return `${result.day}.${result.month}.${result.year} ${result.hours}:${result.minutes}:${result.seconds}`;
		}
		case format_types['DD.MM.YYYY HH:mm']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes']);
			return `${result.day}.${result.month}.${result.year} ${result.hours}:${result.minutes}`;
		}
		case format_types['YYYY-MM-DD']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.year}-${result.month}-${result.day}`;
		}
		case format_types['YYYY-MM-DD HH:mm:ss']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes', 'seconds']);
			return `${result.year}-${result.month}-${result.day} ${result.hours}:${result.minutes}:${result.seconds}`;
		}
		case format_types['YYYY-MM-DDTHH:mm:ss']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes', 'seconds']);
			return `${result.year}-${result.month}-${result.day}T${result.hours}:${result.minutes}:${result.seconds}`;
		}
		case format_types['YYYY.MM.DD HH:mm:ss']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes', 'seconds']);
			return `${result.year}.${result.month}.${result.day} ${result.hours}:${result.minutes}:${result.seconds}`;
		}
		case format_types['YYYY-MM-DD HH']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours']);
			return `${result.year}-${result.month}-${result.day} ${result.hours}`;
		}
		case format_types['DD-MM-YYYY HH']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours']);
			return `${result.day}-${result.month}-${result.year} ${result.hours}`;
		}
		case format_types['YYYY.MM.DD HH']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours']);
			return `${result.year}.${result.month}.${result.day} ${result.hours}`;
		}
		case format_types['YYYY.MM.DD']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.year}.${result.month}.${result.day}`;
		}
		case format_types['YYYYMMDD']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.year}${result.month}${result.day}`;
		}
		case format_types.YYYY: {
			return `${converter(orj_this.date, ['year']).year}`;
		}
		case format_types['HH:mm:ss.SSS']: {
			const result = converter(orj_this.date, ['hours', 'minutes', 'seconds', 'milliseconds']);
			return `${result.hours}:${result.minutes}:${result.seconds}.${result.milliseconds}`;
		}
		case format_types['HH:mm:ss']: {
			const result = converter(orj_this.date, ['hours', 'minutes', 'seconds']);
			return `${result.hours}:${result.minutes}:${result.seconds}`;
		}
		case format_types['HH:mm']: {
			const result = converter(orj_this.date, ['hours', 'minutes']);
			return `${result.hours}:${result.minutes}`;
		}
		case format_types.mm: {
			return `${converter(orj_this.date, ['minutes']).minutes}`;
		}
		case format_types.ss: {
			return `${converter(orj_this.date, ['seconds']).seconds}`;
		}
		case format_types.HH: {
			return `${converter(orj_this.date, ['hours']).hours}`;
		}
		case format_types['DD MMMM YYYY']: {
			const result = converter(orj_this.date, ['day', 'year']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)} ${result.year}`;
		}
		case format_types['DD MMMM YYYY dddd']: {
			const result = converter(orj_this.date, ['day', 'year']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)} ${result.year} ${dateTimeFormat(orj_this, 'dddd').format(orj_this.date)}`;
		}
		case format_types['DD MMM YYYY dddd']: {
			const result = converter(orj_this.date, ['day', 'year']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)} ${result.year} ${dateTimeFormat(orj_this, 'dddd').format(orj_this.date)}`;
		}
		case format_types['MMMM YYYY']: {
			const result = converter(orj_this.date, ['year']);
			return `${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)} ${result.year}`;
		}
		case format_types['DD MMMM dddd YYYY']: {
			const result = converter(orj_this.date, ['day', 'year']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)} ${dateTimeFormat(orj_this, 'dddd').format(orj_this.date)} ${result.year}`;
		}
		case format_types['DD MMM dddd, YYYY']: {
			const result = converter(orj_this.date, ['day', 'year']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)} ${dateTimeFormat(orj_this, 'dddd').format(orj_this.date)}, ${result.year}`;
		}
		case format_types['MMM']: {
			return dateTimeFormat(orj_this, 'MMM').format(orj_this.date);
		}
		case format_types['MMMM']: {
			return dateTimeFormat(orj_this, 'MMMM').format(orj_this.date);
		}
		case format_types['ddd']: {
			return dateTimeFormat(orj_this, 'ddd').format(orj_this.date);
		}
		case format_types['DD MMM YYYY']: {
			const result = converter(orj_this.date, ['day', 'year']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)} ${result.year}`;
		}
		case format_types['DD MMM']: {
			const result = converter(orj_this.date, ['day']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)}`;
		}
		case format_types['MMM YYYY']: {
			return `${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)} ${converter(orj_this.date, ['year']).year}`;
		}
		case format_types['DD MMM YYYY HH:mm']: {
			const result = converter(orj_this.date, ['day', 'year', 'hours', 'minutes']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)} ${result.year} ${result.hours}:${result.minutes}`;
		}
		case format_types['YYYY-MM']: {
			const result = converter(orj_this.date, ['month', 'year']);
			return `${result.year}-${result.month}`;
		}
		case format_types['DD MMMM dddd']: {
			return `${converter(orj_this.date, ['day']).day} ${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)} ${dateTimeFormat(orj_this, 'dddd').format(orj_this.date)}`;
		}
		case format_types['YYYY-DD-MM']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.year}-${result.day}-${result.month}`;
		}
		case format_types['DD MMMM']: {
			const result = converter(orj_this.date, ['day']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)}`;
		}
		case format_types['D MMMM YYYY']: {
			const day = converter(orj_this.date, ['day'], { pad: false }).day;
			const year = converter(orj_this.date, ['year']).year;
			return `${day} ${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)} ${year}`;
		}
		case null: {
			const timezoneOffset = -orj_this.date.getTimezoneOffset();
			const sign = timezoneOffset >= 0 ? '+' : '-';
			const absOffset = Math.abs(timezoneOffset);
			const offsetHours = padZero(Math.floor(absOffset / 60));
			const offsetMinutes = padZero(absOffset % 60);
			const result = converter(orj_this.date, ['day', 'year', 'hours', 'minutes', 'seconds']);
			return `${result.year}-${result.month}-${result.day}T${result.hours}:${result.minutes}:${result.seconds}${sign}${offsetHours}:${offsetMinutes}`;
		}
		default:
			throw new Error('template is not right');
	}
}

/**
 * validation
 *
 * @param {KkDate.date_string} date_string
 * @param {string} template
 * @returns {boolean}
 */
function isValid(date_string, template) {
	if (template === format_types.dddd) {
		return true;
	}
	if (!format_types[template]) {
		throw new Error('Invalid template !');
	}
	if (!format_types_regex[template]) {
		throw new Error('Unsported template for validation !');
	}
	const regex = format_types_regex[template];
	if (!regex.test(date_string)) {
		return false;
	}
	return true;
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
			new Intl.Locale(options.locale);
			global_config.locale = options.locale;
			cached_dateTimeFormat.dddd = new Intl.DateTimeFormat(global_config.locale, {
				weekday: 'long',
			});
			cached_dateTimeFormat.ddd = new Intl.DateTimeFormat(global_config.locale, {
				weekday: 'short',
			});
			cached_dateTimeFormat.MMMM = new Intl.DateTimeFormat(global_config.locale, {
				month: 'long',
			});
			cached_dateTimeFormat.MMM = new Intl.DateTimeFormat(global_config.locale, {
				month: 'short',
			});
			if (typeof options.weekStartDay === 'number') {
				isValidWeekStartDay(options.weekStartDay);
				global_config.weekStartDay = options.weekStartDay;
			}
			try {
				global_config.rtf[global_config.locale] = new Intl.RelativeTimeFormat(global_config.locale, { numeric: 'auto' });
			} catch {
				throw new Error('locale not valid for BCP 47 / relative time formatting');
			}
		}
	} catch (error) {
		throw new Error(error.message || 'locale not valid for BCP 47 / config');
	}
	if (options.timezone && global_config.timezone !== options.timezone) {
		checkTimezone(options.timezone);
		global_config.timezone = options.timezone;
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
		} else {
			nopeRedis.SERVICE_KILL_SYNC();
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
