const { describe, test, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const kk_date = require('../index');
const constants = require('../constants');
const { getTimezoneOffset } = require('../functions');

const SYSTEM_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

afterAll(() => {
	kk_date.config({ timezone: SYSTEM_TIMEZONE, locale: 'en' });
});

/**
 * Strict isValid (moment-strict parity). Every expected value below is moment(input, template,
 * true).isValid() (moment 2.31, English locale), generated and asserted against moment.
 * kk-specific, documented differences are deliberately not in this list: kk accepts month and
 * weekday names in any supported language, year-less templates assume a leap year, and the
 * 'YYYY-MM-DD HH' / 'YYYY-MM-DDTHH:mm:ss' / 'YYYYMMDDHHmmss' families cap hours at 23 in both modes.
 * [input, template, expected]
 */
const STRICT = [
	['31 February 2024', 'DD MMMM YYYY', false],
	['29 February 2024', 'DD MMMM YYYY', true],
	['29 February 2023', 'DD MMMM YYYY', false],
	['5 January 2024', 'DD MMMM YYYY', false],
	['05 January 2024', 'DD MMMM YYYY', true],
	['15 Jan 2024', 'DD MMMM YYYY', false],
	['15 Foo 2024', 'DD MMMM YYYY', false],
	['05 January 2024', 'D MMMM YYYY', false],
	['5 January 2024', 'D MMMM YYYY', true],
	['Febuary 2024', 'MMMM YYYY', false],
	['February 2024', 'MMMM YYYY', true],
	['Feb 2024', 'MMMM YYYY', false],
	['Feb 2024', 'MMM YYYY', true],
	['February 2024', 'MMM YYYY', false],
	['Friday, 09 February 2024', 'dddd, DD MMMM YYYY', true],
	['Thursday, 09 February 2024', 'dddd, DD MMMM YYYY', false],
	['09 February 2024 Friday', 'DD MMMM YYYY dddd', true],
	['09 February 2024 Monday', 'DD MMMM YYYY dddd', false],
	['09 February Friday 2024', 'DD MMMM dddd YYYY', true],
	['09 February Friday, 2024', 'DD MMMM dddd, YYYY', true],
	['09 February Sunday, 2024', 'DD MMMM dddd, YYYY', false],
	['1st January 2024', 'Do MMMM YYYY', true],
	['1 January 2024', 'Do MMMM YYYY', false],
	['1st Jan 2024', 'Do MMMM YYYY', false],
	['3rd May 2024', 'Do MMM YYYY', true],
	['3rd June 2024', 'Do MMM YYYY', false],
	['2023-02-29 10', 'YYYY-MM-DD HH', false],
	['2024-02-29 10', 'YYYY-MM-DD HH', true],
	['29-02-2023 10', 'DD-MM-YYYY HH', false],
	['2023.02.29 10', 'YYYY.MM.DD HH', false],
	['Friday', 'dddd', true],
	['Fri', 'dddd', false],
	['Fri', 'ddd', true],
	['Friday', 'ddd', false],
	['24', 'HH', true],
	['23', 'HH', true],
	['05', 'D', false],
	['5', 'D', true],
	['05', 'M', false],
	['05', 'H', false],
	['5', 'H', true],
	['0', 'H', true],
	['05', 'm', false],
	['05', 's', false],
	['05', 'h', false],
	['5', 'DD', false],
	['5th', 'Do', true],
	['5', 'Do', false],
	['22nd', 'Do', true],
	['12:00 a.m.', 'hh:mm a', true],
	['12:00 A', 'hh:mm A', true],
	['12:00 pm', 'hh:mm A', true],
	['12:00 P.M.', 'hh:mm A', true],
	['1:02 P', 'h:mm A', true],
	['2024-W53', 'YYYY-[W]WW', false],
	['2026-W53', 'YYYY-[W]WW', true],
	['2026-W53', 'GGGG-[W]WW', true],
	['2021-W53', 'GGGG-[W]WW', false],
	['2024-02-29T00:00:00+14:00', 'YYYY-MM-DDTHH:mm:ssZ', true],
	['2024-02-29T00:00:00+14:59', 'YYYY-MM-DDTHH:mm:ssZ', false],
	['2024-02-29T00:00:00-12:00', 'YYYY-MM-DDTHH:mm:ssZ', true],
	['2024-02-29T00:00:00+05:60', 'YYYY-MM-DDTHH:mm:ssZ', false],
	['2024-02-29T00:00:00+1400', 'YYYY-MM-DDTHH:mm:ssZZ', true],
	['2024-02-29T00:00:00+1700', 'YYYY-MM-DDTHH:mm:ssZZ', false],
	['February 30, 2024', 'MMMM D, YYYY', false],
	['Febuary 29, 2024', 'MMMM D, YYYY', false],
	['February 29, 2024', 'MMMM D, YYYY', true],
	['Fri, 09 Feb 2024', 'ddd, DD MMM YYYY', true],
	['Thu, 09 Feb 2024', 'ddd, DD MMM YYYY', false],
	['Fr, 09 Feb 2024', 'dd, DD MMM YYYY', true],
	['Th, 09 Feb 2024', 'dd, DD MMM YYYY', false],
	['2024-02-30', 'YYYY-MM-DD', false],
	['30.02.2024', 'DD.MM.YYYY', false],
	['2024-01-15 24:00:00', 'YYYY-MM-DD HH:mm:ss', true],
	['2024-01-15 24:00:01', 'YYYY-MM-DD HH:mm:ss', false],
	['24:00', 'HH:mm', true],
	['14:30:00', 'HH:mm', false],
];

describe('isValid(input, template, true) matches moment strict', () => {
	test.each(STRICT)('%s / %s -> %s', (input, template, expected) => {
		expect(kk_date.isValid(input, template, true)).toBe(expected);
	});

	test('strict only narrows the default mode (default stays shape-only, legacy)', () => {
		for (const [input, template] of STRICT) {
			if (kk_date.isValid(input, template, true)) {
				expect(kk_date.isValid(input, template)).toBe(true);
			}
		}
		expect(kk_date.isValid('31 February 2024', 'DD MMMM YYYY')).toBe(true);
		expect(kk_date.isValid('Febuary 2024', 'MMMM YYYY')).toBe(true);
		expect(kk_date.isValid('2021-02-30', 'YYYY-MM-DD')).toBe(true);
		expect(kk_date.isValid('anything at all', 'dddd')).toBe(true);
	});

	test('names in other supported languages are accepted (kk is multilingual)', () => {
		expect(kk_date.isValid('15 Ocak 2024', 'DD MMMM YYYY', true)).toBe(true);
		expect(kk_date.isValid('Pazartesi, 15 Ocak 2024', 'dddd, DD MMMM YYYY', true)).toBe(true);
		expect(kk_date.isValid('Salı, 15 Ocak 2024', 'dddd, DD MMMM YYYY', true)).toBe(false);
	});

	test('very long inputs are rejected without running the template regex', () => {
		const started = Date.now();
		expect(kk_date.isValid('a'.repeat(100000), 'MMMMdddd')).toBe(false);
		expect(kk_date.isValid(`${'1'.repeat(100000)}x`, 'HHzz')).toBe(false);
		expect(Date.now() - started).toBeLessThan(500);
	});
});

describe('the meridiem tokens A / a accept moment spellings in both modes', () => {
	// moment(input, template).isValid() and moment(input, template, true).isValid() are both true
	// for these; the default mode used to accept only AM/PM for A and am/pm for a.
	test.each([
		['10:00 pm', 'hh:mm A'],
		['10:00 P', 'hh:mm A'],
		['10:00 p.m.', 'hh:mm A'],
		['10:00 AM', 'hh:mm a'],
		['10:00:00 AM.', 'hh:mm:ss A'],
		['10:00 PM', 'hh:mm A'],
	])('%s with %s', (input, template) => {
		expect(kk_date.isValid(input, template)).toBe(true);
		expect(kk_date.isValid(input, template, true)).toBe(true);
	});

	test('anything else after the time is still rejected (the default mode is a full-shape check)', () => {
		for (const input of ['10:00 PX', '10:00 xm', '10:00 pmm', '10:00']) {
			expect(`${input} ${kk_date.isValid(input, 'hh:mm A')}`).toBe(`${input} false`);
		}
	});
});

describe('toLocaleDateString / toLocaleString / toLocaleTimeString', () => {
	const instant = Date.UTC(2024, 0, 15, 22, 30);
	afterEach(() => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});
	// Order matters: the "never configured" case must run before any config({ locale }).
	test('before any locale configuration they behave like the native Date methods', () => {
		const d = new kk_date(instant);
		expect(d.toLocaleDateString()).toBe(new Date(instant).toLocaleDateString());
		expect(d.toLocaleString()).toBe(new Date(instant).toLocaleString());
		expect(d.toLocaleTimeString()).toBe(new Date(instant).toLocaleTimeString());
	});
	test('they follow the global locale and timezone', () => {
		kk_date.config({ locale: 'tr', timezone: 'Asia/Tokyo' });
		const d = new kk_date(instant);
		const tokyo = { timeZone: 'Asia/Tokyo' };
		expect(d.toLocaleDateString()).toBe(new Date(instant).toLocaleDateString('tr', tokyo));
		expect(d.toLocaleString()).toBe(new Date(instant).toLocaleString('tr', tokyo));
		expect(d.toLocaleTimeString()).toBe(new Date(instant).toLocaleTimeString('tr', tokyo));
		expect(d.toLocaleDateString({ weekday: 'long' })).toBe(new Date(instant).toLocaleDateString('tr', { weekday: 'long', timeZone: 'Asia/Tokyo' }));
		kk_date.config({ locale: 'en' });
	});
	test('instance locale/timezone win, and an explicit timeZone option wins over both', () => {
		const d = new kk_date(instant).config({ locale: 'de' }).tz('America/New_York');
		expect(d.toLocaleString()).toBe(new Date(instant).toLocaleString('de', { timeZone: 'America/New_York' }));
		expect(d.toLocaleString({ timeZone: 'UTC' })).toBe(new Date(instant).toLocaleString('de', { timeZone: 'UTC' }));
	});
});

describe('getAvailableTimezones()', () => {
	test('returns every zone the engine supports, plus UTC', () => {
		const zones = kk_date.getAvailableTimezones();
		expect(zones).toContain('UTC');
		expect(zones).toContain('Europe/Istanbul');
		expect(zones).toContain('America/Toronto');
		expect(zones).toContain('Asia/Dubai');
		if (typeof Intl.supportedValuesOf === 'function') {
			expect(zones.length).toBeGreaterThanOrEqual(Intl.supportedValuesOf('timeZone').length);
		}
		for (const zone of zones.slice(0, 50)) {
			expect(kk_date.checkTimezone(zone)).toBe(true);
		}
	});
	test('returns a fresh array each time', () => {
		const first = kk_date.getAvailableTimezones();
		first.length = 0;
		expect(kk_date.getAvailableTimezones().length).toBeGreaterThan(0);
	});
});

describe('isDST() follows moment (same day/time in January and June)', () => {
	// expected values: moment(instant).tz(zone).isDST()
	test.each([
		['Africa/Sao_Tome', '2018-10-12T12:00:00Z', false],
		['America/Argentina/Catamarca', '2004-09-02T12:00:00Z', true],
		['America/Argentina/Rio_Gallegos', '2004-01-07T12:00:00Z', true],
		['Australia/Sydney', '2024-01-15T00:00:00Z', true],
		['Australia/Sydney', '2024-07-15T00:00:00Z', false],
		['America/New_York', '2024-07-15T12:00:00Z', true],
		['America/New_York', '2024-01-15T12:00:00Z', false],
		['Europe/Istanbul', '2024-07-15T12:00:00Z', false],
		['Europe/Dublin', '2024-07-15T12:00:00Z', true],
	])('%s %s -> %s', (zone, instant, expected) => {
		expect(kk_date.isDST(zone, new Date(instant))).toBe(expected);
		expect(new kk_date(instant).tz(zone).isDST()).toBe(expected);
	});
	test('standard/daylight offsets keep their documented definition (Jan 1 / Jul 1)', () => {
		const ny = kk_date.getTimezoneInfo('America/New_York', new Date('2024-07-15T12:00:00Z'));
		expect([ny.standardOffset, ny.daylightOffset]).toEqual([-5 * 3600000, -4 * 3600000]);
		const sydney = kk_date.getTimezoneInfo('Australia/Sydney', new Date('2024-07-15T12:00:00Z'));
		expect([sydney.standardOffset, sydney.daylightOffset]).toEqual([10 * 3600000, 11 * 3600000]);
	});
});

describe('Hermes-style "24" midnight is hour 0 of the same day', () => {
	let OriginalDateTimeFormat;
	beforeAll(() => {
		OriginalDateTimeFormat = Intl.DateTimeFormat;
		// An engine without longOffset support whose hour12:false formatting uses the h24 cycle.
		Intl.DateTimeFormat = function MockDateTimeFormat(locale, options) {
			if (options && options.timeZoneName === 'longOffset') {
				throw new RangeError('longOffset not supported');
			}
			const real = new OriginalDateTimeFormat(locale, options);
			if (!options || options.hour12 !== false) {
				return real;
			}
			return {
				format: (date) => real.format(date),
				resolvedOptions: () => real.resolvedOptions(),
				formatToParts: (date) =>
					real.formatToParts(date).map((part) => (part.type === 'hour' && part.value === '00' ? { ...part, value: '24' } : part)),
			};
		};
	});
	afterAll(() => {
		Intl.DateTimeFormat = OriginalDateTimeFormat;
		constants.timezone_cache.clear();
		constants.long_timezone_cache.clear();
		constants.converter_results_cache.clear();
		constants.timezone_formatter_cache.clear();
		constants.cached_converter_int.clear();
	});
	test('fallback offset at local midnight is not off by 24 hours', () => {
		constants.timezone_cache.clear();
		constants.long_timezone_cache.clear();
		expect(getTimezoneOffset('Europe/Istanbul', new Date(Date.UTC(2024, 0, 14, 21)))).toBe(3 * 3600000);
		expect(getTimezoneOffset('America/New_York', new Date(Date.UTC(2024, 0, 15, 5)))).toBe(-5 * 3600000);
		expect(getTimezoneOffset('UTC', new Date(Date.UTC(2024, 0, 15)))).toBe(0);
	});
	test('formatting a UTC midnight through the Intl fallback prints 00, not 24', () => {
		constants.converter_results_cache.clear();
		constants.timezone_formatter_cache.clear();
		kk_date.config({ timezone: 'Europe/Istanbul' });
		expect(new kk_date(Date.UTC(2024, 0, 15)).tz('UTC').format('YYYY-MM-DD HH:mm')).toBe('2024-01-15 00:00');
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});
});
