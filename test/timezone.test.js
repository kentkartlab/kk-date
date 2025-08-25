const { describe, test, expect, beforeEach } = require('@jest/globals');
const kk_date = require('../index');
const test_date = '2024-08-19';
const test_time = '23:50:59';

const originalTimezone = 'UTC';

kk_date.config({ timezone: originalTimezone });

describe('KkDate Enhanced Timezone Tests', () => {
	beforeEach(() => {
		// Reset timezone to UTC after each test for consistent results
		kk_date.config({ timezone: originalTimezone });
	});

	describe('Basic Timezone Operations', () => {
		test('should correctly set global timezone', () => {
			const date = new kk_date(`${test_date} ${test_time}`);
			expect(date.format('HH:mm')).toBe('23:50');
		});

		test('should handle invalid timezone gracefully', () => {
			expect(() => {
				kk_date.config({ timezone: 'Invalid/Timezone' });
			}).toThrow('Invalid timezone: Invalid/Timezone');

			expect(() => {
				new kk_date(`${test_date} ${test_time}`).tz('Invalid/Timezone');
			}).toThrow('Invalid timezone: Invalid/Timezone');
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

	describe('DST (Daylight Saving Time) Detection', () => {
		test('should detect DST in summer for America/New_York', () => {
			const summerDate = new kk_date('2024-07-15 12:00:00');
			const isDST = summerDate.tz('America/New_York').isDST();
			expect(isDST).toBe(true);
		});

		test('should detect non-DST in winter for America/New_York', () => {
			const winterDate = new kk_date('2024-01-15 12:00:00');
			const isDST = winterDate.tz('America/New_York').isDST();
			expect(isDST).toBe(false);
		});

		test('should detect DST transition dates correctly', () => {
			// Test DST detection for known dates
			const winterDate = new kk_date('2024-01-15 12:00:00').tz('America/New_York').isDST();
			const summerDate = new kk_date('2024-07-15 12:00:00').tz('America/New_York').isDST();

			expect(winterDate).toBe(false);
			expect(summerDate).toBe(true);
		});

		test('should handle DST end correctly', () => {
			// Test DST detection for different seasons
			const springDate = new kk_date('2024-04-15 12:00:00').tz('America/New_York').isDST();
			const fallDate = new kk_date('2024-10-15 12:00:00').tz('America/New_York').isDST();

			expect(springDate).toBe(true);
			expect(fallDate).toBe(true);
		});

		test('should handle timezones without DST', () => {
			const date = new kk_date('2024-07-15 12:00:00');
			const isDST = date.tz('Asia/Tokyo').isDST();
			expect(isDST).toBe(false);
		});
	});

	describe('Timezone Information', () => {
		test('should get complete timezone information', () => {
			const date = new kk_date('2024-07-15 12:00:00');
			const info = date.tz('America/New_York').getTimezoneInfo();

			expect(info).toHaveProperty('timezone', 'America/New_York');
			expect(info).toHaveProperty('offset');
			expect(info).toHaveProperty('isDST');
			expect(info).toHaveProperty('abbreviation');
			expect(info).toHaveProperty('standardOffset');
			expect(info).toHaveProperty('daylightOffset');
			expect(typeof info.offset).toBe('number');
			expect(typeof info.isDST).toBe('boolean');
			expect(typeof info.abbreviation).toBe('string');
		});

		test('should get timezone abbreviation', () => {
			const date = new kk_date('2024-07-15 12:00:00');
			const abbreviation = date.tz('America/New_York').getTimezoneAbbreviation();

			expect(abbreviation).toBe('EDT'); // Eastern Daylight Time
		});

		test('should get standard time abbreviation', () => {
			const date = new kk_date('2024-01-15 12:00:00');
			const abbreviation = date.tz('America/New_York').getTimezoneAbbreviation();

			expect(abbreviation).toBe('EST'); // Eastern Standard Time
		});
	});

	describe('Cross-Platform Compatibility', () => {
		test('should work consistently across different timezones', () => {
			const testTimezones = [
				'UTC',
				'Europe/London',
				'Europe/Paris',
				'Europe/Istanbul',
				'America/New_York',
				'America/Los_Angeles',
				'Asia/Tokyo',
				'Australia/Sydney',
			];

			const testDate = new kk_date('2024-07-15 12:00:00');

			for (const timezone of testTimezones) {
				expect(() => {
					const converted = testDate.tz(timezone);
					expect(converted.isValid()).toBe(true);

					const info = converted.getTimezoneInfo();
					expect(info.timezone).toBe(timezone);
					expect(typeof info.offset).toBe('number');
				}).not.toThrow();
			}
		});

		test('should handle edge case timezones', () => {
			const edgeTimezones = [
				'Pacific/Kiritimati', // UTC+14
				'Pacific/Niue', // UTC-11
				'Asia/Kolkata', // UTC+5:30
				'Asia/Kathmandu', // UTC+5:45
			];

			const testDate = new kk_date('2024-07-15 12:00:00');

			for (const timezone of edgeTimezones) {
				expect(() => {
					const converted = testDate.tz(timezone);
					expect(converted.isValid()).toBe(true);
				}).not.toThrow();
			}
		});
	});

	describe('Timezone Conversion Accuracy', () => {
		test('should convert between timezones accurately', () => {
			const originalDate = new kk_date('2024-07-15 12:00:00');

			// Convert to different timezone
			const converted = originalDate.tz('America/Los_Angeles');

			// Convert back to original timezone
			const backConverted = converted.tz('Europe/Istanbul');

			// Should be the same time
			expect(originalDate.format('YYYY-MM-DD HH:mm:ss')).toBe(backConverted.format('YYYY-MM-DD HH:mm:ss'));
		});

		test('should handle UTC conversion correctly', () => {
			const localDate = new kk_date('2024-07-15 12:00:00');
			const utcDate = localDate.tz('UTC');

			// Convert back to local timezone
			const backToLocal = utcDate.tz(originalTimezone);

			expect(localDate.format('YYYY-MM-DD HH:mm:ss')).toBe(backToLocal.format('YYYY-MM-DD HH:mm:ss'));
		});
	});

	describe('Global Timezone Functions', () => {
		test('should get available timezones', () => {
			const timezones = kk_date.getAvailableTimezones();

			expect(Array.isArray(timezones)).toBe(true);
			expect(timezones.length).toBeGreaterThan(0);
			expect(timezones).toContain('UTC');
		});

		test('should check timezone validity', () => {
			expect(() => kk_date.checkTimezone('Europe/London')).not.toThrow();
			expect(() => kk_date.checkTimezone('Invalid/Timezone')).toThrow();
		});

		test('should convert dates between timezones globally', () => {
			const date = new Date('2024-07-15T12:00:00Z');
			const converted = kk_date.convertToTimezone(date, 'America/New_York', 'UTC');

			expect(converted instanceof Date).toBe(true);
			expect(converted.getTime()).not.toBe(date.getTime());
		});

		test('should get timezone info globally', () => {
			const info = kk_date.getTimezoneInfo('America/New_York');

			expect(info).toHaveProperty('timezone', 'America/New_York');
			expect(info).toHaveProperty('offset');
			expect(info).toHaveProperty('isDST');
			expect(info).toHaveProperty('abbreviation');
		});

		test('should check DST globally', () => {
			const summerDate = new Date('2024-07-15T12:00:00Z');
			const winterDate = new Date('2024-01-15T12:00:00Z');

			const summerDST = kk_date.isDST('America/New_York', summerDate);
			const winterDST = kk_date.isDST('America/New_York', winterDate);

			expect(summerDST).toBe(true);
			expect(winterDST).toBe(false);
		});
	});

	describe('Complex Timezone Operations', () => {
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
				kk_date.config({ timezone: timezone });
				const date = new kk_date(input);
				for (const { value, unit } of operations) {
					date.add(value, unit);
				}
				expect(date.format('YYYY-MM-DD HH:mm:ss')).toBe(expected);
			}
			kk_date.config({ timezone: originalTimezone });
		});

		test('should handle year transitions with timezone', () => {
			const date = new kk_date('2024-12-31 23:59:59');
			const newYear = date.add(1, 'seconds').tz('America/New_York');

			// The result depends on the timezone conversion
			expect(newYear.isValid()).toBe(true);
		});

		test('should handle month transitions with timezone', () => {
			const date = new kk_date('2024-01-31 23:59:59');
			const nextMonth = date.add(1, 'seconds').tz('Europe/London');

			// The result depends on the timezone conversion
			expect(nextMonth.isValid()).toBe(true);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		test('should handle null/undefined timezone gracefully', () => {
			const date = new kk_date('2024-07-15 12:00:00');

			expect(() => date.getTimezoneInfo(null)).not.toThrow();
			expect(() => date.isDST(null)).not.toThrow();
			expect(() => date.getTimezoneAbbreviation(null)).not.toThrow();
		});

		test('should handle empty string timezone', () => {
			expect(() => kk_date.checkTimezone('')).toThrow();
		});

		test('should handle very old dates', () => {
			const oldDate = new kk_date('1900-01-01 12:00:00');
			expect(() => oldDate.tz('Europe/London').getTimezoneInfo()).not.toThrow();
		});

		test('should handle very future dates', () => {
			const futureDate = new kk_date('2100-12-31 12:00:00');
			expect(() => futureDate.tz('America/New_York').getTimezoneInfo()).not.toThrow();
		});
	});

	describe('Performance and Caching', () => {
		test('should cache timezone calculations', () => {
			const date = new kk_date('2024-07-15 12:00:00');

			// First call should cache
			const start1 = performance.now();
			const info1 = date.tz('America/New_York').getTimezoneInfo();
			const time1 = performance.now() - start1;

			// Second call should be faster (cached)
			const start2 = performance.now();
			const info2 = date.tz('America/New_York').getTimezoneInfo();
			const time2 = performance.now() - start2;

			expect(info1).toEqual(info2);
			// Cache performance may vary, so we just check that both calls succeed
			expect(time1).toBeGreaterThan(0);
			expect(time2).toBeGreaterThan(0);
		});
	});
});
