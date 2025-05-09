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
	});
});

describe('kk_date set date', () => {
	test('set days', () => {
		expect(new kk_date(`${test_date} ${test_time}`).set('days', 20).set('years', '2025').isSame(`2025-08-20 ${test_time}`)).toBe(true);
	});

	test('set years', () => {
		expect(new kk_date(`${test_date} ${test_time}`).set('years', 2025).isSame(`2025-08-19 ${test_time}`)).toBe(true);
	});
});

describe('kk_date date checks', () => {
	test('is between', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isBetween('2024-08-19', '2024-08-19 23:51')).toBe(true);
	});
	test('is between with minutes unit', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isBetween('2024-08-19', '2024-08-19 23:51', 'minutes')).toBe(true);
	});
	test('is same', () => {
		expect(new kk_date(`${test_date} ${test_time}`).isSame(`${test_date} ${test_time}`)).toBe(true);
	});
});

describe('kk_date duration', () => {
	test('duration years', () => {
		const response = kk_date.duration(1, 'years');
		expect(response.years).toBe(1);
		expect(response.months).toBe(0);
		expect(response.weeks).toBe(0);
		expect(response.days).toBe(0);
		expect(response.hours).toBe(0);
		expect(response.minutes).toBe(0);
		expect(response.seconds).toBe(0);
	});

	test('duration months', () => {
		const response = kk_date.duration(65, 'days');
		expect(response.years).toBe(0);
		expect(response.months).toBe(2);
		expect(response.weeks).toBe(0);
		expect(response.days).toBe(3);
		expect(response.hours).toBe(0);
		expect(response.minutes).toBe(0);
		expect(response.seconds).toBe(0);
	});

	test('duration days', () => {
		const response = kk_date.duration(200, 'minutes');
		expect(response.years).toBe(0);
		expect(response.months).toBe(0);
		expect(response.weeks).toBe(0);
		expect(response.days).toBe(0);
		expect(response.hours).toBe(3);
		expect(response.minutes).toBe(20);
		expect(response.seconds).toBe(0);
	});

	test('duration minutes', () => {
		const response = kk_date.duration(50, 'minutes');
		expect(response.years).toBe(0);
		expect(response.months).toBe(0);
		expect(response.weeks).toBe(0);
		expect(response.days).toBe(0);
		expect(response.hours).toBe(0);
		expect(response.minutes).toBe(50);
		expect(response.seconds).toBe(0);
	});
});

describe('kk_date instance duration method', () => {
	test('duration with timestamp', () => {
		const date = new kk_date();
		const response = date.duration(65); // 65 seconds
		expect(response.years).toBe(0);
		expect(response.months).toBe(0);
		expect(response.weeks).toBe(0);
		expect(response.days).toBe(0);
		expect(response.hours).toBe(0);
		expect(response.minutes).toBe(1);
		expect(response.seconds).toBe(5);
	});

	test('duration with large timestamp', () => {
		const date = new kk_date();
		const response = date.duration(86400); // 1 day in seconds
		expect(response.years).toBe(0);
		expect(response.months).toBe(0);
		expect(response.weeks).toBe(0);
		expect(response.days).toBe(1);
		expect(response.hours).toBe(0);
		expect(response.minutes).toBe(0);
		expect(response.seconds).toBe(0);
	});

	test('duration with complex timestamp', () => {
		const date = new kk_date();
		const response = date.duration(90061); // 1 day, 1 hour, 1 minute, 1 second
		expect(response.years).toBe(0);
		expect(response.months).toBe(0);
		expect(response.weeks).toBe(0);
		expect(response.days).toBe(1);
		expect(response.hours).toBe(1);
		expect(response.minutes).toBe(1);
		expect(response.seconds).toBe(1);
	});
});
