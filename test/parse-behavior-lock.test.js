const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');

kk_date.config({ timezone: 'UTC' });

/**
 * Behavior lock for the constructor's auto-detection.
 *
 * Every row below was generated from the implementation prior to the parser fast-path work
 * and pins (input → detected_format → formatted instant) — including the deliberately odd
 * native-fallback results ('12:30:60' parsing as year 1960, '05-12-31' as 2031-05-12, ...).
 * These are the exact behaviors the fast paths must not change; anything not claimed by a
 * fast path must keep falling through to the same legacy code.
 */

// [input, detected_format ('THROW' when construction must throw), format('YYYY-MM-DD HH:mm:ss.SSS')]
const DATE_CASES = [
	['2024-01-15', 'YYYY-MM-DD', '2024-01-15 00:00:00.000'],
	['2024-01-15 14:30:45', 'YYYY-MM-DD HH:mm:ss', '2024-01-15 14:30:45.000'],
	['2024-01-15 14:30', 'YYYY-MM-DD HH:mm', '2024-01-15 14:30:00.000'],
	['15.01.2024', 'DD.MM.YYYY', '2024-01-15 00:00:00.000'],
	['15.01.2024 14:30:45', 'DD.MM.YYYY HH:mm:ss', '2024-01-15 14:30:45.000'],
	['15.01.2024 14:30', 'DD.MM.YYYY HH:mm', '2024-01-15 14:30:00.000'],
	['15-01-2024', 'DD-MM-YYYY', '2024-01-15 00:00:00.000'],
	['15-01-2024 14:30:45', 'DD-MM-YYYY HH:mm:ss', '2024-01-15 14:30:45.000'],
	['15-01-2024 14:30', 'DD-MM-YYYY HH:mm', '2024-01-15 14:30:00.000'],
	['2024.01.15 14:30:45', 'YYYY.MM.DD HH:mm:ss', '2024-01-15 14:30:45.000'],
	['2024.01.15 14:30', 'YYYY.MM.DD HH:mm', '2024-01-15 14:30:00.000'],
	['20240115', 'YYYYMMDD', '2024-01-15 00:00:00.000'],
	['20240115143045', 'YYYYMMDDHHmmss', '2024-01-15 14:30:45.000'],
	['2024-01', 'YYYY-MM', '2024-01-01 00:00:00.000'],
	['2024-15-01', 'YYYY-DD-MM', '2024-01-15 00:00:00.000'],
	['15 January 2024', 'DD MMMM YYYY', '2024-01-15 00:00:00.000'],
	['1 January 2024', 'DD MMMM YYYY', '2024-01-01 00:00:00.000'],
	['09 January 2024', 'D MMMM YYYY', '2024-01-09 00:00:00.000'],
	['31 January 2024', 'DD MMMM YYYY', '2024-01-31 00:00:00.000'],
	['15 Jan 2024', 'DD MMMM YYYY', '2024-01-15 00:00:00.000'],
	['2024 Jan 15', 'YYYY MMM DD', '2024-01-15 00:00:00.000'],
	['Monday, 15 January 2024', 'dddd, DD MMMM YYYY', '2024-01-15 00:00:00.000'],
	['Monday, 15 January 2024 extra', 'dddd, DD MMMM YYYY', '2024-01-15 00:00:00.000'],
	['2024-01-15T14:30:45.123Z', 'ISO8601', '2024-01-15 14:30:45.123'],
	['2024-01-15T14:30:45Z', 'ISO8601', '2024-01-15 14:30:45.000'],
	['2024-01-15T14:30:45', null, '2024-01-15 14:30:45.000'],
	['2024-01-15T24:00:00Z', 'ISO8601', '2024-01-16 00:00:00.000'],
	['1st Jan 2024', 'Do MMM YYYY', '2024-01-01 00:00:00.000'],
	['15th January 2024', 'Do MMM YYYY', '2024-01-15 00:00:00.000'],
	['3. Oktober 2024', 'Do MMM YYYY', '2024-10-03 00:00:00.000'],
	['1st Jan 2024 foo', 'Do MMM YYYY', '2024-01-01 00:00:00.000'],
	['21st Dec 1999', 'Do MMM YYYY', '1999-12-21 00:00:00.000'],
	['15th May 2024 08:00:00', 'Do MMM YYYY', '2024-05-15 00:00:00.000'],
	// native-fallback oddities (V8 legacy string parser) that must keep falling through
	['12:30:60', null, '1960-01-01 12:30:00.000'],
	['12:30:90', null, '1990-01-01 12:30:00.000'],
	['2021-02-30', 'YYYY-MM-DD', '2021-03-02 00:00:00.000'],
	['31 February 2024', 'DD MMMM YYYY', '2024-03-02 00:00:00.000'],
	['2021.02.30', null, '2021-03-02 00:00:00.000'],
	['24 Jan 15', 'D MMMM YYYY', '2024-01-15 00:00:00.000'],
	['05-12-31', 'YYYY-MM-DD', '2031-05-12 00:00:00.000'],
	['15 janv. 2024', null, '2024-01-15 00:00:00.000'],
	['2300.01.15', null, '2300-01-15 00:00:00.000'],
	['Blah 2024', null, '2024-01-01 00:00:00.000'],
	['2024-02-31T14:30:45Z', 'ISO8601', '2024-03-02 14:30:45.000'],
	// invalid inputs must throw at construction
	['15-01-24 14:30', 'THROW', null],
	['24.01.15', 'THROW', null],
	['2024.13.01', 'THROW', null],
	['32.13.2024', 'THROW', null],
	['99 January Monday, 2024', 'THROW', null],
	['foo 1st Jan 2024', 'THROW', null],
	['19 Invalid 2024', 'THROW', null],
	['32 Aug 2024', 'THROW', null],
	['asfasf', 'THROW', null],
	['2024-01-15 asdasd', 'THROW', null],
];

// Rows whose detected_format changes on purpose with the fast-path work (new YYYY.MM.DD /
// MMMM YYYY rungs, the DD MMMM dddd, YYYY detected_format fix) — only the instant is locked.
const VALUE_ONLY_CASES = [
	['2024.01.15', '2024-01-15 00:00:00.000'],
	['January 2024', '2024-01-01 00:00:00.000'],
	['Ocak 2024', '2024-01-01 00:00:00.000'],
	['15 January Monday, 2024', '2024-01-15 00:00:00.000'],
];

// Offset-carrying ISO strings are reinterpreted relative to the SYSTEM timezone (legacy
// behavior), so their instant varies with TZ — only detected_format and validity are locked.
const DETECTED_ONLY_CASES = [['2024-01-15T14:30:45+03:00', null]];

// Today-anchored inputs: the calendar date is "today", so only detected_format and the
// time-of-day are locked. [input, detected_format, format('HH:mm:ss.SSS')]
const TIME_CASES = [
	['14:30:45', 'HH:mm:ss', '14:30:45.000'],
	['14:30:45.123', 'HH:mm:ss.SSS', '14:30:45.123'],
	['14:30', 'HH:mm', '14:30:00.000'],
	['14:30:00', 'HH:mm', '14:30:00.000'],
	['02:30 PM', 'HH:mm', '14:30:00.000'],
	['02:30:00 PM', 'HH:mm', '14:30:00.000'],
	['02:30:45 PM', 'hh:mm:ss', '14:30:45.000'],
	['02:30:45.123 PM', 'hh:mm:ss.SSS', '14:30:45.123'],
	['12:00 AM', 'HH:mm', '00:00:00.000'],
	['12:00 PM', 'HH:mm', '12:00:00.000'],
	['24:30:45', 'HH:mm:ss', '00:30:45.000'],
	['25:30:45', 'HH:mm:ss', '01:30:45.000'],
	['48:00:00', 'THROW', null],
	['12:60:00', 'THROW', null],
];

describe('parser behavior lock (auto-detection)', () => {
	test('date-carrying inputs keep their detected_format and instant', () => {
		for (const [input, detected, formatted] of DATE_CASES) {
			if (detected === 'THROW') {
				expect(() => new kk_date(input)).toThrow();
				continue;
			}
			const parsed = new kk_date(input);
			expect(`${input} → ${parsed.detected_format}`).toBe(`${input} → ${detected}`);
			expect(`${input} → ${parsed.format('YYYY-MM-DD HH:mm:ss.SSS')}`).toBe(`${input} → ${formatted}`);
		}
	});

	test('inputs whose detected_format is allowed to improve keep their instant', () => {
		for (const [input, formatted] of VALUE_ONLY_CASES) {
			expect(`${input} → ${new kk_date(input).format('YYYY-MM-DD HH:mm:ss.SSS')}`).toBe(`${input} → ${formatted}`);
		}
	});

	test('timezone-relative inputs keep their detected_format and stay valid', () => {
		for (const [input, detected] of DETECTED_ONLY_CASES) {
			const parsed = new kk_date(input);
			expect(`${input} → ${parsed.detected_format}`).toBe(`${input} → ${detected}`);
			expect(parsed.isValid()).toBe(true);
		}
	});

	test('time-only inputs keep their detected_format and time-of-day', () => {
		for (const [input, detected, formatted] of TIME_CASES) {
			if (detected === 'THROW') {
				expect(() => new kk_date(input)).toThrow();
				continue;
			}
			const parsed = new kk_date(input);
			expect(`${input} → ${parsed.detected_format}`).toBe(`${input} → ${detected}`);
			expect(`${input} → ${parsed.format('HH:mm:ss.SSS')}`).toBe(`${input} → ${formatted}`);
		}
	});

	test('caching on/off produces identical results across format families', () => {
		const samples = ['2024-01-15', '2024-01-15 14:30:45', '15.01.2024 14:30:45', '14:30:45', '15 January 2024', '2024-01-15T14:30:45.123Z', '2024-01'];
		const withoutCache = samples.map((s) => new kk_date(s).format('YYYY-MM-DD HH:mm:ss.SSS'));
		kk_date.caching({ status: true });
		try {
			for (let round = 0; round < 2; round++) {
				for (let i = 0; i < samples.length; i++) {
					expect(new kk_date(samples[i]).format('YYYY-MM-DD HH:mm:ss.SSS')).toBe(withoutCache[i]);
				}
			}
		} finally {
			kk_date.caching({ status: false });
		}
	});
});
