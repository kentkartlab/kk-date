const nopeRedis = require('./nope-redis');
const timezoneData = require('./timezone-data');
nopeRedis.config({ isMemoryStatsEnabled: false, defaultTtl: 1300 });

const global_config = {
	locale: 'en',
	timezone: null,
	userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
	'DD MMMM YYYY': 'DD MMMM YYYY',
	'DD MMMM YYYY dddd': 'DD MMMM YYYY dddd',
	'DD MMMM dddd YYYY': 'DD MMMM dddd YYYY',
	'MMMM YYYY': 'MMMM YYYY',
	'HH:mm:ss': 'HH:mm:ss',
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
	'DD MMMM YYYY':
		/^(0[1-9]|[12][0-9]|3[01]) (January|February|March|April|May|June|July|August|September|October|November|December) (|17|18|19|20|21)\d\d$/,
	'DD MMMM YYYY dddd':
		/^(0[1-9]|[12][0-9]|3[01]) (January|February|March|April|May|June|July|August|September|October|November|December) (|17|18|19|20|21)\d\d (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/,
	'MMMM YYYY': /^(January|February|March|April|May|June|July|August|September|October|November|December) (|17|18|19|20|21)\d\d$/,
	'DD MMMM dddd YYYY':
		/^(0[1-9]|[12][0-9]|3[01]) (January|February|March|April|May|June|July|August|September|October|November|December) (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) (|17|18|19|20|21)\d\d$/,
	'HH:mm:ss': /^([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'HH:mm': /^([01]\d|2[0-9]):([0-5]\d)$/,
	HH: /^([01]\d|2[0-9])$/,
	mm: /^([0-5]\d)$/,
	ss: /^([0-5]\d)$/,
	MMM: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/,
	MMMM: /^(January|February|March|April|May|June|July|August|September|October|November|December)$/,
	ddd: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/,
	'DD MMM YYYY': /^(0[1-9]|[12][0-9]|3[01]) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (|17|18|19|20|21)\d\d$/,
	'DD MMM': /^(0[1-9]|[12][0-9]|3[01]) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/,
	'MMM YYYY': /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (|17|18|19|20|21)\d\d$/,
	'DD MMM YYYY HH:mm': /^(0[1-9]|[12][0-9]|3[01]) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d)$/,
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

const howManySeconds = {
	year: 31556926,
	month: 2629743,
	week: 604800,
	day: 86400,
	hour: 3600,
	minute: 60,
};

const cached_dateTimeFormat = {
	dddd: new Intl.DateTimeFormat(global_config.locale, {
		weekday: 'long',
	}),
	ddd: new Intl.DateTimeFormat(global_config.locale, {
		weekday: 'short',
	}),
	MMMM: new Intl.DateTimeFormat(global_config.locale, {
		month: 'long',
	}),
	MMM: new Intl.DateTimeFormat(global_config.locale, { month: 'short' }),
	temp: {
		dddd: {},
		ddd: {},
		MMMM: {},
		MMM: {},
	},
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
		let is_can_cache = false;
		let cached = false;
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
				is_can_cache = true;
				cached = nopeRedis.getItem(`${date}`);
				if (!cached) {
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
							const year = String(date.substring(0, 4), 10); // Extract year
							const month = String(date.substring(4, 6), 10); // Extract month
							const day = String(date.substring(6, 8), 10); // Extract day

							this.date = new Date(`${year}-${month}-${day}`);
						}
						if (this.date === false) {
							this.date = new Date(`${date}`);
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
		if (global_config.timezone) {
			this.date = parseWithTimezone(this, global_config.timezone);
		}
		this.temp_config = {};
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
	 * This is a pretty robust function for adding and subtracting time to an existing moment. To add time, specify the key of the time unit you want to add and the amount you want to add. Similarly, to subtract time, use the same key to subtract the amount of time.
	 *
	 * @param {number} amount
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @returns {KkDate|Error}
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
	diff_range(end, type, template = 'YYYY-MM-DD') {
		const diffed = diff(this, end, type);
		const rangeDates = [];
		rangeDates.push(formatter(this, template));
		for (let index = 1; index < diffed.diffTime + 1; index++) {
			const date = new Date(this.date.getTime());
			date.setSeconds(this.date.getSeconds() + diffed.type_value * index);
			rangeDates.push(formatter(new KkDate(date), template));
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
	 *
	 * @param {object} options
	 * @param {string} options.locale BCP 47 language tag
	 * @param {string} options.timezone timezone
	 * @returns {Error|KkDate}
	 */
	config(options) {
		if (options.timezone) {
			this.temp_config.timezone = options.timezone;
			this.date = parseWithTimezone(this, options.timezone);
		}
		try {
			if (options.locale) {
				this.temp_config.locale = options.locale;
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
		} catch (error) {
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
 * @description It parses the date with the timezone and returns the date.
 * @param {KkDate} kkDate
 * @param {string} timezone
 * @returns {Date|Error}
 */
function parseWithTimezone(kkDate, timezone) {
	isInvalid(kkDate.date);
	// ilk olarak gelen parametreye, ardından global config'e bakacak
	const selectedTimezone = timezone || global_config.timezone;

	const utcTime = kkDate.date.getTime();
	const localOffset = kkDate.date.getTimezoneOffset() * 60 * 1000;
	const targetOffset = timezoneData[timezone].standardOffset * 1000;
	const tzTime = utcTime + targetOffset + localOffset;
	return new Date(tzTime);
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

function converter(date, to) {
	const result = {};
	for (let index = 0; index < to.length; index++) {
		if (to[index] === 'year') {
			result['year'] = date.getFullYear();
		}
		if (to[index] === 'month') {
			result['month'] = String(date.getMonth() + 1).padStart(2, '0');
		}
		if (to[index] === 'day') {
			result['day'] = String(date.getDate()).padStart(2, '0');
		}
		if (to[index] === 'hours') {
			result['hours'] = String(date.getHours()).padStart(2, '0');
		}
		if (to[index] === 'minutes') {
			result['minutes'] = String(date.getMinutes()).padStart(2, '0');
		}
		if (to[index] === 'seconds') {
			result['seconds'] = String(date.getSeconds()).padStart(2, '0');
		}
	}
	return result;
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
			return parseInt(orj_this.date.valueOf(), 10);
		}
		case 'X': {
			return parseInt(orj_this.date.valueOf() / 1000, 10);
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
		case format_types['DD.MM.YYYY']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.day}.${result.month}.${result.year}`;
		}
		case format_types['YYYY-MM-DD']: {
			const result = converter(orj_this.date, ['day', 'month', 'year']);
			return `${result.year}-${result.month}-${result.day}`;
		}
		case format_types['YYYY-MM-DD HH:mm:ss']: {
			const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes', 'seconds']);
			return `${result.year}-${result.month}-${result.day} ${result.hours}:${result.minutes}:${result.seconds}`;
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
		case format_types['MMMM YYYY']: {
			const result = converter(orj_this.date, ['year']);
			return `${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)} ${result.year}`;
		}
		case format_types['DD MMMM dddd YYYY']: {
			const result = converter(orj_this.date, ['day', 'year']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMMM').format(orj_this.date)} ${dateTimeFormat(orj_this, 'dddd').format(orj_this.date)} ${result.year}`;
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
			return `${converter(orj_this.date, ['day']).day} ${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)}`;
		}
		case format_types['MMM YYYY']: {
			return `${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)} ${converter(orj_this.date, ['year']).year}`;
		}
		case format_types['DD MMM YYYY HH:mm']: {
			const result = converter(orj_this.date, ['day', 'year', 'hours', 'minutes']);
			return `${result.day} ${dateTimeFormat(orj_this, 'MMM').format(orj_this.date)} ${result.year} ${result.hours}:${result.minutes}`;
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
 * @description It configures the global config.
 * @param {Object} options
 * @param {string} options.locale
 * @param {string} options.timezone
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
		}
	} catch (error) {
		throw new Error('locale not valid for BCP 47');
	}
	if (options.timezone) {
		global_config.timezone = options.timezone;
	}
	return true;
}

/**
 * caching config
 *
 * @param {object} options
 * @param {boolean} options.status
 * @param {boolean} options.isMemoryStatsEnabled
 * @param {number|null} options.defaultTtl
 * @returns {boolean}
 */
function caching(options = { status: false, isMemoryStatsEnabled: false, defaultTtl: null }) {
	if (typeof options.status === 'boolean') {
		if (options.status) {
			nopeRedis.SERVICE_START();
		} else {
			nopeRedis.SERVICE_KILL_SYNC();
		}
	}
	if (typeof options.isMemoryStatsEnabled === 'boolean') {
		nopeRedis.config({ isMemoryStatsEnabled: options.isMemoryStatsEnabled, defaultTtl: 1300 });
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
