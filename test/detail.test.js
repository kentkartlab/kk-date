const { describe, test, expect, afterEach } = require('@jest/globals');
const kk_date = require('../index');
const test_date = '2024-08-19';
const test_time = '23:50:59';
const timestamp = 1724100659;

const timezone = 'Europe/Istanbul';

kk_date.config({ timezone: timezone });

describe('kk_date validation', () => {
	test('not valid', () => {
		expect(() => {
			new kk_date('2025-01-31', 'HH:mm:ss');
		}).toThrow();
		expect(() => {
			new kk_date('2025-01-31', 'HH:mm');
		}).toThrow();
		expect(() => {
			new kk_date('2025-01-31', 'YYYY/MM/DD');
		}).toThrow();
	});
	test('valid', () => {
		expect(new kk_date(`${test_date}`, 'YYYY-MM-DD').format('YYYY-MM-DD')).toBe(`${test_date}`);
		expect(new kk_date(`${test_time}`, 'HH:mm:ss').format('HH:mm:ss')).toBe(test_time);
		expect(new kk_date(`${test_date} ${test_time}`, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss')).toBe(`${test_date} ${test_time}`);
	});
});

describe('kk_date format', () => {
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
		expect(new kk_date(timestamp).format('YYYY-MM-DD')).toBe(`${test_date}`);
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
		expect(new kk_date(timestamp).format('YYYY-MM-DD HH:mm:ss')).toBe(`${test_date} ${test_time}`);
	});

	test('YYYYMMDD', () => {
		expect(new kk_date(`${test_date}`).format('YYYYMMDD')).toBe('20240819');
	});
	test('YYYYMMDD', () => {
		expect(new kk_date('20191226').format('YYYYMMDD')).toBe('20191226');
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
		expect(new kk_date(timestamp).format('dddd').toLocaleLowerCase()).toBe('monday');
	});

	test('config test', () => {
		expect(new kk_date(`${test_date} ${test_time}`).config({ locale: 'fr-fr' }).format('dddd').toLocaleLowerCase()).toBe('lundi');
		expect(new kk_date(timestamp).config({ locale: 'tr-tr' }).format('dddd').toLocaleLowerCase()).toBe('pazartesi');
	});

	test('x/X', () => {
		expect(new kk_date(timestamp).format('X')).toBe(timestamp);
		expect(new kk_date(timestamp).format('x')).toBe(timestamp * 1000);
	});

	test('T between the time', () => {
		expect(new kk_date(timestamp).format('YYYY-MM-DDTHH:mm:ss')).toBe('2024-08-19T23:50:59');
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
});

describe('kk_date startOf / endOf', () => {
	const testDateTime = '2024-08-19 14:35:45';
	const testLeapDateTime = '2024-02-15 10:10:10'; // Leap year
	const testEndOfMonthDateTime = '2024-03-31 12:00:00';

	// --- startOf Tests ---
	test('startOf year', () => {
		expect(new kk_date(testDateTime).startOf('year').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-01-01 00:00:00');
	});
	test('startOf month', () => {
		expect(new kk_date(testDateTime).startOf('month').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-01 00:00:00');
	});
	test('startOf week (assuming Sunday start)', () => {
		// 2024-08-19 is a Monday (day 1)
		expect(new kk_date(testDateTime).startOf('week').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-18 00:00:00');
		// Test with a Sunday
		expect(new kk_date('2024-08-18 10:00:00').startOf('week').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-18 00:00:00');
	});
	test('startOf day', () => {
		expect(new kk_date(testDateTime).startOf('day').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 00:00:00');
	});
	test('startOf hour', () => {
		expect(new kk_date(testDateTime).startOf('hour').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 14:00:00');
	});
	test('startOf minute', () => {
		expect(new kk_date(testDateTime).startOf('minute').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 14:35:00');
	});
	test('startOf second', () => {
		expect(new kk_date(testDateTime).startOf('second').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 14:35:45');
	});

	// --- endOf Tests ---
	test('endOf year', () => {
		expect(new kk_date(testDateTime).endOf('year').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-12-31 23:59:59');
	});
	test('endOf month', () => {
		expect(new kk_date(testDateTime).endOf('month').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-31 23:59:59');
		// Test leap year February
		expect(new kk_date(testLeapDateTime).endOf('month').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-02-29 23:59:59');
		// Test non-leap year February
		expect(new kk_date('2025-02-10').endOf('month').format('YYYY-MM-DD HH:mm:ss')).toBe('2025-02-28 23:59:59');
		// Test 30-day month
		expect(new kk_date('2024-04-15').endOf('month').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-04-30 23:59:59');
		// Test 31-day month
		expect(new kk_date(testEndOfMonthDateTime).endOf('month').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-03-31 23:59:59');
	});
	test('endOf week (assuming Saturday end)', () => {
		// 2024-08-19 is a Monday (day 1)
		expect(new kk_date(testDateTime).endOf('week').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-24 23:59:59');
		// Test with a Saturday
		expect(new kk_date('2024-08-24 10:00:00').endOf('week').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-24 23:59:59');
	});
	test('endOf day', () => {
		expect(new kk_date(testDateTime).endOf('day').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 23:59:59');
	});
	test('endOf hour', () => {
		expect(new kk_date(testDateTime).endOf('hour').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 14:59:59');
	});
	test('endOf minute', () => {
		expect(new kk_date(testDateTime).endOf('minute').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 14:35:59');
	});
	test('endOf second', () => {
		expect(new kk_date(testDateTime).endOf('second').format('HH:mm:ss.SSS')).toBe('14:35:45.999');
	});

	test('startOf/endOf chaining', () => {
		expect(new kk_date(testDateTime).startOf('day').add(12, 'hours').format('HH:mm')).toBe('12:00');
		expect(new kk_date(testDateTime).endOf('month').startOf('day').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-31 00:00:00');
	});

	test('startOf/endOf invalid unit', () => {
		expect(() => new kk_date(testDateTime).startOf('years')).toThrow('Invalid unit for startOf: years');
		expect(() => new kk_date(testDateTime).endOf('days')).toThrow('Invalid unit for endOf: days');
	});
});

describe('kk_date add', () => {
	test('should not jump month', () => {
		expect(new kk_date('2025-01-31').add(1, 'months').format('YYYY-MM-DD')).toBe('2025-02-28');
		expect(new kk_date('2023-01-31').add(1, 'months').format('YYYY-MM-DD')).toBe('2023-02-28');
		expect(new kk_date('2024-03-31').add(1, 'months').format('YYYY-MM-DD')).toBe('2024-04-30');
		expect(new kk_date('2024-01-15').add(1, 'months').format('YYYY-MM-DD')).toBe('2024-02-15');
	});
});

describe('kk_date diff', () => {
	test('diff', () => {
		expect(new kk_date(`${test_date}`).diff('2024-09-19', 'months')).toBe(1);
		expect(new kk_date(`${test_date}`).add(-1, 'months').diff('2024-09-19', 'months')).toBe(2);
	});

	test('diff range', () => {
		expect(new kk_date(`${test_date}`).add(-1, 'months').diff_range('2024-09-19', 'months')).toHaveLength(3);
		expect(new kk_date(`${test_date}`).add(-1, 'months').diff_range('2024-09-19', 'months')).toHaveLength(3);
	});
});

describe('kk_date before / after', () => {
	test('is after', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isAfter('2024-08-18')).toBe(true);
	});

	test('is before', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isBefore('2024-08-20')).toBe(true);
	});

	test('is same or after', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isSameOrAfter('2024-08-18')).toBe(true);
	});
});

describe('kk_date set date', () => {
	test('set day', () => {
		expect(new kk_date(`${test_date} ${test_time}`).set('day', 20).set('year', '2025').isSame(`2025-08-20 ${test_time}`)).toBe(true);
	});

	test('set year', () => {
		expect(new kk_date(`${test_date} ${test_time}`).set('year', 2025).isSame(`2025-08-19 ${test_time}`)).toBe(true);
	});
});

describe('kk_date date checks', () => {
	test('is between', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isBetween('2024-08-19', '2024-08-19 23:51')).toBe(true);
	});
	test('is same', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isSame(`${test_date} ${test_time}`)).toBe(true);
	});
});

describe('kk_date valid / invalid', () => {
	test('invalid date', () => {
		expect(() => {
			new kk_date('asfasf1231231231asdasd').getDate();
		}).toThrow('Invalid Date');
		expect(() => {
			new kk_date(new Date('123123asdsad21231')).getDate();
		}).toThrow('Invalid Date');
		expect(() => {
			new kk_date(`${test_date} ${test_time}`).isSame('123123assadfa21312s');
		}).toThrow('Invalid Date');
		expect(() => {
			new kk_date(`${test_date} asdasd`);
		}).toThrow('Invalid Date');
		expect(() => {
			new kk_date(`${test_date}a 23:25:00`);
		}).toThrow('Invalid Date');
		expect(() => {
			new kk_date(null);
		}).toThrow('Invalid Date');
		expect(() => {
			new kk_date(undefined);
		}).toThrow('Invalid Date');
		expect(() => new kk_date('32 Aug 2024').getDate()).toThrow('Invalid Date');
		expect(() => new kk_date('19 Invalid 2024').getDate()).toThrow('Invalid Date');
	});

	test('is valid', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isValid()).toBe(true);
		expect(new kk_date('Jan 2024').isValid()).toBe(true);
		expect(new kk_date('19 Aug 2024').isValid()).toBe(true);
		expect(new kk_date('19 Aug').isValid()).toBe(true);
		expect(new kk_date('19 Aug 2024 14:30').isValid()).toBe(true);
	});
});

describe('kk_date duration', () => {
	test('duration year', () => {
		const response = kk_date.duration(1, 'year');
		expect(response.year).toBe(1);
		expect(response.month).toBe(0);
		expect(response.week).toBe(0);
		expect(response.day).toBe(0);
		expect(response.hour).toBe(0);
		expect(response.minute).toBe(0);
		expect(response.second).toBe(0);
	});

	test('duration month', () => {
		const response = kk_date.duration(65, 'day');
		expect(response.year).toBe(0);
		expect(response.month).toBe(2);
		expect(response.week).toBe(0);
		expect(response.day).toBe(3);
		expect(response.hour).toBe(0);
		expect(response.minute).toBe(0);
		expect(response.second).toBe(0);
	});

	test('duration day', () => {
		const response = kk_date.duration(200, 'minute');
		expect(response.year).toBe(0);
		expect(response.month).toBe(0);
		expect(response.week).toBe(0);
		expect(response.day).toBe(0);
		expect(response.hour).toBe(3);
		expect(response.minute).toBe(20);
		expect(response.second).toBe(0);
	});

	test('duration minute', () => {
		const response = kk_date.duration(50, 'minute');
		expect(response.year).toBe(0);
		expect(response.month).toBe(0);
		expect(response.week).toBe(0);
		expect(response.day).toBe(0);
		expect(response.hour).toBe(0);
		expect(response.minute).toBe(50);
		expect(response.second).toBe(0);
	});

	test('duration invalid time', () => {
		expect(() => kk_date.duration('')).toThrow('Invalid time');
		expect(() => kk_date.duration(0)).toThrow('Invalid time');
		expect(() => kk_date.duration(-3)).toThrow('Invalid time');
	});

	test('duration invalid type', () => {
		expect(() => kk_date.duration(10, 'days')).toThrow('Invalid type');
		expect(() => kk_date.duration(10, '')).toThrow('Invalid type');
		expect(() => kk_date.duration(10)).toThrow('Invalid type');
	});
});

describe('kk_date instance duration method', () => {
	test('duration with timestamp', () => {
		const date = new kk_date();
		const response = date.duration(65); // 65 seconds
		expect(response.year).toBe(0);
		expect(response.month).toBe(0);
		expect(response.week).toBe(0);
		expect(response.day).toBe(0);
		expect(response.hour).toBe(0);
		expect(response.minute).toBe(1);
		expect(response.second).toBe(5);
	});

	test('duration with large timestamp', () => {
		const date = new kk_date();
		const response = date.duration(86400); // 1 day in seconds
		expect(response.year).toBe(0);
		expect(response.month).toBe(0);
		expect(response.week).toBe(0);
		expect(response.day).toBe(1);
		expect(response.hour).toBe(0);
		expect(response.minute).toBe(0);
		expect(response.second).toBe(0);
	});

	test('duration with complex timestamp', () => {
		const date = new kk_date();
		const response = date.duration(90061); // 1 day, 1 hour, 1 minute, 1 second
		expect(response.year).toBe(0);
		expect(response.month).toBe(0);
		expect(response.week).toBe(0);
		expect(response.day).toBe(1);
		expect(response.hour).toBe(1);
		expect(response.minute).toBe(1);
		expect(response.second).toBe(1);
	});

	test('duration with invalid inputs', () => {
		const date = new kk_date();
		expect(() => date.duration(-1)).toThrow('Invalid time');
		expect(() => date.duration(0)).toThrow('Invalid time');
		expect(() => date.duration(null)).toThrow('Invalid time');
		expect(() => date.duration(undefined)).toThrow('Invalid time');
		expect(() => date.duration('not a number')).toThrow('Invalid time');
	});
});

test('Localization formats', () => {
	expect(new kk_date('2024-08-19').config({ locale: 'de-de' }).format('dddd')).toBe('Montag'); // German
	expect(new kk_date('2024-08-19').config({ locale: 'es-es' }).format('dddd')).toBe('lunes'); // Spanish
	expect(new kk_date('2024-08-19').config({ locale: 'tr-tr' }).format('dddd')).toBe('Pazartesi'); // Turkish
});

test('caching tests', () => {
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

describe('KkDate Timezone Tests', () => {
	const originalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	afterEach(() => {
		// Reset timezone to original after each test
		kk_date.config({ timezone: originalTimezone });
	});

	describe('Global Timezone Configuration', () => {
		test('should correctly set global timezone', () => {
			kk_date.config({ timezone: 'Europe/Istanbul' });
			const date = new kk_date(`${test_date} ${test_time}`);
			expect(date.format('HH:mm')).toBe('23:50');
		});

		test('should handle invalid timezone gracefully', () => {
			expect(() => {
				kk_date.config({ timezone: 'Invalid/Timezone' });
			}).toThrow();
			expect(() => {
				new kk_date(`${test_date} ${test_time}`).tz('Invalid/Timezone');
			}).toThrow();
		});

		test('should affect all new KkDate instances', () => {
			kk_date.config({ timezone: 'Europe/London' });
			const date1 = new kk_date(`${test_date} ${test_time}`);
			const date2 = new kk_date(`${test_date} ${test_time}`);

			expect(date1.format('HH:mm')).toBe(date2.format('HH:mm'));
		});

		test('should maintain timezone across operations', () => {
			kk_date.config({ timezone: 'Europe/London' });
			const date = new kk_date(`${test_date} ${test_time}`);
			const newDate = date.add(1, 'hours');

			expect(newDate.format('HH:mm')).toBe('00:50');
		});
	});

	describe('.tz() Method', () => {
		test('should convert time to specified timezone', () => {
			const date = new kk_date(`${test_date} ${test_time}`);
			const converted = date.tz('America/New_York');
			expect(converted.format('HH:mm')).not.toBe('23:50');
		});

		test('should handle timezone changes correctly', () => {
			const date = new kk_date(`${test_date} ${test_time}`);
			const tokyoHour = date.tz('Asia/Tokyo').format('HH:mm');
			const londonHour = date.tz('Europe/London').format('HH:mm');
			expect(tokyoHour).not.toBe(londonHour);
		});

		test('should maintain date integrity across timezone changes', () => {
			const original = new kk_date(`${test_date} ${test_time}`);
			const converted = original.tz('Asia/Tokyo').tz('America/Los_Angeles');
			expect(converted.toUTCString()).toBe(original.toUTCString());
		});

		test('should handle invalid timezone', () => {
			const date = new kk_date(`${test_date} ${test_time}`);
			expect(() => {
				date.tz('Invalid/Timezone');
			}).toThrow();
		});

		test('should preserve time when converting to same timezone', () => {
			const date = new kk_date(`${test_date} ${test_time}`);
			const sameZone = date.tz(originalTimezone);

			expect(sameZone.format('HH:mm')).toBe('23:50');
		});
	});

	describe('Timezone and Locale Interaction', () => {
		test('should handle timezone and locale together', () => {
			const date = new kk_date(`${test_date} ${test_time}`);
			date.config({ locale: 'tr-TR', timezone: 'Europe/Istanbul' });
			expect(date.format('dddd')).toMatch(/Pazartesi/);
		});

		test('should maintain timezone when changing locale', () => {
			const date = new kk_date(`${test_date} ${test_time}`);
			date.tz('Asia/Tokyo');
			date.config({ locale: 'en-US' });

			const time = date.format('HH:mm');
			date.config({ locale: 'ja-JP' });

			expect(date.format('HH:mm')).toBe(time);
		});
	});
});

describe('KkDate fromNow Tests', () => {
	test('should return seconds ago', () => {
		const fewSecondsAgo = new kk_date().add(-15, 'seconds');
		expect(fewSecondsAgo.fromNow()).toMatch(/seconds ago|second ago/);
	});

	test('should return minutes ago', () => {
		const fewMinutesAgo = new kk_date().add(-5, 'minutes');
		expect(fewMinutesAgo.fromNow()).toMatch(/minutes ago|minute ago/);
	});

	test('should return an hour ago', () => {
		const anHourAgo = new kk_date().add(-1, 'hours');
		expect(anHourAgo.fromNow()).toMatch(/an hour ago|1 hour ago/);
	});

	test('should return hours ago', () => {
		const fewHoursAgo = new kk_date().add(-5, 'hours');
		expect(fewHoursAgo.fromNow()).toMatch(/hours ago/);
	});

	test('should return a day ago', () => {
		const yesterday = new kk_date().add(-1, 'days');
		expect(yesterday.fromNow()).toMatch(/a day ago|yesterday|1 day ago/);
	});

	test('should return days ago', () => {
		const fewDaysAgo = new kk_date().add(-5, 'days');
		expect(fewDaysAgo.fromNow()).toMatch(/days ago/);
	});

	test('should return a month ago', () => {
		const lastMonth = new kk_date().add(-1, 'months');
		expect(lastMonth.fromNow()).toMatch(/last month/);
	});

	test('should return months ago', () => {
		const fewMonthsAgo = new kk_date().add(-5, 'months');
		expect(fewMonthsAgo.fromNow()).toMatch(/months ago/);
	});

	test('should return a year ago', () => {
		const lastYear = new kk_date().add(-1, 'years');
		expect(lastYear.fromNow()).toMatch(/a year ago|1 year ago|last year/);
	});

	test('should return years ago', () => {
		const fewYearsAgo = new kk_date().add(-5, 'years');
		expect(fewYearsAgo.fromNow()).toMatch(/years ago/);
	});

	test('should return in seconds', () => {
		const inFewSeconds = new kk_date().add(15, 'seconds');
		expect(inFewSeconds.fromNow()).toMatch(/in .* seconds|in .* second/);
	});

	test('should return in minutes', () => {
		const inFewMinutes = new kk_date().add(5, 'minutes');
		expect(inFewMinutes.fromNow()).toMatch(/in .* minutes|in .* minute/);
	});

	test('should return in an hour', () => {
		const inAnHour = new kk_date().add(1, 'hours');
		expect(inAnHour.fromNow()).toMatch(/in an hour|in 1 hour/);
	});

	test('should return in hours', () => {
		const inFewHours = new kk_date().add(5, 'hours');
		expect(inFewHours.fromNow()).toMatch(/in .* hours/);
	});

	test('should return in a day', () => {
		const tomorrow = new kk_date().add(1, 'days');
		expect(tomorrow.fromNow()).toMatch(/in a day|tomorrow|in 1 day/);
	});

	test('should return in days', () => {
		const inFewDays = new kk_date().add(5, 'days');
		expect(inFewDays.fromNow()).toMatch(/in .* days/);
	});

	test('should return in a month', () => {
		const nextMonth = new kk_date().add(1, 'months');
		expect(nextMonth.fromNow()).toMatch(/next month/);
	});

	test('should return in months', () => {
		const inFewMonths = new kk_date().add(5, 'months');
		expect(inFewMonths.fromNow()).toMatch(/in .* months/);
	});

	test('should return in a year', () => {
		const nextYear = new kk_date().add(1, 'years');
		expect(nextYear.fromNow()).toMatch(/in a year|in 1 year|next year/);
	});

	test('should return in years', () => {
		const inFewYears = new kk_date().add(5, 'years');
		expect(inFewYears.fromNow()).toMatch(/in .* years/);
	});

	// --- Locale Tests --- //
	test('should return relative time in Turkish', () => {
		const date = new kk_date().add(-3, 'days');
		kk_date.config({ locale: 'tr-TR' });
		expect(date.fromNow()).toMatch(/gün önce/);

		const futureDate = new kk_date().add(3, 'hours');
		expect(futureDate.fromNow()).toMatch(/saat sonra/);

		kk_date.config({ locale: 'en-US' });
	});

	test('should return relative time in German using instance config', () => {
		const date = new kk_date().add(-5, 'minutes');
		expect(date.config({ locale: 'de-DE' }).fromNow()).toMatch(/Minuten/);

		const futureDate = new kk_date().add(1, 'months');
		expect(futureDate.config({ locale: 'de-DE' }).fromNow()).toMatch(/Monat|Wochen|Tagen/);
	});

	test('should default to English for unsupported/invalid locale', () => {
		const date = new kk_date().add(-10, 'seconds');
		expect(() => kk_date.config({ locale: 'absolutly-invalid-locale' })).toThrow();
		expect(date.fromNow()).toMatch(/seconds ago/);
		kk_date.config({ locale: 'en-US' });
	});
});

describe('Comprehensive Time Tests', () => {
	describe('Hour Tests', () => {
		test('should handle all hours of the day', () => {
			const hours = Array.from({ length: 24 }, (_, i) => i);
			for (const hour of hours) {
				const paddedHour = hour.toString().padStart(2, '0');
				const date = new kk_date(`2024-01-01 ${paddedHour}:00:00`);
				expect(date.format('HH')).toBe(paddedHour);
			}
		});

		test('should handle hour transitions', () => {
			const testCases = [
				{ input: '23:59:59', add: 1, expected: '00:59:59' },
				{ input: '00:00:00', add: -1, expected: '23:00:00' },
				{ input: '12:00:00', add: 12, expected: '00:00:00' },
				{ input: '00:00:00', add: 24, expected: '00:00:00' },
			];

			for (const { input, add, expected } of testCases) {
				expect(new kk_date(`2024-01-01 ${input}`).add(add, 'hours').format('HH:mm:ss')).toBe(expected);
			}
		});
	});

	describe('Day Tests', () => {
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

	describe('Month Tests', () => {
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

	describe('Year Tests', () => {
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

	describe('Combined Time Tests', () => {
		test('should handle complex time operations', () => {
			const testCases = [
				{
					input: '2024-01-31 23:59:59',
					operations: [
						{ type: 'add', value: 1, unit: 'seconds' },
						{ type: 'add', value: 1, unit: 'minutes' },
						{ type: 'add', value: 1, unit: 'hours' },
					],
					expected: '2024-02-01 01:01:00',
				},
				{
					input: '2024-12-31 23:59:59',
					operations: [
						{ type: 'add', value: 1, unit: 'seconds' },
						{ type: 'add', value: 1, unit: 'minutes' },
						{ type: 'add', value: 1, unit: 'hours' },
					],
					expected: '2025-01-01 01:01:00',
				},
			];

			for (const { input, operations, expected } of testCases) {
				let date = new kk_date(input);
				for (const { type, value, unit } of operations) {
					date = type === 'add' ? date.add(value, unit) : date.add(-value, unit);
				}
				expect(date.format('YYYY-MM-DD HH:mm:ss')).toBe(expected);
			}
		});

		test('should handle timezone with complex operations', () => {
			const testCases = [
				{
					input: '2024-01-01 23:59:59',
					timezone: 'America/New_York',
					operations: [
						{ type: 'add', value: 1, unit: 'seconds' },
						{ type: 'add', value: 1, unit: 'minutes' },
					],
					expected: '2024-01-02 00:01:00',
				},
				{
					input: '2024-12-31 23:59:59',
					timezone: 'Asia/Tokyo',
					operations: [
						{ type: 'add', value: 1, unit: 'seconds' },
						{ type: 'add', value: 1, unit: 'minutes' },
					],
					expected: '2025-01-01 00:01:00',
				},
			];

			for (const { input, timezone, operations, expected } of testCases) {
				// change timezone
				kk_date.config({ timezone: timezone });
				let date = new kk_date(input);
				for (const { type, value, unit } of operations) {
					date = type === 'add' ? date.add(value, unit) : date.add(-value, unit);
				}
				expect(date.format('YYYY-MM-DD HH:mm:ss')).toBe(expected);
			}
			// set global default
			kk_date.config({ timezone: timezone });
		});

		test('should handle timezone *conversions* with complex operations', () => {
			const testCases = [
				{
					input: '2024-01-01 23:59:59',
					timezone: 'America/New_York',
					operations: [
						{ type: 'add', value: 1, unit: 'seconds' },
						{ type: 'add', value: 1, unit: 'minutes' },
					],
					expected: '2024-01-01 17:01:00',
				},
				{
					input: '2024-12-31 23:59:59',
					timezone: 'Asia/Tokyo',
					operations: [
						{ type: 'add', value: 1, unit: 'seconds' },
						{ type: 'add', value: 1, unit: 'minutes' },
					],
					expected: '2025-01-01 06:01:00',
				},
			];

			for (const { input, timezone, operations, expected } of testCases) {
				let date = new kk_date(input).tz(timezone);
				for (const { type, value, unit } of operations) {
					date = type === 'add' ? date.add(value, unit) : date.add(-value, unit);
				}
				expect(date.format('YYYY-MM-DD HH:mm:ss')).toBe(expected);
			}
		});
	});
});
