const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');
const test_date = '2024-08-19';
const test_time = '23:50:59';

const timezone = 'Europe/Istanbul';

kk_date.config({ timezone: timezone });

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
});
