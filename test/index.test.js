const kk_date = require('../index');
const test_date = '2024-08-19';
const test_time = '23:50:59';
const timestamp = 1724100659;

describe('kk_date format', () => {
	test('HH:mm:ss', () => {
		expect(new kk_date(`${test_time}`).format('HH:mm:ss')).toBe(`${test_time}`);
		expect(new kk_date(`${test_time}`).add(1, 'minutes').format('HH:mm:ss')).toBe('23:51:59');
		expect(new kk_date(`${test_date} ${test_time}`).format('HH:mm:ss')).toBe(`${test_time}`);
		expect(new kk_date('24:00:00').format('HH:mm:ss')).toBe('00:00:00');
		expect(new kk_date('25:00:00').format('HH:mm:ss')).toBe('01:00:00');
		expect(new kk_date('26:00:00').format('HH:mm:ss')).toBe('02:00:00');
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
		expect(new kk_date(`${test_date} ${test_time}`).config('fr-fr').format('dddd').toLocaleLowerCase()).toBe('lundi');
		expect(new kk_date(timestamp).config('tr-tr').format('dddd').toLocaleLowerCase()).toBe('pazartesi');
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
		expect(new kk_date('2024-08-19').config('tr-tr').format('DD MMMM YYYY dddd')).toBe('19 Ağustos 2024 Pazartesi');
	});

	test('DD MMMM YYYY', () => {
		expect(new kk_date('2024-08-19').format('DD MMMM YYYY')).toBe('19 August 2024');
		expect(new kk_date('2024-08-19').config('tr-tr').format('DD MMMM YYYY')).toBe('19 Ağustos 2024');
	});

	test('MMMM YYYY', () => {
		expect(new kk_date('2024-08-19').format('MMMM YYYY')).toBe('August 2024');
		expect(new kk_date('2024-08-19').config('tr-tr').format('MMMM YYYY')).toBe('Ağustos 2024');
		expect(new kk_date('2024-01-01').format('MMMM YYYY')).toBe('January 2024');
	});

	test('DD MMMM dddd YYYY', () => {
		expect(new kk_date('2024-08-19').format('DD MMMM dddd YYYY')).toBe('19 August Monday 2024');
		expect(new kk_date('2024-08-19').config('tr-tr').format('DD MMMM dddd YYYY')).toBe('19 Ağustos Pazartesi 2024');
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
	expect(new kk_date('2024-08-19').config('de-de').format('dddd')).toBe('Montag'); // German
	expect(new kk_date('2024-08-19').config('es-es').format('dddd')).toBe('lunes'); // Spanish
	expect(new kk_date('2024-08-19').config('tr-tr').format('dddd')).toBe('Pazartesi'); // Turkish
});

test('caching tests', () => {
	// cache enable test;
	kk_date.caching({ status: true, isMemoryStatsEnabled: true });
	const status1 = kk_date.caching_status();
	expect(status1.status).toBe(true);
	// enable later some tests;
	expect(new kk_date('2024-08-19').config('de-de').format('dddd')).toBe('Montag'); // German
	expect(new kk_date('2024-08-19').config('es-es').format('dddd')).toBe('lunes'); // Spanish
	expect(new kk_date('2024-08-19').config('tr-tr').format('dddd')).toBe('Pazartesi'); // Turkish
	// cache disable test;
	kk_date.caching({ status: false });
	const status2 = kk_date.caching_status();
	expect(status2.status).toBe(false);
	// disable later some tests
	expect(new kk_date('2024-08-19').config('de-de').format('dddd')).toBe('Montag'); // German
	expect(new kk_date('2024-08-19').config('es-es').format('dddd')).toBe('lunes'); // Spanish
	expect(new kk_date('2024-08-19').config('tr-tr').format('dddd')).toBe('Pazartesi'); // Turkish
});

test('MMM - Short month name', () => {
	expect(new kk_date('2024-01-01').format('MMM')).toBe('Jan');
	expect(new kk_date('2024-08-19').format('MMM')).toBe('Aug');
	expect(new kk_date('2024-12-31').format('MMM')).toBe('Dec');
	expect(new kk_date('2024-08-19').config('tr-tr').format('MMM')).toBe('Ağu');
});

test('MMMM - Full month name', () => {
	expect(new kk_date('2024-01-01').format('MMMM')).toBe('January');
	expect(new kk_date('2024-08-19').format('MMMM')).toBe('August');
	expect(new kk_date('2024-12-31').format('MMMM')).toBe('December');
	expect(new kk_date('2024-08-19').config('tr-tr').format('MMMM')).toBe('Ağustos');
});

test('ddd - Short weekday name', () => {
	expect(new kk_date('2024-08-19').format('ddd')).toBe('Mon');
	expect(new kk_date('2024-08-20').format('ddd')).toBe('Tue');
	expect(new kk_date('2024-08-19').config('tr-tr').format('ddd')).toBe('Pzt');
});

test('DD MMM YYYY - Date with short month', () => {
	expect(new kk_date('2024-08-19').format('DD MMM YYYY')).toBe('19 Aug 2024');
	expect(new kk_date('2024-01-01').format('DD MMM YYYY')).toBe('01 Jan 2024');
	expect(new kk_date('2024-12-31').format('DD MMM YYYY')).toBe('31 Dec 2024');
	expect(new kk_date('2024-08-19').config('tr-tr').format('DD MMM YYYY')).toBe('19 Ağu 2024');
});

test('DD MMM - Date with short month, no year', () => {
	expect(new kk_date('2024-08-19').format('DD MMM')).toBe('19 Aug');
	expect(new kk_date('2024-01-01').format('DD MMM')).toBe('01 Jan');
	expect(new kk_date('2024-12-31').format('DD MMM')).toBe('31 Dec');
	expect(new kk_date('2024-08-19').config('tr-tr').format('DD MMM')).toBe('19 Ağu');
});

test('MMM YYYY - Short month with year', () => {
	expect(new kk_date('2024-08-19').format('MMM YYYY')).toBe('Aug 2024');
	expect(new kk_date('2024-01-01').format('MMM YYYY')).toBe('Jan 2024');
	expect(new kk_date('2024-12-31').format('MMM YYYY')).toBe('Dec 2024');
	expect(new kk_date('2024-08-19').config('tr-tr').format('MMM YYYY')).toBe('Ağu 2024');
});

test('DD MMM YYYY HH:mm - Date with short month and time', () => {
	expect(new kk_date('2024-08-19 14:30:00').format('DD MMM YYYY HH:mm')).toBe('19 Aug 2024 14:30');
	expect(new kk_date('2024-01-01 00:00:00').format('DD MMM YYYY HH:mm')).toBe('01 Jan 2024 00:00');
	expect(new kk_date('2024-12-31 23:59:59').format('DD MMM YYYY HH:mm')).toBe('31 Dec 2024 23:59');
	expect(new kk_date('2024-08-19 14:30:00').config('tr-tr').format('DD MMM YYYY HH:mm')).toBe('19 Ağu 2024 14:30');
});
