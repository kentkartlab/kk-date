const { describe, test, expect, beforeEach, afterEach, afterAll } = require('@jest/globals');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const kk_date = require('../index');
const constants = require('../constants');

const SYSTEM_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

afterAll(() => {
	kk_date.caching({ status: false });
	kk_date.config({ timezone: SYSTEM_TIMEZONE, locale: 'en' });
});

describe('constructor parse cache', () => {
	beforeEach(() => {
		kk_date.caching({ status: true, defaultTtl: 3600 });
	});
	afterEach(() => {
		jest.useRealTimers();
		kk_date.caching({ status: false });
	});

	test('a forced template and auto-detection of the same text never share a cache entry', () => {
		expect(new kk_date('2024-05-03', 'YYYY-DD-MM').format('YYYY-MM-DD')).toBe('2024-03-05');
		expect(new kk_date('2024-05-03').format('YYYY-MM-DD')).toBe('2024-05-03');
		expect(new kk_date('2024-05-03', 'YYYY-MM-DD').format('YYYY-MM-DD')).toBe('2024-05-03');
		expect(new kk_date('2024-05-03', 'YYYY-DD-MM').format('YYYY-MM-DD')).toBe('2024-03-05');
		// the other order
		expect(new kk_date('2024-01-02', 'YYYY-MM-DD').format('YYYY-MM-DD')).toBe('2024-01-02');
		expect(new kk_date('2024-01-02', 'YYYY-DD-MM').format('YYYY-MM-DD')).toBe('2024-02-01');
		// time-only text: 03h45 auto-detected, 3m45s with mm:ss
		expect(new kk_date('03:45').format('HH:mm:ss')).toBe('03:45:00');
		expect(new kk_date('03:45', 'mm:ss').format('HH:mm:ss')).toBe('00:03:45');
	});

	test('a cached text still validates a forced template', () => {
		new kk_date('15.01.2024');
		new kk_date('15.01.2024');
		expect(() => new kk_date('15.01.2024', 'BOGUS')).toThrow('Unsupported Format! BOGUS !');
		expect(() => new kk_date('15.01.2024', 'YYYY-MM-DD')).toThrow('Invalid format ! YYYY-MM-DD !');
	});

	test('today-relative inputs are not cached across midnight or New Year', () => {
		kk_date.config({ timezone: 'UTC' });
		jest.useFakeTimers({ now: Date.UTC(2026, 9, 19, 23, 50) });
		expect(new kk_date('09:00').format('YYYY-MM-DD HH:mm')).toBe('2026-10-19 09:00');
		expect(new kk_date('15 March').format('YYYY-MM-DD')).toBe('2026-03-15');
		jest.setSystemTime(Date.UTC(2026, 9, 20, 0, 10));
		expect(new kk_date('09:00').format('YYYY-MM-DD HH:mm')).toBe('2026-10-20 09:00');
		jest.setSystemTime(Date.UTC(2027, 0, 1, 0, 10));
		expect(new kk_date('15 March').format('YYYY-MM-DD')).toBe('2027-03-15');
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});

	test('today-relative parses are reused on the same day only (also within the TTL)', () => {
		kk_date.caching({ status: true, defaultTtl: 7 * 86400 });
		kk_date.config({ timezone: 'UTC' });
		try {
			jest.useFakeTimers({ now: Date.UTC(2026, 11, 31, 23, 55) });
			expect(new kk_date('15 March').format('YYYY-MM-DD')).toBe('2026-03-15');
			expect(new kk_date('15', 'DD').format('YYYY-MM-DD')).toBe('2026-12-15');
			expect(new kk_date('March', 'MMMM').format('YYYY-MM-DD')).toBe('2026-03-01');
			// same day: served from the cache
			const hits = kk_date.caching_status().totalHits;
			expect(new kk_date('15 March').format('YYYY-MM-DD')).toBe('2026-03-15');
			expect(new kk_date('15', 'DD').format('YYYY-MM-DD')).toBe('2026-12-15');
			expect(new kk_date('March', 'MMMM').format('YYYY-MM-DD')).toBe('2026-03-01');
			expect(kk_date.caching_status().totalHits - hits).toBe(3);
			// ten minutes later it is a new year: the entries (still within their TTL) are not reused
			jest.setSystemTime(Date.UTC(2027, 0, 1, 0, 5));
			expect(new kk_date('15 March').format('YYYY-MM-DD')).toBe('2027-03-15');
			expect(new kk_date('15', 'DD').format('YYYY-MM-DD')).toBe('2027-01-15');
			expect(new kk_date('March', 'MMMM').format('YYYY-MM-DD')).toBe('2027-03-01');
		} finally {
			kk_date.config({ timezone: SYSTEM_TIMEZONE });
		}
	});

	test('a today-relative parse is not reused after the global timezone moves to another date', () => {
		kk_date.config({ timezone: 'UTC' });
		try {
			// 2026-12-31 12:00 UTC is already 2027-01-01 02:00 in Pacific/Kiritimati (UTC+14)
			jest.useFakeTimers({ now: Date.UTC(2026, 11, 31, 12, 0) });
			expect(new kk_date('15 January').format('YYYY-MM-DD')).toBe('2026-01-15');
			kk_date.config({ timezone: 'Pacific/Kiritimati' });
			expect(new kk_date('15 January').format('YYYY-MM-DD')).toBe('2027-01-15');
			kk_date.config({ timezone: 'UTC' });
			expect(new kk_date('15 January').format('YYYY-MM-DD')).toBe('2026-01-15');
		} finally {
			kk_date.config({ timezone: SYSTEM_TIMEZONE });
		}
	});

	test('a text equal to another input key never serves or poisons that input', () => {
		// a forced parse is stored under `${template}\u0001${text}`, which is itself a possible text
		// (the engine's parser even accepts it); the key spaces overlap, the entries must not mix
		kk_date.config({ timezone: 'UTC' });
		try {
			new kk_date('DD/MM/YYYY\u000104/01/2019');
			expect(new kk_date('04/01/2019', 'DD/MM/YYYY').format('YYYY-MM-DD')).toBe('2019-01-04');
			kk_date.caching_flush();
			new kk_date('17/05/1986', 'DD/MM/YYYY');
			// without the cache this text is invalid; a cached forced parse must not make it valid
			expect(() => new kk_date('DD/MM/YYYY\u000117/05/1986')).toThrow('Invalid Date');
			expect(new kk_date('17/05/1986', 'DD/MM/YYYY').format('YYYY-MM-DD')).toBe('1986-05-17');
		} finally {
			kk_date.config({ timezone: SYSTEM_TIMEZONE });
		}
	});

	test('month names are resolved again when the global locale changes language', () => {
		// "listopad" is October in Croatian and November in Polish
		try {
			for (const [locale, month] of [
				['hr', '10'],
				['pl', '11'],
				['hr', '10'],
			]) {
				kk_date.config({ locale });
				expect(new kk_date('15 listopad 2024').format('YYYY-MM-DD')).toBe(`2024-${month}-15`);
				expect(new kk_date('15 listopad 2024', 'DD MMMM YYYY').format('YYYY-MM-DD')).toBe(`2024-${month}-15`);
			}
			// a region change keeps the language: the entry is reused
			kk_date.config({ locale: 'hr-HR' });
			const hits = kk_date.caching_status().totalHits;
			expect(new kk_date('15 listopad 2024').format('YYYY-MM-DD')).toBe('2024-10-15');
			expect(kk_date.caching_status().totalHits - hits).toBe(1);
		} finally {
			kk_date.config({ locale: 'en' });
		}
	});

	test('cloning a KkDate never consults the text cache (no toString() lookup)', () => {
		const a = new kk_date('2024-01-15T10:00:00.500Z');
		new kk_date(a.toString()); // caches the second-precision text of a
		kk_date.config({ timezone: 'America/New_York' });
		const clone = new kk_date(a);
		expect(clone.getTime()).toBe(a.getTime());
		expect(clone.detected_format).toBe('kkDate');
		expect(a.diff(a, 'seconds')).toBe(0);
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});

	test('entries expire at their TTL even before the periodic cleaner runs', () => {
		kk_date.caching({ status: true, defaultTtl: 1 });
		jest.useFakeTimers({ now: Date.UTC(2024, 0, 1) });
		new kk_date('15.01.2024 10:00');
		const hits = kk_date.caching_status().totalHits;
		new kk_date('15.01.2024 10:00');
		expect(kk_date.caching_status().totalHits).toBe(hits + 1);
		jest.setSystemTime(Date.UTC(2024, 0, 1, 0, 0, 3));
		const misses = kk_date.caching_status().totalMisses;
		new kk_date('15.01.2024 10:00');
		expect(kk_date.caching_status().totalMisses).toBe(misses + 1);
	});

	test('caching_flush() keeps the full capacity', () => {
		const text = (i) =>
			`${String(1 + (i % 28)).padStart(2, '0')}.${String(1 + (Math.floor(i / 28) % 12)).padStart(2, '0')}.${1800 + Math.floor(i / 336)} 10:00`;
		for (let i = 0; i < 10500; i++) {
			new kk_date(text(i));
		}
		kk_date.caching_flush();
		for (let i = 20000; i < 23000; i++) {
			new kk_date(text(i));
		}
		expect(kk_date.caching_status().cacheSize).toBe(3000);
	});

	test('prototype keys are neither hits nor crashes', () => {
		const hits = kk_date.caching_status().totalHits;
		for (const key of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
			expect(() => new kk_date(key)).toThrow('Invalid Date');
		}
		expect(kk_date.caching_status().totalHits).toBe(hits);
	});

	test('uncached shapes are not looked up, so they do not count as misses', () => {
		const misses = kk_date.caching_status().totalMisses;
		new kk_date('2024-01-15');
		new kk_date('14:30');
		new kk_date(new kk_date('2024-01-15'));
		new kk_date(1700000000);
		expect(kk_date.caching_status().totalMisses).toBe(misses);
	});

	test('caching({ defaultTtl }) given before caching is enabled is kept', () => {
		kk_date.caching({ status: false });
		kk_date.caching({ defaultTtl: 42 });
		kk_date.caching({ status: true });
		expect(kk_date.caching_status().defaultTtl).toBe(42);
		kk_date.caching({ defaultTtl: 1300 });
	});
});

describe('enabling caching does not keep the process alive', () => {
	test('a script that only enables caching exits by itself', () => {
		const index = path.join(__dirname, '..', 'index.js');
		const started = Date.now();
		const result = spawnSync(
			process.execPath,
			['-e', `require(${JSON.stringify(index)}).caching({ status: true }); new (require(${JSON.stringify(index)}))('15.01.2024');`],
			{
				timeout: 15000,
			},
		);
		expect(result.status).toBe(0);
		expect(Date.now() - started).toBeLessThan(10000);
	});
});

describe('configuration changes are atomic', () => {
	afterEach(() => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE, locale: 'en' });
	});

	test('a global config() that throws applies nothing and leaves cached formats valid', () => {
		const a = new kk_date('2024-01-15 10:00:00');
		expect(a.format('dddd')).toBe('Monday');
		expect(() => kk_date.config({ locale: 'tr', timezone: 'Bad/Zone' })).toThrow('Invalid timezone: Bad/Zone');
		expect(constants.global_config.locale).toBe('en');
		a.add(1, 'days');
		expect(a.format('dddd')).toBe('Tuesday');
		expect(new kk_date('2024-01-16 10:00:00').config({ locale: 'en' }).format('dddd')).toBe('Tuesday');
		expect(() => kk_date.config({ locale: 'tr', weekStartDay: 9 })).toThrow('weekStartDay must be between 0 and 6');
		expect(constants.global_config.locale).toBe('en');
	});

	test('an instance config() that throws leaves the instance untouched', () => {
		const d = new kk_date('2024-01-15');
		expect(() => d.config({ locale: 'xx-INVALID-locale-!!' })).toThrow('locale not valid for BCP 47, config error !');
		expect(d.format('dddd')).toBe('Monday');
		expect(d.fromNow()).toEqual(expect.any(String));
		expect(() => d.config({ timezone: 'Europe/Istanbul', weekStartDay: 9 })).toThrow('weekStartDay must be between 0 and 6');
		expect(d.temp_config.timezone).toBeUndefined();
	});

	test('timezones must be non-empty strings', () => {
		for (const value of [undefined, null, '', 42]) {
			expect(() => kk_date.setTimezone(value)).toThrow('Invalid timezone');
			expect(() => new kk_date('2024-01-15').tz(value)).toThrow('Invalid timezone');
			expect(() => kk_date.checkTimezone(value)).toThrow('Invalid timezone');
		}
		expect(kk_date.getTimezone()).toBe(SYSTEM_TIMEZONE);
	});
});

describe('caches stay bounded', () => {
	test('timezone offsets of many distinct days are answered from the cache on repeat passes', () => {
		// each day is looked up once per pass: after the first pass no Intl call is needed (the cache
		// used to thrash here, clearing itself every pass)
		const { getTimezoneOffset } = require('../functions');
		const dates = Array.from({ length: 5000 }, (_, i) => new Date(Date.UTC(2000, 0, 1, 10, 30) + i * 86400000));
		for (const date of dates) {
			getTimezoneOffset('America/New_York', date);
		}
		const start = Date.now();
		for (let pass = 0; pass < 3; pass++) {
			for (const date of dates) {
				getTimezoneOffset('America/New_York', date);
			}
		}
		expect(Date.now() - start).toBeLessThan(60);
	});

	test('templates that fail to format leave nothing behind', () => {
		const date = new kk_date('2024-01-15');
		const before = constants.formatter_cache.size;
		for (let i = 0; i < 2000; i++) {
			expect(() => date.format(`[literal ${i}]`)).toThrow('template is not right');
		}
		expect(constants.formatter_cache.size).toBe(before);
	});

	test('timezone spellings and locale tags cannot grow the Intl caches without limit', () => {
		const variants = [];
		for (let i = 0; i < 1100 && variants.length < 600; i++) {
			const name = [...'europe/istanbul'].map((c, j) => ((i >> (j % 11)) & 1 ? c.toUpperCase() : c)).join('');
			if (!variants.includes(name)) {
				variants.push(name);
			}
		}
		for (const zone of variants) {
			new kk_date('2024-01-15T10:00:00Z').tz(zone).format('YYYY-MM-DD HH:mm dddd');
		}
		for (let i = 0; i < 600; i++) {
			new kk_date('2024-01-15').config({ locale: `en-x-u${i}` }).format('dddd');
		}
		expect(constants.timezone_check_cache.size).toBeLessThanOrEqual(500);
		expect(constants.cached_converter_int.size).toBeLessThanOrEqual(500);
		expect(constants.long_timezone_cache.size).toBeLessThanOrEqual(500);
		expect(constants.cached_dateTimeFormat_with_locale.dddd.size).toBeLessThanOrEqual(500);
		expect(constants.cached_dateTimeFormat.temp.dddd.size).toBeLessThanOrEqual(500);
	});
});
