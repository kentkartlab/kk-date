const { describe, test, expect, beforeEach, afterEach, afterAll } = require('@jest/globals');
const kk_date = require('../index');
const { runInZone } = require('./helpers/run-in-zone');

const SYSTEM_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const F = 'YYYY-MM-DD HH:mm:ss.SSS';
// "now" for today-relative inputs: Wednesday 2024-01-17 12:00 UTC
const NOW = Date.UTC(2024, 0, 17, 12, 0, 0);

afterAll(() => {
	kk_date.config({ timezone: SYSTEM_TIMEZONE });
});

/**
 * The constructor's format argument is applied for every predefined template (it used to be
 * honored only for YYYY-MM-DD, YYYY-DD-MM and mm:ss; the others were shape-checked and then
 * auto-detected, so '04/01/2019' with 'DD/MM/YYYY' became April 1). Expected values were
 * cross-checked against moment.utc(input, template) for all 56 templates. Missing fields follow
 * moment: no date field -> today; a missing year/month -> the current one; a bare weekday name ->
 * that day of the current week.
 */
const FORCED = [
	['dddd', 'Monday', '2024-01-15 00:00:00.000'],
	['YYYY', '2024', '2024-01-01 00:00:00.000'],
	['DD', '15', '2024-01-15 00:00:00.000'],
	['MM', '05', '2024-05-01 00:00:00.000'],
	['YYYY-MM-DD', '2024-05-03', '2024-05-03 00:00:00.000'],
	['YYYY-MM-DD HH:mm:ss', '2024-05-03 14:30:45', '2024-05-03 14:30:45.000'],
	['YYYY-MM-DD HH:mm', '2024-05-03 14:30', '2024-05-03 14:30:00.000'],
	['YYYY.MM.DD', '2024.05.03', '2024-05-03 00:00:00.000'],
	['MM/DD/YYYY', '05/03/2024', '2024-05-03 00:00:00.000'],
	['DD/MM/YYYY', '05/03/2024', '2024-03-05 00:00:00.000'],
	['YYYY-MM-DD HH', '2024-05-03 14', '2024-05-03 14:00:00.000'],
	['DD-MM-YYYY HH', '03-05-2024 14', '2024-05-03 14:00:00.000'],
	['YYYY.MM.DD HH', '2024.05.03 14', '2024-05-03 14:00:00.000'],
	['YYYYMMDD', '20240503', '2024-05-03 00:00:00.000'],
	['YYYYMMDDHHmmss', '20240503143045', '2024-05-03 14:30:45.000'],
	['YYYY.MM.DD HH:mm:ss', '2024.05.03 14:30:45', '2024-05-03 14:30:45.000'],
	['YYYY.MM.DD HH:mm', '2024.05.03 14:30', '2024-05-03 14:30:00.000'],
	['DD.MM.YYYY', '03.05.2024', '2024-05-03 00:00:00.000'],
	['DD.MM.YYYY HH:mm:ss', '03.05.2024 14:30:45', '2024-05-03 14:30:45.000'],
	['DD.MM.YYYY HH:mm', '03.05.2024 14:30', '2024-05-03 14:30:00.000'],
	['DD-MM-YYYY', '03-05-2024', '2024-05-03 00:00:00.000'],
	['DD-MM-YYYY HH:mm:ss', '03-05-2024 14:30:45', '2024-05-03 14:30:45.000'],
	['DD-MM-YYYY HH:mm', '03-05-2024 14:30', '2024-05-03 14:30:00.000'],
	['DD MMMM YYYY', '03 May 2024', '2024-05-03 00:00:00.000'],
	['Do MMMM YYYY', '3rd May 2024', '2024-05-03 00:00:00.000'],
	['Do MMM YYYY', '3rd May 2024', '2024-05-03 00:00:00.000'],
	['DD MMMM YYYY dddd', '03 May 2024 Friday', '2024-05-03 00:00:00.000'],
	['dddd, DD MMMM YYYY', 'Friday, 03 May 2024', '2024-05-03 00:00:00.000'],
	['DD MMMM dddd YYYY', '03 May Friday 2024', '2024-05-03 00:00:00.000'],
	['MMMM YYYY', 'May 2024', '2024-05-01 00:00:00.000'],
	['HH:mm:ss', '14:30:45', '2024-01-17 14:30:45.000'],
	['HH:mm:ss.SSS', '14:30:45.123', '2024-01-17 14:30:45.123'],
	['HH:mm', '14:30', '2024-01-17 14:30:00.000'],
	['mm:ss', '30:45', '2024-01-17 00:30:45.000'],
	['hh:mm', '02:30 PM', '2024-01-17 14:30:00.000'],
	['hh:mm:ss', '02:30:45 PM', '2024-01-17 14:30:45.000'],
	['hh:mm:ss.SSS', '02:30:45.123 PM', '2024-01-17 14:30:45.123'],
	['HH', '14', '2024-01-17 14:00:00.000'],
	['mm', '30', '2024-01-17 00:30:00.000'],
	['ss', '45', '2024-01-17 00:00:45.000'],
	['MMM', 'May', '2024-05-01 00:00:00.000'],
	['MMMM', 'June', '2024-06-01 00:00:00.000'],
	['ddd', 'Fri', '2024-01-19 00:00:00.000'],
	['DD MMM YYYY', '03 May 2024', '2024-05-03 00:00:00.000'],
	['DD MMMM dddd, YYYY', '03 May Friday, 2024', '2024-05-03 00:00:00.000'],
	['DD MMM', '03 May', '2024-05-03 00:00:00.000'],
	['MMM YYYY', 'May 2024', '2024-05-01 00:00:00.000'],
	['DD MMM YYYY HH:mm', '03 May 2024 14:30', '2024-05-03 14:30:00.000'],
	['YYYY-MM-DDTHH:mm:ss', '2024-05-03T14:30:45', '2024-05-03 14:30:45.000'],
	['YYYY-MM', '2024-05', '2024-05-01 00:00:00.000'],
	['YYYY MMM DD', '2024 May 03', '2024-05-03 00:00:00.000'],
	['YYYY MMMM DD', '2024 May 03', '2024-05-03 00:00:00.000'],
	['DD MMMM dddd', '03 May Friday', '2024-05-03 00:00:00.000'],
	['YYYY-DD-MM', '2024-03-05', '2024-05-03 00:00:00.000'],
	['D MMMM YYYY', '3 May 2024', '2024-05-03 00:00:00.000'],
	['DD MMMM', '03 May', '2024-05-03 00:00:00.000'],
];

describe('constructor format argument (every predefined template)', () => {
	beforeEach(() => {
		jest.useFakeTimers({ now: NOW });
		kk_date.config({ timezone: 'UTC' });
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	test.each(FORCED)('%s <- %s', (template, input, expected) => {
		expect(new kk_date(input, template).format(F)).toBe(expected);
	});

	test('DD/MM/YYYY no longer swaps day and month, and days above 12 parse', () => {
		expect(new kk_date('04/01/2019', 'DD/MM/YYYY').format('YYYY-MM-DD')).toBe('2019-01-04');
		expect(new kk_date('17/05/1986', 'DD/MM/YYYY').format('YYYY-MM-DD')).toBe('1986-05-17');
		expect(new kk_date('04/01/2019', 'MM/DD/YYYY').format('YYYY-MM-DD')).toBe('2019-04-01');
	});

	test('detected_format reports the forced template', () => {
		expect(new kk_date('2024-05-03 14', 'YYYY-MM-DD HH').detected_format).toBe('YYYY-MM-DD HH');
		expect(new kk_date('03.05.2024', 'DD.MM.YYYY').detected_format).toBe('DD.MM.YYYY');
	});

	test('validation still runs first (unsupported template, shape mismatch, unknown names)', () => {
		expect(() => new kk_date('2024-05-03', 'NOPE')).toThrow('Unsupported Format! NOPE !');
		expect(() => new kk_date('2024/05/03', 'YYYY-MM-DD')).toThrow('Invalid format ! YYYY-MM-DD !');
		expect(() => new kk_date('03 Foo 2024', 'DD MMMM YYYY')).toThrow('Invalid Date');
		expect(() => new kk_date('Someday', 'dddd')).toThrow('Invalid format ! dddd !');
		expect(() => new kk_date('15 January 2024 foo', 'DD MMMM YYYY dddd')).toThrow('Invalid format ! DD MMMM YYYY dddd !');
	});

	test('numeric input with a template is read as text (20240503 with YYYYMMDD is May 3, not a timestamp)', () => {
		expect(new kk_date(20240503, 'YYYYMMDD').format('YYYY-MM-DD')).toBe('2024-05-03');
	});

	test('legacy shapes keep their previous results (hour overflow, HH:mm with seconds)', () => {
		expect(new kk_date('2024-05-03 25:30:00', 'YYYY-MM-DD HH:mm:ss').format(F)).toBe('2024-05-04 01:30:00.000');
		expect(new kk_date('14:30:45', 'HH:mm').format('HH:mm:ss')).toBe('14:30:45');
	});

	// A 2-digit year in a YYYY field keeps the template's field order and reads like moment
	// (00-68 -> 20xx, 69-99 -> 19xx); it used to fall back to auto-detection, i.e. the engine's
	// month-first reading ('12-11-10' as December 11). Expected values: moment.utc(input, template).
	test.each([
		['12-11-10', 'DD-MM-YYYY', '2010-11-12 00:00:00.000'],
		['12.11.10', 'YYYY.MM.DD', '2012-11-10 00:00:00.000'],
		['05-12-31', 'YYYY-MM-DD', '2005-12-31 00:00:00.000'],
		['24.01.15', 'DD.MM.YYYY', '2015-01-24 00:00:00.000'],
		['31.12.99', 'DD.MM.YYYY', '1999-12-31 00:00:00.000'],
		['01-02-68 10:30', 'DD-MM-YYYY HH:mm', '2068-02-01 10:30:00.000'],
		['01-02-69 10:30:15', 'DD-MM-YYYY HH:mm:ss', '1969-02-01 10:30:15.000'],
		['24.01.15 14:30', 'YYYY.MM.DD HH:mm', '2024-01-15 14:30:00.000'],
		['15 Jan 24', 'DD MMM YYYY', '2024-01-15 00:00:00.000'],
		['5 January 24', 'D MMMM YYYY', '2024-01-05 00:00:00.000'],
	])('2-digit year: %s with %s', (input, template, expected) => {
		kk_date.config({ timezone: 'UTC' });
		try {
			expect(new kk_date(input, template).format(F)).toBe(expected);
		} finally {
			kk_date.config({ timezone: SYSTEM_TIMEZONE });
		}
	});

	test('round trip: the DD text templates accept the zero-padded days format() produces', () => {
		for (const template of ['DD MMMM YYYY', 'dddd, DD MMMM YYYY', 'DD MMMM dddd, YYYY', 'DD MMMM YYYY dddd']) {
			const text = new kk_date('2024-01-05').format(template);
			expect(kk_date.isValid(text, template)).toBe(true);
			expect(new kk_date(text, template).format('YYYY-MM-DD')).toBe('2024-01-05');
			expect(new kk_date(text).format('YYYY-MM-DD')).toBe('2024-01-05');
		}
	});
});

describe('ReDoS: crafted digit runs are rejected in linear time', () => {
	test.each([
		[`Monday, ${'1'.repeat(44)} x`],
		[`${'1'.repeat(44)} x`],
		[`Monday, ${'1'.repeat(2000)} x`],
		[`${'1'.repeat(5000)} x`],
	])('input of %#', (input) => {
		const start = Date.now();
		expect(() => new kk_date(input)).toThrow('Invalid Date');
		expect(kk_date.isValid(input, 'dddd, DD MMMM YYYY', true)).toBe(false);
		expect(kk_date.isValid(input, 'DD MMMM dddd, YYYY')).toBe(false);
		expect(Date.now() - start).toBeLessThan(500);
	});
});

describe('strings with their own offset or zone are absolute instants', () => {
	afterEach(() => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});
	const ABSOLUTE = [
		['2024-01-15T10:30:45+03:00', 'ISO8601'],
		['2024-01-15T10:30:45.000+03:00', 'ISO8601'],
		['2024-01-15T10:30:45+0300', 'ISO8601'],
		['2024-01-15T03:30:45-04:00', 'ISO8601'],
		['2024-01-15 10:30:45+03', 'ISO8601'],
		['2024-01-15 07:30:45Z', 'ISO8601'],
		['2024-01-15 07:30:45 UTC', 'ISO8601'],
		['Mon, 15 Jan 2024 07:30:45 GMT', 'RFC2822'],
		['Mon, 15 Jan 2024 10:30:45 +0300', 'RFC2822'],
		['Mon, 15 Jan 2024 02:30:45 EST', 'RFC2822'],
		['Mon Jan 15 2024 10:30:45 GMT+0300 (GMT+03:00)', 'RFC2822'],
	];
	test.each(['UTC', 'Europe/Istanbul', 'America/New_York', 'Asia/Tokyo'])('global timezone %s never reinterprets them', (zone) => {
		kk_date.config({ timezone: zone });
		for (const [input, detected] of ABSOLUTE) {
			const parsed = new kk_date(input);
			expect(`${input} -> ${parsed.toISOString()}`).toBe(`${input} -> 2024-01-15T07:30:45.000Z`);
			expect(parsed.detected_format).toBe(detected);
		}
	});
	test('a UTC container configured for Istanbul can read its own format() output back', () => {
		const out = runInZone(
			'UTC',
			`kk_date.setTimezone('Europe/Istanbul');
			const original = new kk_date('2024-01-15 10:00:00');
			const text = original.format();
			return { text, same: new kk_date(text).getTime() === original.getTime(), iso: new kk_date('2024-01-15T10:00:00+03:00').toISOString() };`,
		);
		expect(out).toEqual({ text: '2024-01-15T10:00:00+03:00', same: true, iso: '2024-01-15T07:00:00.000Z' });
	});
	test('HTTP dates (toUTCString) keep their time instead of becoming midnight', () => {
		const instant = Date.UTC(2024, 0, 15, 7, 30, 45);
		expect(new kk_date(new Date(instant).toUTCString()).getTime()).toBe(instant);
		expect(new kk_date(new Date(instant).toString()).getTime()).toBe(instant);
	});
});

describe('text dates: anchored templates, trailing times, junk', () => {
	beforeEach(() => {
		kk_date.config({ timezone: 'UTC' });
	});
	test.each([
		['Monday, 15 January 2024 14:30', '2024-01-15 14:30:00.000'],
		['15 January 2024 14:30', '2024-01-15 14:30:00.000'],
		['15th May 2024 08:00:00', '2024-05-15 08:00:00.000'],
		['Monday, 15th January 2024 14:30', '2024-01-15 14:30:00.000'],
		['15 January 2024 Monday', '2024-01-15 00:00:00.000'],
		['15 January Monday 2024', '2024-01-15 00:00:00.000'],
		['2024-01-15 10', '2024-01-15 10:00:00.000'],
		['2024.01.15 10', '2024-01-15 10:00:00.000'],
		['15-01-2024 10', '2024-01-15 10:00:00.000'],
	])('%s', (input, expected) => {
		expect(new kk_date(input).format(F)).toBe(expected);
	});
	test.each([
		'Monday, 15 January 2024 extra',
		'1st Jan 2024 foo',
		'foo 1st Jan 2024',
		'15 January 2024 foo',
		'15 January foo 2024',
		'2024-01-15 24',
	])('%s throws', (input) => {
		expect(() => new kk_date(input)).toThrow('Invalid Date');
	});
});

describe('numeric inputs', () => {
	test('fractional timestamps follow the integer rule on their integer part', () => {
		expect(new kk_date(1700000000.5).toISOString()).toBe('2023-11-14T22:13:20.500Z');
		expect(new kk_date(1.5).toISOString()).toBe('1970-01-01T00:00:01.500Z');
		expect(new kk_date(1700000000000.7).toISOString()).toBe('2023-11-14T22:13:20.000Z');
		expect(new kk_date(1700000000.5).detected_format).toBe('Xx');
	});
	test('integers keep the documented <=10 digits = seconds rule', () => {
		expect(new kk_date(1700000000).toISOString()).toBe('2023-11-14T22:13:20.000Z');
		expect(new kk_date(1700000000000).toISOString()).toBe('2023-11-14T22:13:20.000Z');
	});
	test('NaN and Infinity throw', () => {
		expect(() => new kk_date(Number.NaN)).toThrow('Invalid Date');
		expect(() => new kk_date(Number.POSITIVE_INFINITY)).toThrow('Invalid Date');
	});
	test('comparisons use the same rule for fractional numbers', () => {
		expect(new kk_date(1700000000.5).isSame(1700000000.5)).toBe(true);
	});
});

describe('month names: the configured locale wins over other languages', () => {
	afterEach(() => {
		kk_date.config({ locale: 'en' });
	});
	test('Croatian "listopad" is October with locale hr (Polish/Czech listopad is November)', () => {
		expect(new kk_date('15 listopad 2024').format('YYYY-MM-DD')).toBe('2024-11-15');
		kk_date.config({ locale: 'hr' });
		expect(new kk_date('15 listopad 2024').format('YYYY-MM-DD')).toBe('2024-10-15');
		expect(new kk_date('15 lipanj 2024').format('YYYY-MM-DD')).toBe('2024-06-15');
		expect(new kk_date('15 srpanj 2024').format('YYYY-MM-DD')).toBe('2024-07-15');
	});
	test('other languages keep working whatever the locale', () => {
		kk_date.config({ locale: 'hr' });
		expect(new kk_date('15 Ocak 2024').format('YYYY-MM-DD')).toBe('2024-01-15');
		expect(new kk_date('15 January 2024').format('YYYY-MM-DD')).toBe('2024-01-15');
	});
});

describe("today-relative inputs use the global timezone's date", () => {
	test('in a UTC container at 22:30 UTC it is already tomorrow in Istanbul', () => {
		const out = runInZone(
			'UTC',
			`kk_date.setTimezone('Europe/Istanbul');
			return [new kk_date('14:30').format('YYYY-MM-DD HH:mm Z'), new kk_date('15 March').format('YYYY-MM-DD'), new kk_date('05', 'DD').format('YYYY-MM-DD')];`,
			Date.UTC(2024, 11, 31, 22, 30),
		);
		expect(out).toEqual(['2025-01-01 14:30 +03:00', '2025-03-15', '2025-01-05']);
	});
	test("the cached day rolls over at the global timezone's midnight", () => {
		const before = runInZone(
			'UTC',
			`kk_date.setTimezone('Europe/Istanbul'); return new kk_date('09:00').format('YYYY-MM-DD');`,
			Date.UTC(2024, 0, 15, 20, 59),
		);
		const after = runInZone(
			'UTC',
			`kk_date.setTimezone('Europe/Istanbul'); return new kk_date('09:00').format('YYYY-MM-DD');`,
			Date.UTC(2024, 0, 15, 21, 1),
		);
		expect([before, after]).toEqual(['2024-01-15', '2024-01-16']);
	});
	test('within one process the cached day follows the clock (fake timers)', () => {
		jest.useFakeTimers({ now: Date.UTC(2024, 0, 15, 10, 0) });
		try {
			kk_date.config({ timezone: 'UTC' });
			expect(new kk_date('09:00').format('YYYY-MM-DD')).toBe('2024-01-15');
			jest.setSystemTime(Date.UTC(2024, 0, 16, 0, 1));
			expect(new kk_date('09:00').format('YYYY-MM-DD')).toBe('2024-01-16');
		} finally {
			jest.useRealTimers();
			kk_date.config({ timezone: SYSTEM_TIMEZONE });
		}
	});
});

describe('system-zone DST gaps do not distort the global-timezone wall clock', () => {
	test('a time Berlin skips is kept when the global zone (Istanbul) has it', () => {
		// 2024-03-31 02:30 does not exist in Europe/Berlin (02:00 -> 03:00) but does in Istanbul
		const out = runInZone(
			'Europe/Berlin',
			`kk_date.setTimezone('Europe/Istanbul');
			return ['2024-03-31 02:30:00', '2024-03-31 02:30', '31.03.2024 02:30', '2024-03-31T02:30:00', '2024-03-31T02:30:00.250', '31 March 2024', '2024-03-31 02:30:00|YYYY-MM-DD HH:mm:ss']
				.map((input) => { const [text, template] = input.split('|'); return new kk_date(text, template).format('YYYY-MM-DD HH:mm Z'); });`,
		);
		expect(out).toEqual([
			'2024-03-31 02:30 +03:00',
			'2024-03-31 02:30 +03:00',
			'2024-03-31 02:30 +03:00',
			'2024-03-31 02:30 +03:00',
			'2024-03-31 02:30 +03:00',
			'2024-03-31 00:00 +03:00',
			'2024-03-31 02:30 +03:00',
		]);
	});

	test('a parse cached in the system zone keeps its wall clock for a later global zone', () => {
		// cached while the global zone is the system zone (02:30 is skipped there: 03:30 CEST),
		// then served from the cache after setTimezone('Europe/Istanbul'), where 02:30 exists
		const out = runInZone(
			'Europe/Berlin',
			`kk_date.caching({ status: true });
			const inBerlin = new kk_date('2024-03-31 02:30:00').format('YYYY-MM-DD HH:mm Z');
			kk_date.setTimezone('Europe/Istanbul');
			const hits = kk_date.caching_status().totalHits;
			const inIstanbul = new kk_date('2024-03-31 02:30:00').format('YYYY-MM-DD HH:mm Z');
			return [inBerlin, inIstanbul, kk_date.caching_status().totalHits - hits];`,
		);
		expect(out).toEqual(['2024-03-31 03:30 +02:00', '2024-03-31 02:30 +03:00', 1]);
	});
});

/**
 * Whether a string carries its own zone is decided the way the engine's Date parser decides it
 * (nativeZoneKind mirrors V8's DateParser). Oracle: the engine itself — a string with a zone (or an
 * ES5 date-only form, read as UTC) parses to the same instant whatever the system timezone is, a
 * naive one does not.
 */
describe('explicit zones are recognized exactly as the engine reads them', () => {
	const DATES = [
		'15 Jan 2024',
		'Jan 15, 2024',
		'Monday, January 15, 2024',
		'2024/01/15',
		'01/15/2024',
		'2024-01-15',
		'Sun, 07 Jul 2024',
		'Mon Jan 15 2024',
	];
	const TIMES = ['', '10:00', '10:00:00.123', '10:00 PM', '22:00', '00:30'];
	const ZONES = [
		'',
		'Z',
		'UTC',
		'utc',
		'GMT',
		'UT',
		'EST',
		'pdt',
		'+3',
		'-03',
		'+0300',
		'-0530',
		'+05:30',
		'+5:30',
		'GMT+3',
		'GMT -0500',
		'UTC+05:30',
		'(comment)',
		'GMT+0300 (GMT+03:00)',
	];
	const inputs = [];
	for (const date of DATES) {
		for (const time of TIMES) {
			for (const zone of ZONES) {
				const text = [date, time, zone].filter(Boolean).join(' ');
				inputs.push(text, `${text} `);
				if (time && zone) {
					inputs.push(`${date} ${zone} ${time}`, `${time} ${date} ${zone}`);
				}
			}
		}
	}
	inputs.push(
		'2024',
		'2024-01',
		'2024-01-15',
		'+002024-01-15',
		'2024-01-15T10:00',
		'2024-01-15T10:00:00.5',
		'2024-01-15T10:00Z',
		'2024-01-15T10:00+0300',
		'2024-01-15t10:00z',
		'2024-13-01',
		'2200-07-01',
		'UTC Jan 15 2024 10:00',
		'10:00 2024-01-15',
		// an unclosed parenthesis opens a comment that runs to the end and hides a trailing zone
		'1/1(x5/2024 12:00AM UTC ',
		'Jan 15(a(b)c 2024 10:00:00.123 PDT',
		'01/15/2(024  22:00 10:30+03:00',
		'07/04/2024 0:(00:00 +0300 10:30+03:00',
		'Jan 15 2024 10:00 (comment) GMT',
		// the engine stops at a NUL character, skips leading zeros of numbers, reads an ES5 year
		// prefix before its legacy rules, and drops a rejected -000000 year
		'Jan 15 2024 10:00\u0000GMT',
		'Jan 1 2024 10:0000000000060.GMT ,',
		'2024:004-01',
		'2024:1-15',
		'+002024:01-15',
		'-000000-01-15',
		'-000000utc 4 Jul 2024 10:00',
		`Jan 15 2024 10:00 (${'x'.repeat(200)}) GMT`,
	);
	const parseAll = `return ${JSON.stringify(inputs)}.map((s) => { const v = Date.parse(s); return Number.isNaN(v) ? null : v; });`;

	test('zone-independent instants are exactly the strings classified as absolute', () => {
		const { nativeZoneKind, hasExplicitZone, ZONE_NONE, ZONE_EXPLICIT } = require('../functions');
		const inUtc = runInZone('UTC', parseAll);
		const inTokyo = runInZone('Asia/Tokyo', parseAll);
		const mismatches = [];
		let checked = 0;
		inputs.forEach((input, i) => {
			if (inUtc[i] === null) {
				return;
			}
			checked++;
			const independent = inUtc[i] === inTokyo[i];
			const kind = nativeZoneKind(input);
			if ((kind !== ZONE_NONE) !== independent || hasExplicitZone(input) !== (kind === ZONE_EXPLICIT)) {
				mismatches.push(input);
			}
		});
		expect(checked).toBeGreaterThan(2500);
		expect(mismatches).toEqual([]);
	});

	test('absolute strings keep the engine instant whatever the global and system timezones', () => {
		const samples = [
			'Jan 15, 2024 10:00:00 PM UTC',
			'Mon, 15 Jan 2024 22:00:00 GMT ',
			'15 Jan 2024 22:00 +3',
			'2024-01-15 22:00:00 GMT +0300',
			'Mon Jan 15 2024 22:00:00 GMT+0300 (GMT+03:00)',
		];
		const out = runInZone(
			'Asia/Tokyo',
			`kk_date.setTimezone('Europe/Istanbul'); return ${JSON.stringify(samples)}.map((s) => [new kk_date(s).getTime(), Date.parse(s)]);`,
		);
		for (const [kk, engine] of out) {
			expect(kk).toBe(engine);
		}
	});
});

describe('naive strings the engine parses keep their wall clock in the global timezone', () => {
	test('a time the system zone skips (New York, 2024-03-10 02:30) is kept for Istanbul', () => {
		// Istanbul has no DST: 02:30 exists there, so the global-timezone reading is 02:30 +03:00
		const out = runInZone(
			'America/New_York',
			`kk_date.setTimezone('Europe/Istanbul');
			return ['03/10/2024 02:30', '2024/03/10 02:30', 'March 10, 2024 02:30:00', '10 Mar 2024 02:30', '2024-03-10 02:30'].map((s) => new kk_date(s).format('YYYY-MM-DD HH:mm Z'));`,
		);
		expect(out).toEqual([
			'2024-03-10 02:30 +03:00',
			'2024-03-10 02:30 +03:00',
			'2024-03-10 02:30 +03:00',
			'2024-03-10 02:30 +03:00',
			'2024-03-10 02:30 +03:00',
		]);
	});

	test('the wall clock of text the engine reads only in part (NUL, unclosed comment) is not taken from the system zone', () => {
		const out = runInZone(
			'America/New_York',
			`kk_date.setTimezone('Europe/Istanbul');
			return ['2024-01-15 10:00:00\\u0000', 'Jan 15 2024 10:00 (note', 'Jan 15 2024 10:00 (a (b) c', '2024-01-15T10:00:00.123\\u0000x'].map((s) => new kk_date(s).format('YYYY-MM-DD HH:mm'));`,
		);
		expect(out).toEqual(['2024-01-15 10:00', '2024-01-15 10:00', '2024-01-15 10:00', '2024-01-15 10:00']);
	});

	test.each(['UTC', 'Europe/Berlin', 'America/Los_Angeles'])('ES5 date-only forms are a date, not UTC midnight (system %s)', (zone) => {
		// moment('2024') is 2024-01-01 00:00 local; the engine reads '2024' as UTC midnight, which
		// used to show 2023-12-31 16:00 in Los Angeles
		const out = runInZone(
			zone,
			`const local = ['2024', '2200-07-01', '+002024-01-15'].map((s) => new kk_date(s).format('YYYY-MM-DD HH:mm'));
			kk_date.setTimezone('Europe/Istanbul');
			const global = ['2024', '2200-07-01'].map((s) => new kk_date(s).format('YYYY-MM-DD HH:mm Z'));
			return [local, global];`,
		);
		expect(out).toEqual([
			['2024-01-01 00:00', '2200-07-01 00:00', '2024-01-15 00:00'],
			['2024-01-01 00:00 +03:00', '2200-07-01 00:00 +03:00'],
		]);
	});
});

describe('text dates in other languages', () => {
	beforeEach(() => {
		kk_date.config({ timezone: 'UTC' });
	});
	afterEach(() => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});

	// the date and time written in the text (moment with the matching locale and template agrees)
	test.each([
		['Pazartesi, 15 Ocak 2024 14:30', '2024-01-15 14:30:00'],
		['15. Ocak 2024 14:30', '2024-01-15 14:30:00'],
		['1er janvier 2024 10:00', '2024-01-01 10:00:00'],
		['15 Ocak 2024 14:30:15', '2024-01-15 14:30:15'],
		['Montag, 15. Januar 2024 10:00', '2024-01-15 10:00:00'],
	])('a trailing time is kept: %s', (input, expected) => {
		expect(new kk_date(input).format('YYYY-MM-DD HH:mm:ss')).toBe(expected);
	});

	test('junk after the date or an impossible time still fails', () => {
		for (const input of ['Pazartesi, 15 Ocak 2024 14:30 foo', '15 Ocak 2024 25:00', '15 Ocak 2024 14:60', 'foo 15 Ocak 2024 14:30']) {
			expect(() => new kk_date(input)).toThrow('Invalid Date');
		}
	});

	test('a month word kk-date does not know is left to the engine, as before', () => {
		// "Mayis" (Turkish without the dotless i) and "Febr": the engine reads month names by their
		// first three letters; the result is the engine's own local reading of the text
		for (const input of ['Saturday, 06 Mayis 2022', 'Monday, 05 Febr 2024']) {
			const engine = new Date(input);
			const expected = `${engine.getFullYear()}-${String(engine.getMonth() + 1).padStart(2, '0')}-${String(engine.getDate()).padStart(2, '0')}`;
			expect(new kk_date(input).format('YYYY-MM-DD')).toBe(expected);
		}
	});

	test('other unknown month words stay invalid, exactly as in 5.0.1', () => {
		// 5.0.1 handed only "<weekday>, <zero-padded day> <word> <year>" to the engine; everything else
		// with a month word it did not know threw (the engine would take "Junk" for June, year 2001)
		for (const input of [
			'15 Mayis',
			'06 Mayis',
			'15 Junk',
			'15 Decoy 2024',
			'15 Junk 2024',
			'Monday, 15 Junk 2024',
			'2024 Junk 15',
			'15th Junk 2024',
			'Saturday, 6 Mayis 2022',
			'06 Mayis 2022',
			'15 Mayis 2022',
		]) {
			expect(() => new kk_date(input)).toThrow('Invalid Date');
		}
	});

	test('a year-less text date with a time is in the current year, in every language', () => {
		// like the same text without the time ('15 March' is 15 March of this year); the engine's own
		// parser would say 2001
		jest.useFakeTimers({ now: Date.UTC(2026, 9, 19, 12, 0) });
		try {
			for (const [input, expected] of [
				['15 March 14:30', '2026-03-15 14:30'],
				['15 Mart 14:30', '2026-03-15 14:30'],
				['15 Mayıs 14:30', '2026-05-15 14:30'],
				['15 janvier 14:30', '2026-01-15 14:30'],
				['15 février 14:30', '2026-02-15 14:30'],
				['15 Ocak 14:30', '2026-01-15 14:30'],
			]) {
				expect(`${input} ${new kk_date(input).format('YYYY-MM-DD HH:mm')}`).toBe(`${input} ${expected}`);
			}
		} finally {
			jest.useRealTimers();
		}
	});

	test('rejecting long text takes linear time', () => {
		const start = Date.now();
		for (const input of [' '.repeat(200000), `a${' '.repeat(100000)}x9`, `15 Ocak 2024${' 14:30'.repeat(16000)}`]) {
			expect(() => new kk_date(input)).toThrow('Invalid Date');
		}
		expect(Date.now() - start).toBeLessThan(500);
	});
});

describe('years below 1000 are formatted with four digits (moment, dayjs)', () => {
	test.each([
		[5, '0005', '05'],
		[50, '0050', '50'],
		[999, '0999', '99'],
		[1000, '1000', '00'],
	])('year %i', (year, yyyy, yy) => {
		const date = new Date(0);
		date.setUTCFullYear(year, 0, 15);
		const parsed = new kk_date(date.getTime()).tz('UTC');
		expect(parsed.format('YYYY')).toBe(yyyy);
		expect(parsed.format('YY')).toBe(yy);
		expect(parsed.format()).toBe(`${yyyy}-01-15T00:00:00+00:00`);
	});

	test('a formatted year below 1000 reads back as the same year', () => {
		kk_date.config({ timezone: 'UTC' });
		try {
			const text = new kk_date('1st Jan 0050').format('YYYY-MM-DD');
			expect(text).toBe('0050-01-01');
			expect(new kk_date(text).format('YYYY-MM-DD')).toBe('0050-01-01');
		} finally {
			kk_date.config({ timezone: SYSTEM_TIMEZONE });
		}
	});
});

describe('years 0-99 in text dates are not moved to 1900-1999', () => {
	test.each([
		['1st Jan 0050', null, 50, 0, 1],
		['1st January 0099', 'Do MMMM YYYY', 99, 0, 1],
		['29th Feb 0004', null, 4, 1, 29],
	])('%s', (input, template, year, month, day) => {
		kk_date.config({ timezone: 'UTC' });
		try {
			const expected = new Date(0);
			expected.setUTCFullYear(year, month, day);
			const parsed = template === null ? new kk_date(input) : new kk_date(input, template);
			expect(parsed.getTime()).toBe(expected.getTime());
		} finally {
			kk_date.config({ timezone: SYSTEM_TIMEZONE });
		}
	});
});
