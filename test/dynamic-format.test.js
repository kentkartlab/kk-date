const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');
const { compileFormat, getCompiledTemplate } = require('../functions');
const { format_part_types } = require('../constants');

const test_datetime = '2024-08-19 23:50:59';

kk_date.config({ timezone: 'UTC' });

describe('dynamic format templates', () => {
	test('arbitrary token combinations', () => {
		expect(new kk_date(test_datetime).format('YYYYHH')).toBe('202423');
		expect(new kk_date(test_datetime).format('YYYYMM')).toBe('202408');
		expect(new kk_date(test_datetime).format('HHmm')).toBe('2350');
		expect(new kk_date(test_datetime).format('YYYY/MM ss')).toBe('2024/08 59');
		expect(new kk_date(test_datetime).format('ss.SSS')).toBe('59.000');
	});

	test('dynamic output equals single-token composition', () => {
		const date = new kk_date(test_datetime);
		expect(date.format('YYYYHH')).toBe(`${date.format('YYYY')}${date.format('HH')}`);
		expect(date.format('YYYYMM')).toBe(`${date.format('YYYY')}${date.format('MM')}`);
	});

	test('bracket literals and unknown characters', () => {
		expect(new kk_date(test_datetime).format('YYYY [saat] HH')).toBe('2024 saat 23');
		expect(new kk_date(test_datetime).format('[YYYY] YYYY')).toBe('YYYY 2024');
		expect(new kk_date(test_datetime).format('[]YYYY')).toBe('2024');
		expect(new kk_date(test_datetime).format('YYYY [x')).toBe('2024 [x');
		expect(new kk_date(test_datetime).format('YYYY (+*?) MM')).toBe('2024 (+*?) 08');
	});

	test('12-hour tokens with explicit and implicit meridiem', () => {
		expect(new kk_date(test_datetime).format('hh')).toBe('11 PM');
		expect(new kk_date(test_datetime).format('hh:mm A')).toBe('11:50 PM');
		expect(new kk_date(test_datetime).format('hh:mm a')).toBe('11:50 pm');
		expect(new kk_date(test_datetime).format('A')).toBe('PM');
		expect(new kk_date('2024-12-31 00:15:00').format('hh:mm')).toBe('12:15 AM');
		expect(new kk_date('2024-02-29 12:00:00').format('hh:mm:ss')).toBe('12:00:00 PM');
		expect(new kk_date('2024-12-31 00:15:00').format('a')).toBe('am');
	});

	test('D and Do tokens', () => {
		expect(new kk_date('2024-01-05').format('D')).toBe('5');
		expect(new kk_date('2024-01-15').format('D')).toBe('15');
		expect(new kk_date('2024-08-19').format('Do [of] MMMM')).toBe('19th of August');
		const ordinals = {
			'2024-08-01': '1st',
			'2024-08-02': '2nd',
			'2024-08-03': '3rd',
			'2024-08-09': '9th',
			'2024-08-11': '11th',
			'2024-08-12': '12th',
			'2024-08-13': '13th',
			'2024-08-21': '21st',
			'2024-08-22': '22nd',
			'2024-08-31': '31st',
		};
		for (const [date, expected] of Object.entries(ordinals)) {
			expect(new kk_date(date).format('Do')).toBe(expected);
		}
	});

	test('previously dead switch templates now work', () => {
		expect(new kk_date('2024-08-19').format('DD MMM YYYY dddd')).toBe('19 Aug 2024 Monday');
		expect(new kk_date('2024-08-19').format('DD MMM dddd, YYYY')).toBe('19 Aug Monday, 2024');
	});

	test('invalid templates still throw', () => {
		expect(() => new kk_date(test_datetime).format('')).toThrow('template is not right');
		expect(() => new kk_date(test_datetime).format('hello')).toThrow('template is not right');
		expect(() => new kk_date(test_datetime).format('[hello]')).toThrow('template is not right');
		expect(() => new kk_date(test_datetime).format(123)).toThrow('template is not right');
		expect(() => new kk_date(test_datetime).format({})).toThrow('template is not right');
	});

	test('null template keeps ISO output with offset', () => {
		expect(new kk_date(test_datetime).format()).toBe('2024-08-19T23:50:59+00:00');
		expect(new kk_date(test_datetime).format(null)).toBe('2024-08-19T23:50:59+00:00');
	});

	test('locale and timezone interplay', () => {
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('MMMM [ayı]')).toBe('Ağustos ayı');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('DD MMMM YYYY, dddd')).toBe('19 Ağustos 2024, Pazartesi');
		const ny = new kk_date(test_datetime).tz('America/New_York');
		expect(ny.format('YYYYMMDDHHmm')).toBe(`${ny.format('YYYYMMDD')}${ny.format('HHmm')}`);
	});

	test('diff_range accepts dynamic templates', () => {
		expect(new kk_date(test_datetime).format('YYYYMM HHmm')).toBe('202408 2350');
		expect(new kk_date('2024-01-01').diff_range('2024-01-03', 'days', 'YYYY [d]DD')).toEqual(['2024 d01', '2024 d02', '2024 d03']);
	});
});

describe('compileFormat', () => {
	test('compiles tokens, literals and fields', () => {
		const compiled = compileFormat('YYYY-MM');
		expect(compiled.parts).toEqual([
			{ t: format_part_types.YEAR, v: '' },
			{ t: format_part_types.LITERAL, v: '-' },
			{ t: format_part_types.MONTH, v: '' },
		]);
		expect(compiled.fields).toEqual(['year', 'month']);
		expect(compiled.has12h).toBe(false);
		expect(compiled.appendMeridiem).toBe(false);
	});

	test('YYYYMMDDHHmmss tokenizes into exactly six fields', () => {
		const compiled = compileFormat('YYYYMMDDHHmmss');
		expect(compiled.fields).toEqual(['year', 'month', 'day', 'hours', 'minutes', 'seconds']);
		expect(compiled.parts).toHaveLength(6);
	});

	test('deduplicates fields and merges adjacent literals', () => {
		expect(compileFormat('DD.DD').fields).toEqual(['day']);
		expect(compileFormat('[a][b]YYYY').parts[0]).toEqual({ t: format_part_types.LITERAL, v: 'ab' });
	});

	test('12-hour flags', () => {
		expect(compileFormat('hh:mm')).toMatchObject({ has12h: true, appendMeridiem: true });
		expect(compileFormat('hh:mm A')).toMatchObject({ has12h: true, appendMeridiem: false });
		expect(compileFormat('HH:mm')).toMatchObject({ has12h: false, appendMeridiem: false });
		expect(compileFormat('hh').fields).toEqual(['hours']);
		expect(compileFormat('A').fields).toEqual(['hours']);
		expect(compileFormat('Do').fields).toEqual(['day']);
	});

	test('compiled templates are cached by reference', () => {
		expect(getCompiledTemplate('YYYYMM [cache-test]')).toBe(getCompiledTemplate('YYYYMM [cache-test]'));
	});

	test('rejects templates without tokens', () => {
		expect(() => compileFormat('')).toThrow('template is not right');
		expect(() => compileFormat('none')).toThrow('template is not right');
		expect(() => compileFormat(null)).toThrow('template is not right');
	});
});
