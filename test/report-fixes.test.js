const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');
const { format_types_regex } = require('../constants');
const { format_validators } = require('../functions');

describe('validator parity with legacy regexes (default mode is bit-for-bit identical)', () => {
	// Every template that gained a hand-written validator must accept/reject exactly what its
	// legacy regex in format_types_regex does when is_strict is false — quirks included
	// (2-digit years via the empty year alternative, hours 20-29, HH:mm with an :ss tail).
	const corpus = [
		'2024-08-23',
		'2024-8-23',
		'05-12-31',
		'17-01-01',
		'22-12-31',
		'1600-01-01',
		'1699-12-31',
		'1700-01-01',
		'2199-12-31',
		'2200-01-01',
		'2021-02-30',
		'2024-02-29',
		'2023-02-29',
		'2021-04-31',
		'2024-00-10',
		'2024-13-01',
		'2024-01-00',
		'2024-01-32',
		'2024-31-01',
		'2024-15-13',
		'2024-01-15 14:30:45',
		'2024-01-15 25:30:45',
		'2024-01-15 29:59:59',
		'2024-01-15 30:00:00',
		'2024-01-15 12:60:00',
		'2024-01-15 12:30:60',
		'2024-01-15 14:30',
		'2024-01-15 24:00',
		'05-12-31 14:30:45',
		'05-12-31 14:30',
		'2024.01.15',
		'24.01.15',
		'2024.01.15 26:00:00',
		'2024.01.15 14:30',
		'15.01.2024',
		'15.01.24',
		'31.12.2024 23:59:59',
		'15.01.2024 26:30',
		'15-01-2024',
		'15-01-24',
		'15-01-2024 25:00:00',
		'15-01-2024 24:30',
		'15/01/2024',
		'01/15/2024',
		'13/01/2024',
		'31/04/2024',
		'2024/01/15',
		'2024-08',
		'2024-13',
		'1699-01',
		'20240823',
		'20240229',
		'20230229',
		'20241301',
		'20240132',
		'240823',
		'050101',
		'20240115143045',
		'20240115253045',
		'241301120000',
		'240115143045',
		'2024-01-15T14:30:45',
		'2024-01-15T24:00:00',
		'24:00:00',
		'25:00:00',
		'29:59:59',
		'30:00:00',
		'23:59:59',
		'12:60:00',
		'12:30:60',
		'13:45',
		'25:00',
		'13:45:30',
		'13:45:30.123',
		'13:45:30.1234',
		'03:45',
		'3:45',
		'60:00',
		'03:60',
		'12',
		'29',
		'30',
		'59',
		'60',
		'00',
		'1999',
		'2024',
		'2400',
		'invalid',
		'',
		' ',
		'2024-01-15 ',
		' 2024-01-15',
		20240115,
		240823,
		123,
		true,
		{},
	];

	test('every hand-written validator matches its legacy regex over the corpus', () => {
		const mismatches = [];
		for (const [template, validator] of format_validators) {
			const regex = format_types_regex[template];
			expect(regex).toBeDefined();
			for (const input of corpus) {
				const expected = regex.test(input);
				const actual = validator(input, false);
				if (actual !== expected) {
					mismatches.push(`${template} × ${JSON.stringify(input)}: validator=${actual} regex=${expected}`);
				}
			}
		}
		expect(mismatches).toEqual([]);
	});

	test('strict mode only ever narrows the default mode (never widens)', () => {
		const widened = [];
		for (const [template, validator] of format_validators) {
			for (const input of corpus) {
				if (validator(input, true) && !validator(input, false)) {
					widened.push(`${template} × ${JSON.stringify(input)}`);
				}
			}
		}
		expect(widened).toEqual([]);
	});
});

describe('mm:ss template (report §3)', () => {
	test('isValid accepts moment-strict mm:ss values', () => {
		expect(kk_date.isValid('03:45', 'mm:ss')).toBe(true);
		expect(kk_date.isValid('00:00', 'mm:ss')).toBe(true);
		expect(kk_date.isValid('59:59', 'mm:ss')).toBe(true);
	});

	test('isValid rejects malformed mm:ss values', () => {
		expect(kk_date.isValid('3:45', 'mm:ss')).toBe(false);
		expect(kk_date.isValid('60:00', 'mm:ss')).toBe(false);
		expect(kk_date.isValid('03:60', 'mm:ss')).toBe(false);
		expect(kk_date.isValid('03:45:00', 'mm:ss')).toBe(false);
		expect(kk_date.isValid('invalid', 'mm:ss')).toBe(false);
		expect(kk_date.isValid('', 'mm:ss')).toBe(false);
	});

	test('forced-format constructor parses minutes:seconds on today', () => {
		expect(new kk_date('03:45', 'mm:ss').format('HH:mm:ss')).toBe('00:03:45');
		expect(new kk_date('59:01', 'mm:ss').format('mm:ss')).toBe('59:01');
		expect(() => new kk_date('60:00', 'mm:ss')).toThrow();
	});

	test('bare auto-detection is unchanged (03:45 still parses as HH:mm)', () => {
		expect(new kk_date('03:45').format('HH:mm:ss')).toBe('03:45:00');
	});

	test('format output supports mm:ss', () => {
		expect(new kk_date('2024-08-19 13:45:30').format('mm:ss')).toBe('45:30');
	});
});

describe('default behavior locks (zero breaking change)', () => {
	test('deliberate leniencies stay accepted by default', () => {
		expect(kk_date.isValid('25:00:00', 'HH:mm:ss')).toBe(true);
		expect(kk_date.isValid('29:59:59', 'HH:mm:ss')).toBe(true);
		expect(kk_date.isValid('25:00', 'HH:mm')).toBe(true);
		expect(kk_date.isValid('13:45:30', 'HH:mm')).toBe(true);
		expect(kk_date.isValid('05-12-31', 'YYYY-MM-DD')).toBe(true);
		expect(kk_date.isValid('050101', 'YYYYMMDD')).toBe(true);
		expect(kk_date.isValid('2021-02-30', 'YYYY-MM-DD')).toBe(true);
		expect(kk_date.isValid('2024-01-15 25:30', 'YYYY-MM-DD HH:mm')).toBe(true);
		expect(kk_date.isValid(20240115, 'YYYYMMDD')).toBe(true);
	});

	test('default rejections stay rejected', () => {
		expect(kk_date.isValid('1600-01-01', 'YYYY-MM-DD')).toBe(false);
		expect(kk_date.isValid('2021-13-01', 'YYYY-MM-DD')).toBe(false);
		expect(kk_date.isValid('2024-8-23', 'YYYY-MM-DD')).toBe(false);
		expect(kk_date.isValid('12:60:00', 'HH:mm:ss')).toBe(false);
		expect(kk_date.isValid('12:30:60', 'HH:mm:ss')).toBe(false);
		expect(kk_date.isValid('invalid', 'HH:mm:ss')).toBe(false);
	});

	test('hour-overflow parsing feature is intact', () => {
		expect(new kk_date('25:00:00').format('HH:mm:ss')).toBe('01:00:00');
		expect(new kk_date('2024-08-19 25:00:00').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-20 01:00:00');
		expect(new kk_date('2024-08-19 23:30:45').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 23:30:45');
	});

	test('unknown templates with tokens now validate instead of throwing; tokenless still throw', () => {
		expect(() => kk_date.isValid('2025-01-31')).toThrow('Invalid template !');
		expect(() => kk_date.isValid('2025-01-31', '####')).toThrow('Invalid template !');
		expect(() => kk_date.isValid('2025-01-31', '')).toThrow('Invalid template !');
	});
});

describe('strict mode (moment strict parity, report §4-§5)', () => {
	test('wall-clock hours with the 24:00 special case', () => {
		expect(kk_date.isValid('25:00:00', 'HH:mm:ss', true)).toBe(false);
		expect(kk_date.isValid('29:59:59', 'HH:mm:ss', true)).toBe(false);
		expect(kk_date.isValid('24:00:00', 'HH:mm:ss', true)).toBe(true);
		expect(kk_date.isValid('24:30:00', 'HH:mm:ss', true)).toBe(false);
		expect(kk_date.isValid('24:00:01', 'HH:mm:ss', true)).toBe(false);
		expect(kk_date.isValid('23:59:59', 'HH:mm:ss', true)).toBe(true);
		expect(kk_date.isValid('24:00', 'HH:mm', true)).toBe(true);
		expect(kk_date.isValid('25:00', 'HH:mm', true)).toBe(false);
		expect(kk_date.isValid('24:00:00.000', 'HH:mm:ss.SSS', true)).toBe(true);
		expect(kk_date.isValid('24:00:00.001', 'HH:mm:ss.SSS', true)).toBe(false);
		expect(kk_date.isValid('2024-01-15 25:30', 'YYYY-MM-DD HH:mm', true)).toBe(false);
		expect(kk_date.isValid('2024-01-15 24:00', 'YYYY-MM-DD HH:mm', true)).toBe(true);
		expect(kk_date.isValid('2024-01-15 14:30:45', 'YYYY-MM-DD HH:mm:ss', true)).toBe(true);
	});

	test('HH:mm rejects the legacy optional :ss tail', () => {
		expect(kk_date.isValid('13:45:30', 'HH:mm', true)).toBe(false);
		expect(kk_date.isValid('13:45', 'HH:mm', true)).toBe(true);
	});

	test('4-digit years only', () => {
		expect(kk_date.isValid('05-12-31', 'YYYY-MM-DD', true)).toBe(false);
		expect(kk_date.isValid('050101', 'YYYYMMDD', true)).toBe(false);
		expect(kk_date.isValid('15-01-24', 'DD-MM-YYYY', true)).toBe(false);
		expect(kk_date.isValid('2024-08-23', 'YYYY-MM-DD', true)).toBe(true);
	});

	test('real calendar days with leap years', () => {
		expect(kk_date.isValid('2021-02-30', 'YYYY-MM-DD', true)).toBe(false);
		expect(kk_date.isValid('2021-04-31', 'YYYY-MM-DD', true)).toBe(false);
		expect(kk_date.isValid('2024-02-29', 'YYYY-MM-DD', true)).toBe(true);
		expect(kk_date.isValid('2023-02-29', 'YYYY-MM-DD', true)).toBe(false);
		expect(kk_date.isValid('1900-02-29', 'YYYY-MM-DD', true)).toBe(false);
		expect(kk_date.isValid('2000-02-29', 'YYYY-MM-DD', true)).toBe(true);
		expect(kk_date.isValid('30.02.2021', 'DD.MM.YYYY', true)).toBe(false);
		expect(kk_date.isValid('31-04-2021', 'DD-MM-YYYY', true)).toBe(false);
		expect(kk_date.isValid('04/31/2021', 'MM/DD/YYYY', true)).toBe(false);
		expect(kk_date.isValid('31/04/2021', 'DD/MM/YYYY', true)).toBe(false);
		expect(kk_date.isValid('2021-31-04', 'YYYY-DD-MM', true)).toBe(false);
		expect(kk_date.isValid('2021-30-04', 'YYYY-DD-MM', true)).toBe(true);
		expect(kk_date.isValid('20210230', 'YYYYMMDD', true)).toBe(false);
		expect(kk_date.isValid('20210230120000', 'YYYYMMDDHHmmss', true)).toBe(false);
		expect(kk_date.isValid('2021-02-30 12:00:00', 'YYYY-MM-DD HH:mm:ss', true)).toBe(false);
		expect(kk_date.isValid('2021-02-28 12:00:00', 'YYYY-MM-DD HH:mm:ss', true)).toBe(true);
	});
});

describe('dynamic templates (universal isValid)', () => {
	test('previously-unknown token templates validate', () => {
		expect(kk_date.isValid('31/12/2024 23:59', 'DD/MM/YYYY HH:mm')).toBe(true);
		expect(kk_date.isValid('31/12/2024 24:59', 'DD/MM/YYYY HH:mm')).toBe(true);
		expect(kk_date.isValid('31/12/2024 30:00', 'DD/MM/YYYY HH:mm')).toBe(false);
		expect(kk_date.isValid('2024/12/31', 'YYYY/MM/DD')).toBe(true);
		expect(kk_date.isValid('2024/13/01', 'YYYY/MM/DD')).toBe(false);
		expect(kk_date.isValid('2025-01-31', 'YYYY/MM/DD')).toBe(false);
		expect(kk_date.isValid('2024 } 12', 'YYYY [}] MM')).toBe(true);
		expect(kk_date.isValid('1st Jan 2024', 'Do MMM YYYY')).toBe(true);
		expect(kk_date.isValid('2024-01-15 14:30:45.123', 'YYYY-MM-DD HH:mm:ss.SSS')).toBe(true);
	});

	test('strict semantics apply to dynamic templates too', () => {
		expect(kk_date.isValid('2024/02/30', 'YYYY/MM/DD')).toBe(true);
		expect(kk_date.isValid('2024/02/30', 'YYYY/MM/DD', true)).toBe(false);
		expect(kk_date.isValid('2024/02/29', 'YYYY/MM/DD', true)).toBe(true);
		expect(kk_date.isValid('31/12/2024 25:00', 'DD/MM/YYYY HH:mm', true)).toBe(false);
		expect(kk_date.isValid('31/12/2024 24:00', 'DD/MM/YYYY HH:mm', true)).toBe(true);
		expect(kk_date.isValid('1000/12/31', 'YYYY/MM/DD', true)).toBe(false);
	});

	test('dynamic compilation is memoized and repeatable', () => {
		for (let i = 0; i < 3; i++) {
			expect(kk_date.isValid('15|01|2024', 'DD|MM|YYYY')).toBe(true);
			expect(kk_date.isValid('15|13|2024', 'DD|MM|YYYY')).toBe(false);
		}
	});
});
