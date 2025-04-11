const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');

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
