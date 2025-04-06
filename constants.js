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
	'YYYY-MM': 'YYYY-MM',
	'YYYY MMM DD': 'YYYY MMM DD',
	'YYYY MMMM DD': 'YYYY MMMM DD',
	'DD MMMM dddd': 'DD MMMM dddd',
	'YYYY-DD-MM': 'YYYY-DD-MM',
	'D MMMM YYYY': 'D MMMM YYYY',
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
	'DD MMMM YYYY': /^(0[1-9]|[12][0-9]|3[01]) \p{L}+ (17|18|19|20|21)\d\d$/u,
	'DD MMMM YYYY dddd': /^(0[1-9]|[12][0-9]|3[01]) \p{L}+ (17|18|19|20|21)\d\d \p{L}+$/u,
	'MMMM YYYY': /^\p{L}+ (17|18|19|20|21)\d\d$/u,
	'DD MMMM dddd YYYY': /^[0-3]?[0-9] [\p{L}\p{M}]+ [\p{L}\p{M}]+ (17|18|19|20|21)\d\d$/u,
	'HH:mm:ss': /^([01]\d|2[0-9]):([0-5]\d):([0-5]\d)$/,
	'HH:mm': /^([01]\d|2[0-9]):([0-5]\d)(?::[0-5]\d)?$/,
	HH: /^([01]\d|2[0-9])$/,
	mm: /^([0-5]\d)$/,
	ss: /^([0-5]\d)$/,
	MMM: /^[\p{L}\p{M}]+$/u,
	MMMM: /^\p{L}+$/u,
	ddd: /^[\p{L}\p{M}]$/,
	'DD MMM YYYY': /^(0[1-9]|[12][0-9]|3[01]) [\p{L}\p{M}]+ (|17|18|19|20|21)\d\d$/u,
	'DD MMM': /^(0[1-9]|[12][0-9]|3[01]) [\p{L}\p{M}]+$$/u,
	'MMM YYYY': /^[\p{L}\p{M}]+ (|17|18|19|20|21)\d\d$/u,
	'DD MMM YYYY HH:mm': /^(0[1-9]|[12][0-9]|3[01]) [\p{L}\p{M}]+ (|17|18|19|20|21)\d\d ([01]\d|2[0-9]):([0-5]\d)$/u,
	'YYYY-MM': /^(17|18|19|20|21)\d\d-(0[1-9]|1[0-2])$/,
	'DD MMMM dddd': /^(0[1-9]|[12][0-9]|3[01]) [\p{L}\p{M}]+ [\p{L}\p{M}]+$/u,
	'YYYY-DD-MM': /^(17|18|19|20|21)\d\d-(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])$/,
	'D MMMM YYYY': /^(0?[1-9]|[12][0-9]|3[01]) \p{L}+ (|17|18|19|20|21)\d\d$/,
	'MM/DD/YYYY': /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(17|18|19|20|21)\d\d$/,
	'DD/MM/YYYY': /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(17|18|19|20|21)\d\d$/,
	'YYYY-MM-DD HH': /^(17|18|19|20|21)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-3])$/,
	'DD-MM-YYYY HH': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(17|18|19|20|21)\d\d ([01]\d|2[0-3])$/,
	'YYYY.MM.DD HH': /^(17|18|19|20|21)\d\d\.(0[1-9]|1[0-2])\.(0[1-9]|[12][0-9]|3[01]) ([01]\d|2[0-3])$/,
	'YYYY MMM DD': /^(|17|18|19|20|21)\d\d [\p{L}\p{M}]+ (0[1-9]|[12][0-9]|3[01])$/u,
	'YYYY MMMM DD': /^(|17|18|19|20|21)\d\d [\p{L}\p{M}]+ (0[1-9]|[12][0-9]|3[01])$/u,
	'YYYY-MM-DDTHH:mm:ss': /^(17|18|19|20|21)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/,
};

const month_numbers = {
	1: 'January',
	2: 'February',
	3: 'March',
	4: 'April',
	5: 'May',
	6: 'June',
	7: 'July',
	8: 'August',
	9: 'September',
	10: 'October',
	11: 'November',
	12: 'December',
};

const day_numbers = {
	1: 'Monday',
	2: 'Tuesday',
	3: 'Wednesday',
	4: 'Thursday',
	5: 'Friday',
	6: 'Saturday',
	7: 'Sunday',
};

const iso6391_languages = {
	ab: 'Abkhazian',
	aa: 'Afar',
	af: 'Afrikaans',
	sq: 'Albanian',
	am: 'Amharic',
	ar: 'Arabic',
	hy: 'Armenian',
	as: 'Assamese',
	ay: 'Aymara',
	az: 'Azerbaijani',
	bm: 'Bambara',
	ba: 'Bashkir',
	eu: 'Basque',
	be: 'Belarusian',
	bn: 'Bengali',
	bh: 'Bihari',
	bi: 'Bislama',
	bs: 'Bosnian',
	br: 'Breton',
	bg: 'Bulgarian',
	my: 'Burmese',
	ca: 'Catalan',
	ch: 'Chamorro',
	ce: 'Chechen',
	ny: 'Chichewa',
	zh: 'Chinese',
	cv: 'Chuvash',
	kw: 'Cornish',
	co: 'Corsican',
	hr: 'Croatian',
	cs: 'Czech',
	da: 'Danish',
	dv: 'Divehi',
	nl: 'Dutch',
	en: 'English',
	eo: 'Esperanto',
	et: 'Estonian',
	tl: 'Filipino',
	fi: 'Finnish',
	fo: 'Faroese',
	fr: 'French',
	de: 'German',
	el: 'Greek',
	gu: 'Gujarati',
	hi: 'Hindi',
	hu: 'Hungarian',
	is: 'Icelandic',
	id: 'Indonesian',
	it: 'Italian',
	ja: 'Japanese',
	jw: 'Javanese',
	ka: 'Georgian',
	kn: 'Kannada',
	km: 'Khmer',
	ko: 'Korean',
	la: 'Latin',
	lv: 'Latvian',
	lt: 'Lithuanian',
	mk: 'Macedonian',
	ml: 'Malayalam',
	mr: 'Marathi',
	ms: 'Malay',
	ne: 'Nepali',
	no: 'Norwegian',
	fa: 'Persian',
	pl: 'Polish',
	pt: 'Portuguese',
	pa: 'Punjabi',
	qu: 'Quechua',
	ro: 'Romanian',
	ru: 'Russian',
	sr: 'Serbian',
	si: 'Sinhalese',
	sk: 'Slovak',
	sl: 'Slovenian',
	es: 'Spanish',
	su: 'Sundanese',
	sw: 'Swahili',
	sv: 'Swedish',
	ta: 'Tamil',
	te: 'Telugu',
	th: 'Thai',
	tr: 'Turkish',
	uk: 'Ukrainian',
	ur: 'Urdu',
	vi: 'Vietnamese',
	cy: 'Welsh',
	xh: 'Xhosa',
	yi: 'Yiddish',
	zu: 'Zulu',
};

const default_en_day_number = new Intl.DateTimeFormat('en', { day: 'numeric' });

const timezone_cache = new Map();
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

const global_config = {
	locale: 'en',
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	rtf: {},
};

module.exports.CACHE_TTL = CACHE_TTL;
module.exports.timeInMilliseconds = timeInMilliseconds;
module.exports.format_types = format_types;
module.exports.month_numbers = month_numbers;
module.exports.day_numbers = day_numbers;
module.exports.iso6391_languages = iso6391_languages;
module.exports.default_en_day_number = default_en_day_number;
module.exports.format_types_regex = format_types_regex;
module.exports.timezone_cache = timezone_cache;
module.exports.cached_dateTimeFormat = cached_dateTimeFormat;
module.exports.global_config = global_config;
