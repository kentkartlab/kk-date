const { describe, test, expect, afterEach, beforeAll, afterAll } = require('@jest/globals');
const kk_date = require('../index');
const { getDayOfWeek, getDayOfYear, getIsoWeekInfo, getLocaleWeekInfo, getTimezoneAbbreviation, compileFormat } = require('../functions');
const { format_part_types, format_derived_flags, timezone_long_name_cache } = require('../constants');

// Monday, day-of-year 232, ISO week 34 of 2024, Q3.
const test_datetime = '2024-08-19 23:50:59';

kk_date.config({ timezone: 'UTC', locale: 'en', weekStartDay: 0 });

describe('year, month and quarter tokens', () => {
	test('YY renders the last two digits of the year', () => {
		expect(new kk_date(test_datetime).format('YY')).toBe('24');
		expect(new kk_date('2009-01-05').format('YY')).toBe('09');
	});

	test('M, Mo render the month without padding and as ordinal', () => {
		expect(new kk_date(test_datetime).format('M')).toBe('8');
		expect(new kk_date(test_datetime).format('Mo')).toBe('8th');
		expect(new kk_date('2024-01-15').format('M Mo')).toBe('1 1st');
		expect(new kk_date('2024-12-15').format('M')).toBe('12');
	});

	test('Q, Qo render the quarter', () => {
		expect(new kk_date('2024-01-15').format('Q')).toBe('1');
		expect(new kk_date('2024-03-31').format('Q')).toBe('1');
		expect(new kk_date('2024-04-01').format('Q')).toBe('2');
		expect(new kk_date(test_datetime).format('Q Qo')).toBe('3 3rd');
		expect(new kk_date('2024-12-31').format('Q Qo')).toBe('4 4th');
		expect(new kk_date(test_datetime).format('[Q]Q')).toBe('Q3');
	});
});

describe('day of year tokens', () => {
	test('DDD, DDDo, DDDD render the day of year', () => {
		expect(new kk_date('2024-01-05').format('DDD DDDo DDDD')).toBe('5 5th 005');
		expect(new kk_date(test_datetime).format('DDD DDDD')).toBe('232 232');
	});

	test('day of year handles leap years', () => {
		expect(new kk_date('2024-12-31').format('DDD')).toBe('366');
		expect(new kk_date('2023-12-31').format('DDD')).toBe('365');
		expect(new kk_date('2024-03-01').format('DDD')).toBe('61');
		expect(new kk_date('2023-03-01').format('DDD')).toBe('60');
	});
});

describe('weekday tokens', () => {
	test('d, do, E render the day of week', () => {
		expect(new kk_date(test_datetime).format('d do E')).toBe('1 1st 1'); // Monday
		expect(new kk_date('2024-08-18').format('d do E')).toBe('0 0th 7'); // Sunday
		expect(new kk_date('2024-08-24').format('d E')).toBe('6 6'); // Saturday
	});

	test('e renders the locale weekday index relative to weekStartDay', () => {
		expect(new kk_date(test_datetime).format('e')).toBe('1');
		expect(new kk_date('2024-08-18').format('e')).toBe('0');
		expect(new kk_date(test_datetime).config({ weekStartDay: 1 }).format('e')).toBe('0');
		expect(new kk_date('2024-08-18').config({ weekStartDay: 1 }).format('e')).toBe('6');
	});

	test('dd renders the two-character weekday name', () => {
		expect(new kk_date(test_datetime).format('dd')).toBe('Mo');
		expect(new kk_date('2024-08-18').format('dd')).toBe('Su');
		expect(new kk_date('2024-08-24').format('dd')).toBe('Sa');
	});

	test('dd is locale-aware and consistent with ddd', () => {
		const date = new kk_date(test_datetime).config({ locale: 'tr-tr' });
		// Exact spelling is ICU data — pin only the derivation from the short name.
		expect(date.format('dd')).toBe(date.format('ddd').slice(0, 2));
		expect(date.format('dd')).toHaveLength(2);
	});
});

describe('week of year and week-year tokens', () => {
	test('locale week: week 1 contains Jan 1', () => {
		expect(new kk_date('2021-01-01').format('w wo ww')).toBe('1 1st 01');
		expect(new kk_date('2020-12-26').format('w gggg')).toBe('52 2020');
		expect(new kk_date('2020-12-27').format('w gggg')).toBe('1 2021');
		expect(new kk_date(test_datetime).format('w wo ww')).toBe('34 34th 34');
	});

	test('locale week-year comes from the week, not the calendar year', () => {
		expect(new kk_date('2021-01-01').format('gggg gg')).toBe('2021 21');
		expect(new kk_date('2024-12-31').format('w gggg gg')).toBe('1 2025 25');
	});

	test('ISO week: Monday start, first-Thursday rule', () => {
		expect(new kk_date('2021-01-01').format('W Wo WW')).toBe('53 53rd 53');
		expect(new kk_date('2021-01-01').format('GGGG GG')).toBe('2020 20');
		expect(new kk_date('2024-12-30').format('W WW GGGG')).toBe('1 01 2025');
		expect(new kk_date('2020-12-31').format('W GGGG')).toBe('53 2020');
		expect(new kk_date('2016-01-02').format('W GGGG')).toBe('53 2015');
		expect(new kk_date(test_datetime).format('W WW')).toBe('34 34');
	});

	test('ISO week combined template', () => {
		expect(new kk_date('2021-01-01').format('GGGG-[W]WW-E')).toBe('2020-W53-5');
	});
});

describe('weekStartDay reconfiguration invalidates cached formats', () => {
	afterEach(() => {
		kk_date.config({ weekStartDay: 0 });
	});

	test('global config change reflects on an already-formatted instance', () => {
		const sunday = new kk_date('2024-08-18 12:00:00');
		expect(sunday.format('w')).toBe('34');
		expect(sunday.format('e')).toBe('0');
		kk_date.config({ weekStartDay: 1 });
		expect(sunday.format('w')).toBe('33');
		expect(sunday.format('e')).toBe('6');
		kk_date.config({ weekStartDay: 0 });
		expect(sunday.format('w')).toBe('34');
	});

	test('instance config overrides the global week start', () => {
		const sunday = new kk_date('2024-08-18 12:00:00');
		expect(sunday.format('w')).toBe('34');
		sunday.config({ weekStartDay: 1 });
		expect(sunday.format('w')).toBe('33');
	});

	test('instance override of 0 wins over a non-zero global', () => {
		kk_date.config({ weekStartDay: 1 });
		const sunday = new kk_date('2024-08-18 12:00:00').config({ weekStartDay: 0 });
		expect(sunday.format('w')).toBe('34');
		expect(sunday.format('e')).toBe('0');
	});
});

describe('hour, minute and second tokens', () => {
	test('H, m, s render without padding', () => {
		expect(new kk_date('2024-01-05 07:08:09').format('H m s')).toBe('7 8 9');
		expect(new kk_date(test_datetime).format('H m s')).toBe('23 50 59');
		expect(new kk_date('2024-01-05 00:00:00').format('H m s')).toBe('0 0 0');
	});

	test('k and kk render the 1-24 clock (midnight is 24)', () => {
		expect(new kk_date('2024-12-31 00:15:00').format('k kk')).toBe('24 24');
		expect(new kk_date('2024-01-05 05:00:00').format('k kk')).toBe('5 05');
		expect(new kk_date(test_datetime).format('k kk')).toBe('23 23');
	});

	test('h follows the hh implicit-meridiem behavior', () => {
		expect(new kk_date(test_datetime).format('h:mm')).toBe('11:50 PM');
		expect(new kk_date(test_datetime).format('h:mm A')).toBe('11:50 PM');
		expect(new kk_date(test_datetime).format('h:mm a')).toBe('11:50 pm');
		expect(new kk_date('2024-12-31 00:15:00').format('h:mm')).toBe('12:15 AM');
		expect(new kk_date('2024-06-01 12:00:00').format('h')).toBe('12 PM');
	});
});

describe('fractional second tokens', () => {
	test('S and SS truncate the milliseconds', () => {
		expect(new kk_date('2024-03-07 09:04:05.045').format('S SS SSS')).toBe('0 04 045');
		expect(new kk_date('2024-03-07 09:04:05.345').format('S SS')).toBe('3 34');
		expect(new kk_date('2024-03-07 09:04:05').format('S SS SSS')).toBe('0 00 000');
	});

	test('SSSS..SSSSSSSSS right-pad with zeros', () => {
		const date = new kk_date('2024-03-07 09:04:05.045');
		expect(date.format('SSSS')).toBe('0450');
		expect(date.format('SSSSSS')).toBe('045000');
		expect(date.format('SSSSSSSSS')).toBe('045000000');
	});
});

describe('timezone tokens', () => {
	afterEach(() => {
		kk_date.config({ timezone: 'UTC' });
	});

	test('Z and ZZ render the UTC offset', () => {
		expect(new kk_date(test_datetime).format('Z')).toBe('+00:00');
		expect(new kk_date(test_datetime).format('ZZ')).toBe('+0000');
		kk_date.config({ timezone: 'Europe/Istanbul' });
		expect(new kk_date(test_datetime).format('Z')).toBe('+03:00');
		expect(new kk_date(test_datetime).format('ZZ')).toBe('+0300');
	});

	test('Z respects instance timezones and negative offsets', () => {
		expect(new kk_date('2024-01-15 10:00:00').tz('America/New_York').format('Z')).toBe('-05:00');
		expect(new kk_date('2024-01-15 10:00:00').tz('America/New_York').format('ZZ')).toBe('-0500');
		expect(new kk_date('2024-01-15 10:00:00').tz('Asia/Kolkata').format('Z')).toBe('+05:30');
	});

	test('Z works inside real-world templates', () => {
		expect(new kk_date(test_datetime).format('YYYY-MM-DDTHH:mm:ssZ')).toBe('2024-08-19T23:50:59+00:00');
	});

	test('z, zz and zzz render the timezone name', () => {
		expect(new kk_date(test_datetime).format('z')).toBe('UTC');
		expect(new kk_date(test_datetime).format('zz')).toBe(new kk_date(test_datetime).format('z'));
		expect(new kk_date(test_datetime).format('zzz')).toBe('Coordinated Universal Time');
		kk_date.config({ timezone: 'America/New_York' });
		expect(new kk_date('2024-01-15 10:00:00').format('z')).toBe('EST');
		expect(new kk_date('2024-01-15 10:00:00').format('zzz')).toBe('Eastern Standard Time');
		expect(new kk_date('2024-07-15 10:00:00').format('z')).toBe('EDT');
		expect(new kk_date('2024-07-15 10:00:00').format('zzz')).toBe('Eastern Daylight Time');
	});

	test('field-less templates format without converter values', () => {
		expect(new kk_date(test_datetime).format('Z')).toBe('+00:00');
		expect(new kk_date(test_datetime).format('[offset] Z [zone] z')).toBe('offset +00:00 zone UTC');
	});
});

describe('unix tokens', () => {
	test('whole-template X and x still return numbers', () => {
		const date = new kk_date(test_datetime);
		expect(date.format('X')).toBe(1724111459);
		expect(date.format('x')).toBe(1724111459000);
		expect(typeof date.format('X')).toBe('number');
		expect(typeof date.format('x')).toBe('number');
	});

	test('in-template X and x render as digit strings', () => {
		const date = new kk_date(test_datetime);
		expect(date.format('[ts] X')).toBe('ts 1724111459');
		expect(date.format('x [ms]')).toBe('1724111459000 ms');
		expect(typeof date.format('[ts] X')).toBe('string');
	});
});

describe('bracket escaping of new tokens', () => {
	test('bracketed token letters stay literal', () => {
		expect(new kk_date(test_datetime).format('[week] w')).toBe('week 34');
		expect(new kk_date(test_datetime).format('[Z]Z')).toBe('Z+00:00');
		expect(new kk_date(test_datetime).format('[dd] dd')).toBe('dd Mo');
		expect(new kk_date(test_datetime).format('[Week] w [of] gggg')).toBe('Week 34 of 2024');
	});
});

describe('compileFormat token precedence and metadata', () => {
	test('longest-first families compile as single parts', () => {
		expect(compileFormat('Mo').parts).toEqual([{ t: format_part_types.MONTH_ORDINAL, v: '' }]);
		expect(compileFormat('DDDo').parts).toEqual([{ t: format_part_types.DAY_OF_YEAR_ORDINAL, v: '' }]);
		expect(compileFormat('DDDD').parts).toEqual([{ t: format_part_types.DAY_OF_YEAR_PADDED, v: '' }]);
		expect(compileFormat('do').parts).toEqual([{ t: format_part_types.WEEKDAY_ORDINAL, v: '' }]);
		expect(compileFormat('kk').parts).toEqual([{ t: format_part_types.HOUR24_PADDED, v: '' }]);
		expect(compileFormat('dd').parts).toEqual([{ t: format_part_types.NAME, v: 'dd' }]);
	});

	test('non-token letters after greedy matches stay literal', () => {
		expect(compileFormat('ggg').parts).toEqual([
			{ t: format_part_types.WEEK_YEAR2, v: '' },
			{ t: format_part_types.LITERAL, v: 'g' },
		]);
		expect(compileFormat('YYY').parts).toEqual([
			{ t: format_part_types.YEAR2, v: '' },
			{ t: format_part_types.LITERAL, v: 'Y' },
		]);
	});

	test('fractional-second runs compile by length', () => {
		expect(compileFormat('SSS').parts).toEqual([{ t: format_part_types.MILLISECONDS, v: '' }]);
		expect(compileFormat('SSSS').parts).toEqual([{ t: format_part_types.MS_FRACTION, v: 'SSSS' }]);
		expect(compileFormat('S'.repeat(10)).parts).toEqual([
			{ t: format_part_types.MS_FRACTION, v: 'SSSSSSSSS' },
			{ t: format_part_types.MS_FRACTION, v: 'S' },
		]);
	});

	test('fields and derived bits are collected per token', () => {
		expect(compileFormat('w').fields).toEqual(['year', 'month', 'day']);
		expect(compileFormat('Z').fields).toEqual([]);
		expect(compileFormat('X [and] x').fields).toEqual([]);
		expect(compileFormat('w').derived).toBe(format_derived_flags.YMD | format_derived_flags.LOCALE_WEEK);
		expect(compileFormat('E').derived).toBe(format_derived_flags.YMD | format_derived_flags.DOW);
		expect(compileFormat('DDD').derived).toBe(format_derived_flags.YMD | format_derived_flags.DOY);
		expect(compileFormat('W').derived).toBe(format_derived_flags.YMD | format_derived_flags.ISO_WEEK);
		expect(compileFormat('Z').derived).toBe(format_derived_flags.OFFSET);
		expect(compileFormat('YYYY-MM-DD').derived).toBe(0);
	});

	test('h sets the 12-hour flags like hh', () => {
		expect(compileFormat('h')).toMatchObject({ has12h: true, appendMeridiem: true });
		expect(compileFormat('h A')).toMatchObject({ has12h: true, appendMeridiem: false });
	});
});

describe('week math helpers', () => {
	test('getDayOfWeek and getDayOfYear', () => {
		expect(getDayOfWeek(2024, 8, 19)).toBe(1);
		expect(getDayOfWeek(2024, 8, 18)).toBe(0);
		expect(getDayOfYear(2024, 12, 31)).toBe(366);
		expect(getDayOfYear(2023, 12, 31)).toBe(365);
		expect(getDayOfYear(2024, 1, 1)).toBe(1);
	});

	test('getIsoWeekInfo boundary matrix', () => {
		expect(getIsoWeekInfo(2021, 1, 1)).toEqual({ week: 53, year: 2020 });
		expect(getIsoWeekInfo(2024, 12, 30)).toEqual({ week: 1, year: 2025 });
		expect(getIsoWeekInfo(2020, 12, 31)).toEqual({ week: 53, year: 2020 });
		expect(getIsoWeekInfo(2016, 1, 2)).toEqual({ week: 53, year: 2015 });
		expect(getIsoWeekInfo(2024, 8, 19)).toEqual({ week: 34, year: 2024 });
	});

	test('getLocaleWeekInfo boundary matrix', () => {
		expect(getLocaleWeekInfo(2021, 1, 1, 0)).toEqual({ week: 1, year: 2021 });
		expect(getLocaleWeekInfo(2020, 12, 26, 0)).toEqual({ week: 52, year: 2020 });
		expect(getLocaleWeekInfo(2020, 12, 27, 0)).toEqual({ week: 1, year: 2021 });
		expect(getLocaleWeekInfo(2024, 12, 31, 0)).toEqual({ week: 1, year: 2025 });
		expect(getLocaleWeekInfo(2024, 8, 18, 0)).toEqual({ week: 34, year: 2024 });
		expect(getLocaleWeekInfo(2024, 8, 18, 1)).toEqual({ week: 33, year: 2024 });
	});
});

describe('zzz fallback when Intl lacks long timezone names', () => {
	let originalDateTimeFormat;

	beforeAll(() => {
		originalDateTimeFormat = Intl.DateTimeFormat;
	});

	afterAll(() => {
		Intl.DateTimeFormat = originalDateTimeFormat;
		timezone_long_name_cache.clear();
	});

	test('degrades to the abbreviation (Hermes-style engines)', () => {
		function MockDateTimeFormat(locale, options) {
			if (options && options.timeZoneName === 'long') {
				throw new Error('timeZoneName long not supported');
			}
			return new originalDateTimeFormat(locale, options);
		}
		Intl.DateTimeFormat = MockDateTimeFormat;
		timezone_long_name_cache.clear();

		// Fresh timestamp so no earlier formatter_cache entry can serve this call.
		const date = new kk_date('2019-05-05 09:00:00');
		expect(date.format('zzz')).toBe(getTimezoneAbbreviation('UTC', date.date));
	});
});
