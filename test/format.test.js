const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');
const test_date = '2024-08-19';
const test_time = '23:50:59';
const timestamp = 1724111459; // UTC timestamp for 2024-08-19 23:50:59
const global_timezone = 'UTC';

kk_date.config({ timezone: global_timezone });

describe('format', () => {
	test('valid', () => {
		expect(new kk_date(`${test_date}`, 'YYYY-MM-DD').format('YYYY-MM-DD')).toBe(`${test_date}`);
		expect(new kk_date(`${test_time}`, 'HH:mm:ss').format('HH:mm:ss')).toBe(test_time);
		expect(new kk_date(`${test_date} ${test_time}`, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss')).toBe(`${test_date} ${test_time}`);
		expect(new kk_date(`${test_date} ${test_time}`).format()).toBe(`${test_date}T${test_time}+00:00`);
	});

	test('HH:mm:ss', () => {
		expect(new kk_date(`${test_time}`).format('HH:mm:ss')).toBe(`${test_time}`);
		expect(new kk_date(`${test_time}`).add(1, 'minutes').format('HH:mm:ss')).toBe('23:51:59');
		expect(new kk_date(`${test_date} ${test_time}`).format('HH:mm:ss')).toBe(`${test_time}`);
		expect(new kk_date('24:00:00').format('HH:mm:ss')).toBe('00:00:00');
		expect(new kk_date('25:00:00').format('HH:mm:ss')).toBe('01:00:00');
		expect(new kk_date('26:00:00').format('HH:mm:ss')).toBe('02:00:00');
		expect(new kk_date('22:53:00').format('HH:mm:ss')).toBe('22:53:00');
		expect(new kk_date('22:53').format('HH:mm:ss')).toBe('22:53:00');
	});

	test('YYYY-MM-DD', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('YYYY-MM-DD')).toBe(`${test_date}`);
		expect(new kk_date(`${test_date} ${test_time}`).format('YYYY-MM-DD')).toBe(`${test_date}`);
	});

	test('YYYY.MM.DD', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('YYYY.MM.DD')).toBe('2024.08.19');
		expect(new kk_date(`${test_date} 26:00:00`).format('YYYY.MM.DD')).toBe('2024.08.20');
	});

	test('YYYY.MM.DD HH:mm:ss', () => {
		expect(new kk_date(`${test_date} 00:00:00`).format('YYYY.MM.DD HH:mm:ss')).toBe('2024.08.19 00:00:00');
		expect(new kk_date(`${test_date} 24:00:00`).format('YYYY.MM.DD HH:mm:ss')).toBe('2024.08.20 00:00:00');
		expect(new kk_date(`${test_date} 26:00:00`).format('YYYY.MM.DD HH:mm:ss')).toBe('2024.08.20 02:00:00');
	});

	test('DD.MM.YYYY', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('DD.MM.YYYY')).toBe('19.08.2024');
	});

	test('YYYY-MM-DD HH:mm:ss', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('YYYY-MM-DD HH:mm:ss')).toBe(`${test_date} ${test_time}`);
		expect(new kk_date(`${test_date} ${test_time}`).add(1, 'days').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-20 23:50:59');
		expect(new kk_date(`${test_date} ${test_time}`).add(1, 'months').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-09-19 23:50:59');
		expect(new kk_date(`${test_date} ${test_time}`).add(1, 'seconds').add(1, 'months').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-09-19 23:51:00');
		expect(new kk_date(`${test_date} ${test_time}`).format('YYYY-MM-DD HH:mm:ss')).toBe(`${test_date} ${test_time}`);
	});

	test('YYYYMMDD', () => {
		expect(new kk_date(`${test_date}`).format('YYYYMMDD')).toBe('20240819');
	});
	test('YYYYMMDD', () => {
		expect(new kk_date('20191226').format('YYYYMMDD')).toBe('20191226');
	});

	test('YYYYMMDDHHmmss parse', () => {
		expect(new kk_date('20251223194717').format('YYYY-MM-DD HH:mm:ss')).toBe('2025-12-23 19:47:17');
		expect(new kk_date('20240819235059').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 23:50:59');
		expect(new kk_date('20191226120000').format('YYYY-MM-DD HH:mm:ss')).toBe('2019-12-26 12:00:00');
	});

	test('YYYYMMDDHHmmss format', () => {
		expect(new kk_date('2025-12-23 19:47:17').format('YYYYMMDDHHmmss')).toBe('20251223194717');
		expect(new kk_date(`${test_date} ${test_time}`).format('YYYYMMDDHHmmss')).toBe('20240819235059');
		expect(new kk_date('20191226120000').format('YYYYMMDDHHmmss')).toBe('20191226120000');
	});

	test('DD-MM-YYYY', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('DD-MM-YYYY')).toBe('19-08-2024');
		expect(new kk_date('19-08-2024').format('DD-MM-YYYY')).toBe('19-08-2024');
	});

	test('DD-MM-YYYY HH:mm', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('DD-MM-YYYY HH:mm')).toBe('19-08-2024 23:50');
	});

	test('custom format', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format_c(' ', 'YYYY', 'MM', 'DD', 'HH:mm:ss')).toBe('2024 08 19 23:50:59');
		expect(new kk_date(`${test_date} ${test_time}`).format_c(' ', 'YYYY', 'MM', 'dddd', 'HH:mm:ss')).toBe('2024 08 Monday 23:50:59');
	});

	test('dddd', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('dddd').toLocaleLowerCase()).toBe('monday');
		expect(new kk_date(`${test_date} ${test_time}`).format('dddd').toLocaleLowerCase()).toBe('monday');
	});

	test('config test', () => {
		expect(new kk_date(`${test_date} ${test_time}`).config({ locale: 'fr-fr' }).format('dddd').toLocaleLowerCase()).toBe('lundi');
		expect(new kk_date(`${test_date} ${test_time}`).config({ locale: 'tr-tr' }).format('dddd').toLocaleLowerCase()).toBe('pazartesi');
	});

	test('x/X', () => {
		// Unix timestamps are always UTC - no timezone conversion should occur
		const dateFromTimestamp = new kk_date(timestamp * 1000);
		// format('X') should return the exact same Unix timestamp in seconds
		expect(dateFromTimestamp.format('X')).toBe(timestamp);
		// format('x') should return the exact same Unix timestamp in milliseconds
		expect(dateFromTimestamp.format('x')).toBe(timestamp * 1000);

		// Even with .tz() applied, Unix timestamps should remain unchanged
		const utcDate = new kk_date(timestamp * 1000).tz('UTC');
		expect(utcDate.format('X')).toBe(timestamp);
		expect(utcDate.format('x')).toBe(timestamp * 1000);

		// Test with different timezone - should still return same UTC timestamp
		const istanbulDate = new kk_date(timestamp * 1000).tz('Europe/Istanbul');
		expect(istanbulDate.format('X')).toBe(timestamp);
		expect(istanbulDate.format('x')).toBe(timestamp * 1000);
	});

	test('T between the time', () => {
		// Create a date with explicit UTC timezone
		const utcDate = new kk_date(timestamp * 1000).tz('UTC');
		const formatted = utcDate.format('YYYY-MM-DDTHH:mm:ss');
		// Check that it's a valid time format
		expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
	});

	test('DD MMMM YYYY dddd', () => {
		expect(new kk_date('2024-08-19').format('DD MMMM YYYY dddd')).toBe('19 August 2024 Monday');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('DD MMMM YYYY dddd')).toBe('19 Ağustos 2024 Pazartesi');
	});

	test('DD MMMM YYYY', () => {
		expect(new kk_date('2024-08-19').format('DD MMMM YYYY')).toBe('19 August 2024');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('DD MMMM YYYY')).toBe('19 Ağustos 2024');
	});

	test('MMMM YYYY', () => {
		expect(new kk_date('2024-08-19').format('MMMM YYYY')).toBe('August 2024');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('MMMM YYYY')).toBe('Ağustos 2024');
		expect(new kk_date('2024-01-01').format('MMMM YYYY')).toBe('January 2024');
	});

	test('DD MMMM dddd YYYY', () => {
		expect(new kk_date('2024-08-19').format('DD MMMM dddd YYYY')).toBe('19 August Monday 2024');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('DD MMMM dddd YYYY')).toBe('19 Ağustos Pazartesi 2024');
	});

	test('YYYY-MM', () => {
		expect(new kk_date('2024-08-19').format('YYYY-MM')).toBe('2024-08');
		expect(new kk_date('2023-12-01').format('YYYY-MM')).toBe('2023-12');
		// Test parsing (defaults day to 01)
		expect(new kk_date('2024-05').format('YYYY-MM-DD')).toBe('2024-05-01');
	});

	test('DD MMMM dddd', () => {
		const currentYear = new Date().getFullYear();
		expect(new kk_date('2024-08-19').format('DD MMMM dddd')).toBe('19 August Monday');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('DD MMMM dddd')).toBe('19 Ağustos Pazartesi');
		// Test parsing (defaults to current year)
		expect(new kk_date('15 January Tuesday').format('YYYY-MM-DD')).toBe(`${currentYear}-01-15`);
		expect(new kk_date('31 December Sunday').format('YYYY-MM-DD')).toBe(`${currentYear}-12-31`);
		expect(new kk_date('15th January 2024').format('YYYY-MM-DD')).toBe('2024-01-15');
	});

	test('DD MMMM dddd (different lang.)', () => {
		const currentYear = new Date().getFullYear();
		// Test parsing (defaults to current year)
		expect(new kk_date('15 ديسمبر Tuesday').format('YYYY-MM-DD')).toBe(`${currentYear}-12-15`);
		expect(new kk_date('31 दिसंबर Sunday').format('YYYY-MM-DD')).toBe(`${currentYear}-12-31`);
		expect(new kk_date('31 十二月 Sunday').format('YYYY-MM-DD')).toBe(`${currentYear}-12-31`);
		expect(new kk_date('15 ديسمبر Tuesday').config({ locale: 'tr-tr' }).format('DD MMMM YYYY dddd')).toBe(`15 Aralık ${currentYear} Pazartesi`);
	});

	test('YYYY-DD-MM', () => {
		expect(new kk_date('2024-08-19').format('YYYY-DD-MM')).toBe('2024-19-08');
		expect(new kk_date('2023-12-01').format('YYYY-DD-MM')).toBe('2023-01-12');
		// Test parsing
		expect(new kk_date('2024-25-05').format('YYYY-MM-DD')).toBe('2024-05-25');
		expect(new kk_date('2023-10-11', 'YYYY-DD-MM').format('YYYY-MM-DD')).toBe('2023-11-10');
	});

	test('D MMMM YYYY', () => {
		// Formatting
		expect(new kk_date('2024-08-01').format('D MMMM YYYY')).toBe('1 August 2024');
		expect(new kk_date('2024-08-19').format('D MMMM YYYY')).toBe('19 August 2024');
		expect(new kk_date('2024-01-05').config({ locale: 'tr-tr' }).format('D MMMM YYYY')).toBe('5 Ocak 2024');
		// Parsing
		expect(new kk_date('1 January 2024').format('YYYY-MM-DD')).toBe('2024-01-01');
		expect(new kk_date('05 December 2023').format('YYYY-MM-DD')).toBe('2023-12-05');
		expect(new kk_date('31 July 2025').format('YYYY-MM-DD')).toBe('2025-07-31');
	});

	test('format caching tests', () => {
		// cache enable test;
		kk_date.caching({ status: true });
		const status1 = kk_date.caching_status();
		expect(status1.status).toBe(true);
		// enable later some tests;
		expect(new kk_date('2024-08-19').config({ locale: 'de-de' }).format('dddd')).toBe('Montag'); // German
		expect(new kk_date('2024-08-19').config({ locale: 'es-es' }).format('dddd')).toBe('lunes'); // Spanish
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('dddd')).toBe('Pazartesi'); // Turkish
		// cache disable test;
		kk_date.caching({ status: false });
		const status2 = kk_date.caching_status();
		expect(status2.status).toBe(false);
		// disable later some tests
		expect(new kk_date('2024-08-19').config({ locale: 'de-de' }).format('dddd')).toBe('Montag'); // German
		expect(new kk_date('2024-08-19').config({ locale: 'es-es' }).format('dddd')).toBe('lunes'); // Spanish
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('dddd')).toBe('Pazartesi'); // Turkish
	});

	test('MMM - Short month name', () => {
		expect(new kk_date('2024-01-01').format('MMM')).toBe('Jan');
		expect(new kk_date('2024-08-19').format('MMM')).toBe('Aug');
		expect(new kk_date('2024-12-31').format('MMM')).toBe('Dec');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('MMM')).toBe('Ağu');
	});

	test('MMMM - Full month name', () => {
		expect(new kk_date('2024-01-01').format('MMMM')).toBe('January');
		expect(new kk_date('2024-08-19').format('MMMM')).toBe('August');
		expect(new kk_date('2024-12-31').format('MMMM')).toBe('December');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('MMMM')).toBe('Ağustos');
	});

	test('ddd - Short weekday name', () => {
		expect(new kk_date('2024-08-19').format('ddd')).toBe('Mon');
		expect(new kk_date('2024-08-20').format('ddd')).toBe('Tue');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('ddd')).toBe('Pzt');
	});

	test('DD MMM YYYY - Date with short month', () => {
		expect(new kk_date('2024-08-19').format('DD MMM YYYY')).toBe('19 Aug 2024');
		expect(new kk_date('2024-01-01').format('DD MMM YYYY')).toBe('01 Jan 2024');
		expect(new kk_date('2024-12-31').format('DD MMM YYYY')).toBe('31 Dec 2024');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('DD MMM YYYY')).toBe('19 Ağu 2024');
	});

	test('DD MMM - Date with short month, no year', () => {
		expect(new kk_date('2024-08-19').format('DD MMM')).toBe('19 Aug');
		expect(new kk_date('2024-01-01').format('DD MMM')).toBe('01 Jan');
		expect(new kk_date('2024-12-31').format('DD MMM')).toBe('31 Dec');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('DD MMM')).toBe('19 Ağu');
	});

	test('MMM YYYY - Short month with year', () => {
		expect(new kk_date('2024-08-19').format('MMM YYYY')).toBe('Aug 2024');
		expect(new kk_date('2024-01-01').format('MMM YYYY')).toBe('Jan 2024');
		expect(new kk_date('2024-12-31').format('MMM YYYY')).toBe('Dec 2024');
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('MMM YYYY')).toBe('Ağu 2024');
	});

	test('DD MMM YYYY HH:mm - Date with short month and time', () => {
		expect(new kk_date('2024-08-19 14:30:00').format('DD MMM YYYY HH:mm')).toBe('19 Aug 2024 14:30');
		expect(new kk_date('2024-01-01 00:00:00').format('DD MMM YYYY HH:mm')).toBe('01 Jan 2024 00:00');
		expect(new kk_date('2024-12-31 23:59:59').format('DD MMM YYYY HH:mm')).toBe('31 Dec 2024 23:59');
		expect(new kk_date('2024-08-19 14:30:00').config({ locale: 'tr-tr' }).format('DD MMM YYYY HH:mm')).toBe('19 Ağu 2024 14:30');
	});

	test('Localization formats', () => {
		expect(new kk_date('2024-08-19').config({ locale: 'de-de' }).format('dddd')).toBe('Montag'); // German
		expect(new kk_date('2024-08-19').config({ locale: 'es-es' }).format('dddd')).toBe('lunes'); // Spanish
		expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('dddd')).toBe('Pazartesi'); // Turkish
	});
});

describe('day tests', () => {
	test('should handle all days of the month', () => {
		const days = Array.from({ length: 31 }, (_, i) => i + 1);
		for (const day of days) {
			const paddedDay = day.toString().padStart(2, '0');
			const date = new kk_date(`2024-01-${paddedDay}`);
			expect(date.format('DD')).toBe(paddedDay);
		}
	});

	test('should handle month transitions', () => {
		const testCases = [
			{ input: '2024-01-31', add: 1, expected: '2024-02-01' },
			{ input: '2024-02-29', add: 1, expected: '2024-03-01' },
			{ input: '2024-12-31', add: 1, expected: '2025-01-01' },
			{ input: '2024-01-01', add: -1, expected: '2023-12-31' },
		];

		for (const { input, add, expected } of testCases) {
			const date = new kk_date(input);
			expect(date.add(add, 'days').format('YYYY-MM-DD')).toBe(expected);
		}
	});

	test('should handle leap year days', () => {
		const testCases = [
			{ year: 2024, month: 2, day: 29, expected: '2024-02-29 00:00:00' },
			{ year: 2025, month: 2, day: 29, expected: '2025-03-01 00:00:00' },
			{ year: 2100, month: 2, day: 29, expected: '2100-03-01 00:00:00' },
			{ year: 2000, month: 2, day: 29, expected: '2000-02-29 00:00:00' },
		];

		for (const { year, month, day, expected } of testCases) {
			expect(new kk_date(`${year}-${month}-${day}`).format('YYYY-MM-DD HH:mm:ss')).toBe(expected);
		}
	});
});

describe('month tests', () => {
	test('should handle all months of the year', () => {
		const months = Array.from({ length: 12 }, (_, i) => i + 1);
		for (const month of months) {
			const paddedMonth = month.toString().padStart(2, '0');
			const date = new kk_date(`2024-${paddedMonth}-01`);
			expect(date.format('MM')).toBe(paddedMonth);
		}
	});

	test('should handle month transitions', () => {
		const testCases = [
			{ input: '2024-01-31', add: 1, expected: '2024-02-29' },
			{ input: '2024-02-29', add: 1, expected: '2024-03-29' },
			{ input: '2024-12-31', add: 1, expected: '2025-01-31' },
			{ input: '2024-01-31', add: -1, expected: '2023-12-31' },
		];

		for (const { input, add, expected } of testCases) {
			const date = new kk_date(input);
			expect(date.add(add, 'months').format('YYYY-MM-DD')).toBe(expected);
		}
	});

	test('should handle month names in different locales', () => {
		const months = [
			{ month: 1, en: 'January', tr: 'Ocak', de: 'Januar' },
			{ month: 6, en: 'June', tr: 'Haziran', de: 'Juni' },
			{ month: 12, en: 'December', tr: 'Aralık', de: 'Dezember' },
		];

		for (const { month, en, tr, de } of months) {
			const date = new kk_date(`2024-${month}-01`);
			expect(date.format('MMMM')).toBe(en);
			expect(date.config({ locale: 'tr-TR' }).format('MMMM')).toBe(tr);
			expect(date.config({ locale: 'de-DE' }).format('MMMM')).toBe(de);
		}
	});
});

describe('year tests', () => {
	test('should handle year transitions', () => {
		const testCases = [
			{ input: '2024-12-31', add: 1, expected: '2025-12-31' },
			{ input: '2024-01-01', add: -1, expected: '2023-01-01' },
			{ input: '2024-02-29', add: 4, expected: '2028-02-29' },
			{ input: '2024-02-29', add: 1, expected: '2025-03-01' },
		];

		for (const { input, add, expected } of testCases) {
			expect(new kk_date(input).add(add, 'years').format('YYYY-MM-DD')).toBe(expected);
		}
	});

	test('should handle century transitions', () => {
		const testCases = [
			{ input: '1999-12-31', add: 1, expected: '2000-12-31' },
			{ input: '2000-01-01', add: -1, expected: '1999-01-01' },
			{ input: '2099-12-31', add: 1, expected: '2100-12-31' },
		];

		for (const { input, add, expected } of testCases) {
			const date = new kk_date(input);
			expect(date.add(add, 'years').format('YYYY-MM-DD')).toBe(expected);
		}
	});
});

describe('newly added format templates', () => {
	const test_date = '2024-08-19';
	const test_time = '14:30:45';
	const base_datetime = `${test_date} ${test_time}`;

	test('YYYY-MM-DD HH:mm format', () => {
		expect(new kk_date(base_datetime).format('YYYY-MM-DD HH:mm')).toBe('2024-08-19 14:30');
		expect(new kk_date('2024-01-01 09:05:30').format('YYYY-MM-DD HH:mm')).toBe('2024-01-01 09:05');
		expect(new kk_date('2024-12-31 23:59:59').format('YYYY-MM-DD HH:mm')).toBe('2024-12-31 23:59');
	});

	test('YYYY.MM.DD HH:mm format', () => {
		expect(new kk_date(base_datetime).format('YYYY.MM.DD HH:mm')).toBe('2024.08.19 14:30');
		expect(new kk_date('2024-01-01 09:05:30').format('YYYY.MM.DD HH:mm')).toBe('2024.01.01 09:05');
		expect(new kk_date('2024-12-31 23:59:59').format('YYYY.MM.DD HH:mm')).toBe('2024.12.31 23:59');
	});

	test('DD MMMM dddd, YYYY format', () => {
		expect(new kk_date('2024-08-19').format('DD MMMM dddd, YYYY')).toBe('19 August Monday, 2024');
		expect(new kk_date('2024-01-01').format('DD MMMM dddd, YYYY')).toBe('01 January Monday, 2024');
		expect(new kk_date('2024-12-25').format('DD MMMM dddd, YYYY')).toBe('25 December Wednesday, 2024');
	});

	test('YYYY MMM DD format (reverse order)', () => {
		expect(new kk_date('2024-08-19').format('YYYY MMM DD')).toBe('2024 Aug 19');
		expect(new kk_date('2024-01-01').format('YYYY MMM DD')).toBe('2024 Jan 01');
		expect(new kk_date('2024-12-31').format('YYYY MMM DD')).toBe('2024 Dec 31');
	});

	test('YYYY MMMM DD format (reverse order full)', () => {
		expect(new kk_date('2024-08-19').format('YYYY MMMM DD')).toBe('2024 August 19');
		expect(new kk_date('2024-01-01').format('YYYY MMMM DD')).toBe('2024 January 01');
		expect(new kk_date('2024-12-31').format('YYYY MMMM DD')).toBe('2024 December 31');
	});

	test('midnight hour should format as 00 not 24', () => {
		// Test case for the bug where midnight was showing as 24:00:00 instead of 00:00:00
		const midnight = new kk_date('2025-10-25').startOf('days');
		expect(midnight.format('YYYY-MM-DD HH:mm:ss')).toBe('2025-10-25 00:00:00');
		expect(midnight.format('HH')).toBe('00');
		expect(midnight.format('HH:mm')).toBe('00:00');
		expect(midnight.format('HH:mm:ss')).toBe('00:00:00');

		// Test with different dates to ensure consistency
		expect(new kk_date('2024-01-01').startOf('days').format('HH:mm:ss')).toBe('00:00:00');
		expect(new kk_date('2024-12-31').startOf('days').format('HH:mm:ss')).toBe('00:00:00');
	});
});
