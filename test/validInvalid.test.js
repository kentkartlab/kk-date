const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');
const test_date = '2024-08-19';
const test_time = '23:50:59';

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

	test('duration with invalid inputs', () => {
		const date = new kk_date();
		expect(() => date.duration(-1)).toThrow('Invalid time');
		expect(() => date.duration(0)).toThrow('Invalid time');
		expect(() => date.duration(null)).toThrow('Invalid time');
		expect(() => date.duration(undefined)).toThrow('Invalid time');
		expect(() => date.duration('not a number')).toThrow('Invalid time');
	});

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
});
