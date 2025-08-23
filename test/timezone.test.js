const { describe, test, expect, beforeEach } = require('@jest/globals');
const kk_date = require('../index');
const test_date = '2024-08-19';
const test_time = '23:50:59';

const originalTimezone = 'Europe/Istanbul';

kk_date.config({ timezone: originalTimezone });

describe('KkDate Timezone Tests', () => {
	beforeEach(() => {
		// Reset timezone to original after each test
		kk_date.config({ timezone: originalTimezone });
	});

	describe('Global Timezone Configuration', () => {
		test('should correctly set global timezone', () => {
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

	describe('Timezone and Locale Interaction', () => {
		test('should handle timezone and locale together', () => {
			const date = new kk_date(`${test_date} ${test_time}`);
			date.config({ locale: 'tr-TR', timezone: 'Europe/Istanbul' });
			expect(date.format('dddd')).toMatch(/Pazartesi/);
		});
	});
});

describe('Timezone combined tests', () => {
	beforeEach(() => {
		kk_date.config({ timezone: originalTimezone });
	});
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
			const date = new kk_date(input);
			for (const { value, unit } of operations) {
				date.add(value, unit);
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
			const date = new kk_date(input);
			for (const { value, unit } of operations) {
				date.add(value, unit);
			}
			expect(date.format('YYYY-MM-DD HH:mm:ss')).toBe(expected);
		}
		// set global default
		kk_date.config({ timezone: originalTimezone });
	});
});
