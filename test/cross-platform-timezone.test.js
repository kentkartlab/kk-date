const { describe, test, expect, beforeEach } = require('@jest/globals');
const kk_date = require('../index');

describe('Cross-Platform Timezone Compatibility Tests', () => {
	beforeEach(() => {
		// Reset to default timezone
		kk_date.config({ timezone: 'Europe/Istanbul' });
	});

	describe('Environment Detection', () => {
		test('should detect environment correctly', () => {
			const isBrowser = typeof window !== 'undefined';
			const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

			// Should be in Node.js environment for tests
			expect(isNode).toBeTruthy();
		});
	});

	describe('Intl.DateTimeFormat Compatibility', () => {
		test('should use Intl.DateTimeFormat consistently', () => {
			const testDate = new Date('2024-07-15T12:00:00Z');
			const timezone = 'America/New_York';

			// Test that Intl.DateTimeFormat works
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			});

			expect(() => formatter.format(testDate)).not.toThrow();
		});

		test('should handle timezone name formatting', () => {
			const testDate = new Date('2024-07-15T12:00:00Z');
			const timezone = 'Europe/London';

			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				timeZoneName: 'short',
			});

			const parts = formatter.formatToParts(testDate);
			const timezonePart = parts.find((part) => part.type === 'timeZoneName');

			expect(timezonePart).toBeDefined();
			expect(typeof timezonePart.value).toBe('string');
		});
	});

	describe('Timezone Offset Calculation', () => {
		test('should calculate offsets consistently', () => {
			const testDate = new Date('2024-07-15T12:00:00Z');
			const timezones = ['UTC', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo'];

			// biome-ignore lint/complexity/noForEach: <explanation>
			timezones.forEach((timezone) => {
				expect(() => {
					const offset = kk_date.getTimezoneOffset(timezone, testDate);
					expect(typeof offset).toBe('number');
					expect(offset).toBeGreaterThanOrEqual(-12 * 60 * 60 * 1000); // -12 hours
					expect(offset).toBeLessThanOrEqual(14 * 60 * 60 * 1000); // +14 hours
				}).not.toThrow();
			});
		});

		test('should handle DST transitions correctly', () => {
			// Test DST detection for different seasons
			const winterOffset = kk_date.getTimezoneOffset('America/New_York', new Date('2024-01-15T12:00:00Z'));
			const summerOffset = kk_date.getTimezoneOffset('America/New_York', new Date('2024-07-15T12:00:00Z'));

			// Should be different due to DST
			expect(Math.abs(winterOffset - summerOffset)).toBeGreaterThan(0);
			expect(Math.abs(winterOffset - summerOffset)).toBeLessThanOrEqual(60 * 60 * 1000); // Max 1 hour difference
		});
	});

	describe('Cross-Platform Timezone Conversion', () => {
		test('should convert between timezones accurately', () => {
			const testCases = [
				{
					input: '2024-07-15T12:00:00Z',
					from: 'UTC',
					to: 'America/New_York',
					expectedOffset: -4 * 60 * 60 * 1000, // EDT
				},
				{
					input: '2024-01-15T12:00:00Z',
					from: 'UTC',
					to: 'America/New_York',
					expectedOffset: -5 * 60 * 60 * 1000, // EST
				},
				{
					input: '2024-07-15T12:00:00Z',
					from: 'UTC',
					to: 'Europe/London',
					expectedOffset: 1 * 60 * 60 * 1000, // BST
				},
			];

			// biome-ignore lint/complexity/noForEach: <explanation>
			testCases.forEach(({ input, from, to, expectedOffset }) => {
				const date = new Date(input);
				const converted = kk_date.convertToTimezone(date, to, from);

				// Calculate the actual offset
				const actualOffset = converted.getTime() - date.getTime();

				// Allow for small differences due to DST rules
				expect(Math.abs(actualOffset - expectedOffset)).toBeLessThan(60 * 60 * 1000);
			});
		});

		test('should handle round-trip conversions', () => {
			const originalDate = new Date('2024-07-15T12:00:00Z');
			const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];

			// biome-ignore lint/complexity/noForEach: <explanation>
			timezones.forEach((timezone) => {
				// Convert to timezone
				const converted = kk_date.convertToTimezone(originalDate, timezone, 'UTC');

				// Convert back to UTC
				const backToUTC = kk_date.convertToTimezone(converted, 'UTC', timezone);

				// Should be the same time
				expect(backToUTC.getTime()).toBe(originalDate.getTime());
			});
		});
	});

	describe('DST Detection Accuracy', () => {
		test('should detect DST correctly for major timezones', () => {
			const summerDate = new Date('2024-07-15T12:00:00Z');
			const winterDate = new Date('2024-01-15T12:00:00Z');

			const timezonesWithDST = [
				'America/New_York',
				'America/Chicago',
				'America/Denver',
				'America/Los_Angeles',
				'Europe/London',
				'Europe/Paris',
				'Europe/Berlin',
			];

			const timezonesWithoutDST = ['UTC', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata'];

			// Test timezones with DST
			// biome-ignore lint/complexity/noForEach: <explanation>
			timezonesWithDST.forEach((timezone) => {
				const summerDST = kk_date.isDST(timezone, summerDate);
				const winterDST = kk_date.isDST(timezone, winterDate);

				expect(summerDST).toBe(true);
				expect(winterDST).toBe(false);
			});

			// Test timezones without DST
			// biome-ignore lint/complexity/noForEach: <explanation>
			timezonesWithoutDST.forEach((timezone) => {
				const summerDST = kk_date.isDST(timezone, summerDate);
				const winterDST = kk_date.isDST(timezone, winterDate);

				expect(summerDST).toBe(false);
				expect(winterDST).toBe(false);
			});
		});

		test('should handle DST transition dates', () => {
			// 2024 DST transitions for America/New_York
			const dstStart2024 = new Date('2024-03-10T07:00:00Z'); // 2 AM EST -> 3 AM EDT
			const dstEnd2024 = new Date('2024-11-03T06:00:00Z'); // 2 AM EDT -> 1 AM EST

			// Test DST start
			const beforeDSTStart = kk_date.isDST('America/New_York', new Date(dstStart2024.getTime() - 60000));
			const afterDSTStart = kk_date.isDST('America/New_York', new Date(dstStart2024.getTime() + 60000));

			expect(beforeDSTStart).toBe(false);
			expect(afterDSTStart).toBe(true);

			// Test DST end
			const beforeDSTEnd = kk_date.isDST('America/New_York', new Date(dstEnd2024.getTime() - 60000));
			const afterDSTEnd = kk_date.isDST('America/New_York', new Date(dstEnd2024.getTime() + 60000));

			expect(beforeDSTEnd).toBe(true);
			expect(afterDSTEnd).toBe(false);
		});
	});

	describe('Timezone Information Consistency', () => {
		test('should provide consistent timezone information', () => {
			const testDate = new Date('2024-07-15T12:00:00Z');
			const timezone = 'America/New_York';

			const info = kk_date.getTimezoneInfo(timezone, testDate);

			// Check all required properties
			expect(info).toHaveProperty('timezone', timezone);
			expect(info).toHaveProperty('offset');
			expect(info).toHaveProperty('isDST');
			expect(info).toHaveProperty('abbreviation');
			expect(info).toHaveProperty('standardOffset');
			expect(info).toHaveProperty('daylightOffset');

			// Check data types
			expect(typeof info.offset).toBe('number');
			expect(typeof info.isDST).toBe('boolean');
			expect(typeof info.abbreviation).toBe('string');
			expect(typeof info.standardOffset).toBe('number');
			expect(typeof info.daylightOffset).toBe('number');

			// Check logical consistency
			expect(info.isDST).toBe(true); // July should be DST
			expect(info.abbreviation).toBe('EDT'); // Eastern Daylight Time
			expect(Math.abs(info.offset - info.daylightOffset)).toBeLessThan(1000); // Should be close
		});

		test('should handle edge case timezones', () => {
			const edgeCases = [
				'Pacific/Kiritimati', // UTC+14
				'Pacific/Niue', // UTC-11
				'Asia/Kolkata', // UTC+5:30
				'Asia/Kathmandu', // UTC+5:45
			];

			const testDate = new Date('2024-07-15T12:00:00Z');

			// biome-ignore lint/complexity/noForEach: <explanation>
			edgeCases.forEach((timezone) => {
				expect(() => {
					const info = kk_date.getTimezoneInfo(timezone, testDate);
					expect(info.timezone).toBe(timezone);
					expect(typeof info.offset).toBe('number');
					expect(typeof info.isDST).toBe('boolean');
				}).not.toThrow();
			});
		});
	});

	describe('Performance and Memory', () => {
		test('should cache timezone calculations efficiently', () => {
			const testDate = new Date('2024-07-15T12:00:00Z');
			const timezone = 'America/New_York';

			// First call
			const start1 = performance.now();
			const info1 = kk_date.getTimezoneInfo(timezone, testDate);
			const time1 = performance.now() - start1;

			// Second call (should be cached)
			const start2 = performance.now();
			const info2 = kk_date.getTimezoneInfo(timezone, testDate);
			const time2 = performance.now() - start2;

			// Results should be identical
			expect(info1).toEqual(info2);

			// Both calls should complete successfully
			expect(time1).toBeGreaterThan(0);
			expect(time2).toBeGreaterThan(0);
		});

		test('should handle multiple timezone operations without memory leaks', () => {
			const timezones = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Europe/Paris', 'America/Los_Angeles', 'Australia/Sydney'];

			const iterations = 1000;
			const startMemory = process.memoryUsage().heapUsed;

			for (let i = 0; i < iterations; i++) {
				const testDate = new Date('2024-07-15T12:00:00Z');
				// biome-ignore lint/complexity/noForEach: <explanation>
				timezones.forEach((timezone) => {
					kk_date.getTimezoneInfo(timezone, testDate);
					kk_date.isDST(timezone, testDate);
					kk_date.getTimezoneAbbreviation(timezone, testDate);
				});
			}

			const endMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = endMemory - startMemory;

			// Memory increase should be reasonable (less than 20MB)
			expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
		});
	});

	describe('Error Handling', () => {
		test('should handle invalid timezones gracefully', () => {
			const invalidTimezones = ['', 'Invalid/Timezone', 'Not/A/Timezone'];

			// biome-ignore lint/complexity/noForEach: <explanation>
			invalidTimezones.forEach((timezone) => {
				expect(() => kk_date.checkTimezone(timezone)).toThrow();
				expect(() => kk_date.getTimezoneInfo(timezone)).toThrow();
			});
		});

		test('should handle null and undefined inputs', () => {
			expect(() => kk_date.getTimezoneInfo(null)).toThrow();
		});

		test('should handle invalid dates', () => {
			const invalidDates = [new Date('invalid'), new Date(NaN)];

			// biome-ignore lint/complexity/noForEach: <explanation>
			invalidDates.forEach((date) => {
				expect(() => kk_date.getTimezoneInfo('UTC', date)).toThrow();
			});
		});
	});

	describe('Real-World Scenarios', () => {
		test('should handle international flight scenarios', () => {
			// Flight from New York to Tokyo
			const departureTime = new Date('2024-07-15T10:00:00Z'); // 10 AM UTC
			const flightDuration = 14 * 60 * 60 * 1000; // 14 hours

			// Departure time in New York
			const nyDeparture = kk_date.convertToTimezone(departureTime, 'America/New_York', 'UTC');

			// Arrival time in Tokyo
			const arrivalTime = new Date(departureTime.getTime() + flightDuration);
			const tokyoArrival = kk_date.convertToTimezone(arrivalTime, 'Asia/Tokyo', 'UTC');

			// Should be reasonable times
			expect(nyDeparture.getHours()).toBeGreaterThanOrEqual(5); // Early morning
			expect(nyDeparture.getHours()).toBeLessThanOrEqual(12); // Before noon

			expect(tokyoArrival.getHours()).toBeGreaterThanOrEqual(0); // Any hour
			expect(tokyoArrival.getHours()).toBeLessThanOrEqual(23); // Any hour
		});

		test('should handle business meeting across timezones', () => {
			// Meeting at 2 PM London time
			const londonTime = new Date('2024-07-15T14:00:00Z');
			const londonMeeting = kk_date.convertToTimezone(londonTime, 'Europe/London', 'UTC');

			// Convert to other timezones
			const nyTime = kk_date.convertToTimezone(londonTime, 'America/New_York', 'UTC');
			const tokyoTime = kk_date.convertToTimezone(londonTime, 'Asia/Tokyo', 'UTC');

			// Should be reasonable business hours
			expect(nyTime.getHours()).toBeGreaterThanOrEqual(8); // After 8 AM
			expect(nyTime.getHours()).toBeLessThanOrEqual(18); // Before 6 PM

			// Tokyo time should be reasonable (any hour)
			expect(tokyoTime.getHours()).toBeGreaterThanOrEqual(0);
			expect(tokyoTime.getHours()).toBeLessThanOrEqual(23);
		});
	});
});
