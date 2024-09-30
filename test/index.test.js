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

	test('DD-MM-YYYY', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('DD-MM-YYYY')).toBe('19-08-2024');
	});

	test('DD-MM-YYYY HH:mm', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('DD-MM-YYYY HH:mm')).toBe('19-08-2024 23:50');
	});

	test('custom format', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format_c(' ', 'YYYY', 'MM', 'DD', 'HH:mm:ss')).toBe('2024 08 19 23:50:59');
		expect(new kk_date(`${test_date} ${test_time}`).format_c(' ', 'YYYY', 'MM', 'dddd', 'HH:mm:ss')).toBe('2024 08 monday 23:50:59');
	});

	test('dddd', () => {
		expect(new kk_date(`${test_date} ${test_time}`).format('dddd')).toBe('monday');
		expect(new kk_date(timestamp).format('dddd')).toBe('monday');
	});

	test('x/X', () => {
		expect(new kk_date(timestamp).format('X')).toBe(timestamp);
		expect(new kk_date(timestamp).format('x')).toBe(timestamp * 1000);
	});

	test('T between the time', () => {
		expect(new kk_date(timestamp).format('YYYY-MM-DDTHH:mm:ss')).toBe('2024-08-19T23:50:59');
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
	});

	test('is valid', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isValid()).toBe(true);
	});
});
