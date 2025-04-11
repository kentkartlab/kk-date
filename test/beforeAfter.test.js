const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');
const test_date = '2024-08-19';
const test_time = '23:50:59';

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
