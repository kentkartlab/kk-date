const kk_date = require('../index');
const { describe, test, expect } = require('@jest/globals');

describe('Functions.js Coverage Tests', () => {
	describe('isValidDayName via parsing', () => {
		test('should parse date with day name format', () => {
			// Parsing formats like "DD MMMM dddd" use isValidDayName internally
			const date = new kk_date('15 January Monday');
			expect(date.isValid()).toBe(true);
		});

		test('should format day names correctly', () => {
			const date = new kk_date('2024-01-15'); // Monday
			expect(date.format('dddd')).toBe('Monday');
			expect(date.format('ddd')).toBe('Mon');
		});
	});

	describe('getTimezoneOffset edge cases', () => {
		test('should throw error for invalid timezone', () => {
			expect(() => kk_date.getTimezoneOffset('Invalid/Timezone')).toThrow();
		});

		test('should handle timezone offset with specific date', () => {
			const date = new Date('2024-07-15T12:00:00Z');
			const offset = kk_date.getTimezoneOffset('America/New_York', date);
			expect(typeof offset).toBe('number');
			// EDT is UTC-4 in summer = -4 * 60 * 60 * 1000 = -14400000
			expect(offset).toBe(-14400000);
		});

		test('should handle UTC timezone', () => {
			const offset = kk_date.getTimezoneOffset('UTC');
			expect(offset).toBe(0);
		});
	});

	describe('convertToTimezone error handling', () => {
		test('should throw error for invalid target timezone', () => {
			const date = new Date();
			expect(() => kk_date.convertToTimezone(date, 'Invalid/Timezone')).toThrow();
		});

		test('should convert between valid timezones', () => {
			const date = new Date('2024-01-15T12:00:00Z');
			const converted = kk_date.convertToTimezone(date, 'America/New_York', 'UTC');
			expect(converted instanceof Date).toBe(true);
		});
	});

	describe('getAvailableTimezones', () => {
		test('should return array of timezones', () => {
			const timezones = kk_date.getAvailableTimezones();
			expect(Array.isArray(timezones)).toBe(true);
			expect(timezones.length).toBeGreaterThan(0);
			expect(timezones).toContain('UTC');
		});

		test('should filter invalid timezones', () => {
			const timezones = kk_date.getAvailableTimezones();
			// All returned timezones should be valid
			timezones.slice(0, 10).forEach((tz) => {
				expect(() => kk_date.checkTimezone(tz)).not.toThrow();
			});
		});
	});

	describe('isDST edge cases', () => {
		test('should return false for invalid timezone', () => {
			// isDST catches errors and returns false
			const result = kk_date.isDST('Invalid/Timezone');
			expect(result).toBe(false);
		});

		test('should detect DST correctly for summer date', () => {
			const summerDate = new Date('2024-07-15T12:00:00Z');
			expect(kk_date.isDST('America/New_York', summerDate)).toBe(true);
			expect(kk_date.isDST('Europe/London', summerDate)).toBe(true);
		});

		test('should detect non-DST for winter date', () => {
			const winterDate = new Date('2024-01-15T12:00:00Z');
			expect(kk_date.isDST('America/New_York', winterDate)).toBe(false);
			expect(kk_date.isDST('Europe/London', winterDate)).toBe(false);
		});

		test('should return false for timezones without DST', () => {
			const date = new Date('2024-07-15T12:00:00Z');
			expect(kk_date.isDST('Asia/Tokyo', date)).toBe(false);
			expect(kk_date.isDST('UTC', date)).toBe(false);
		});
	});

	describe('getTimezoneAbbreviation edge cases', () => {
		test('should return timezone string for invalid timezone', () => {
			// getTimezoneAbbreviation catches errors and returns the timezone string
			const result = kk_date.getTimezoneAbbreviation('Invalid/Timezone');
			expect(result).toBe('Invalid/Timezone');
		});

		test('should return correct abbreviation for valid timezone', () => {
			const summerDate = new Date('2024-07-15T12:00:00Z');
			const abbr = kk_date.getTimezoneAbbreviation('America/New_York', summerDate);
			expect(['EDT', 'Eastern Daylight Time']).toContain(abbr);
		});
	});

	describe('duration asX methods', () => {
		test('should calculate asMilliseconds correctly', () => {
			const dur = kk_date.duration(1, 'hours');
			expect(dur.asMilliseconds()).toBe(3600000);
		});

		test('should calculate asSeconds correctly', () => {
			const dur = kk_date.duration(1, 'hours');
			expect(dur.asSeconds()).toBe(3600);
		});

		test('should calculate asMinutes correctly', () => {
			const dur = kk_date.duration(1, 'hours');
			expect(dur.asMinutes()).toBe(60);
		});

		test('should calculate asHours correctly', () => {
			const dur = kk_date.duration(2, 'hours');
			expect(dur.asHours()).toBe(2);
		});

		test('should calculate asDays correctly', () => {
			const dur = kk_date.duration(48, 'hours');
			expect(dur.asDays()).toBe(2);
		});

		test('should calculate asWeeks correctly', () => {
			const dur = kk_date.duration(14, 'days');
			expect(dur.asWeeks()).toBe(2);
		});

		test('should calculate asMonths correctly', () => {
			const dur = kk_date.duration(62, 'days');
			expect(dur.asMonths()).toBe(2);
		});

		test('should calculate asYears correctly', () => {
			const dur = kk_date.duration(730, 'days');
			expect(dur.asYears()).toBe(2);
		});
	});

	describe('dateTimeFormat with locale and timezone', () => {
		test('should format with custom locale', () => {
			const date = new kk_date('2024-01-15');
			date.config({ locale: 'tr' });
			const formatted = date.format('MMMM');
			expect(formatted).toBe('Ocak');
		});

		test('should format with custom locale for day name', () => {
			const date = new kk_date('2024-01-15'); // Monday
			date.config({ locale: 'tr' });
			const formatted = date.format('dddd');
			expect(formatted).toBe('Pazartesi');
		});

		test('should format with custom locale for short month', () => {
			const date = new kk_date('2024-01-15');
			date.config({ locale: 'de' });
			const formatted = date.format('MMM');
			expect(formatted).toBe('Jan');
		});

		test('should format with custom locale for short day', () => {
			const date = new kk_date('2024-01-15'); // Monday
			date.config({ locale: 'de' });
			const formatted = date.format('ddd');
			expect(['Mo', 'Mon']).toContain(formatted);
		});

		test('should format with timezone and locale combined', () => {
			const date = new kk_date('2024-01-15T12:00:00Z');
			date.config({ locale: 'tr', timezone: 'Europe/Istanbul' });
			const formatted = date.format('dddd');
			expect(formatted).toBe('Pazartesi');
		});

		test('should format MMMM with timezone', () => {
			const date = new kk_date('2024-01-15T12:00:00Z');
			date.config({ timezone: 'America/New_York' });
			const formatted = date.format('MMMM');
			expect(formatted).toBe('January');
		});

		test('should format MMM with timezone', () => {
			const date = new kk_date('2024-01-15T12:00:00Z');
			date.config({ timezone: 'America/New_York' });
			const formatted = date.format('MMM');
			expect(formatted).toBe('Jan');
		});

		test('should format ddd with timezone', () => {
			const date = new kk_date('2024-01-15T12:00:00Z'); // Monday
			date.config({ timezone: 'America/New_York' });
			const formatted = date.format('ddd');
			expect(formatted).toBe('Mon');
		});

		test('should use tempLocale when set', () => {
			const date = new kk_date('2024-01-15');
			date.config({ locale: 'fr' });
			const formatted = date.format('dddd');
			expect(formatted).toBe('lundi');
		});

		test('should use tempLocale for MMMM', () => {
			const date = new kk_date('2024-01-15');
			date.config({ locale: 'fr' });
			const formatted = date.format('MMMM');
			expect(formatted).toBe('janvier');
		});

		test('should use tempLocale for MMM', () => {
			const date = new kk_date('2024-01-15');
			date.config({ locale: 'fr' });
			const formatted = date.format('MMM');
			expect(formatted).toBe('janv.');
		});

		test('should use tempLocale for ddd', () => {
			const date = new kk_date('2024-01-15'); // Monday
			date.config({ locale: 'fr' });
			const formatted = date.format('ddd');
			expect(formatted).toBe('lun.');
		});
	});

	describe('converter cache limit', () => {
		test('should handle many conversions without memory issues', () => {
			// This tests the cache size limit logic (line 535-541)
			for (let i = 0; i < 100; i++) {
				const date = new kk_date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}`);
				date.config({ timezone: 'America/New_York' });
				date.format('YYYY-MM-DD HH:mm:ss');
			}
			// If we get here without error, cache management is working
			expect(true).toBe(true);
		});
	});

	describe('converter with different field types', () => {
		test('should convert year field', () => {
			const date = new kk_date('2024-06-15T14:30:45.123');
			expect(date.format('YYYY')).toBe('2024');
		});

		test('should convert month field', () => {
			const date = new kk_date('2024-06-15T14:30:45.123');
			expect(date.format('MM')).toBe('06');
		});

		test('should convert day field', () => {
			const date = new kk_date('2024-06-15T14:30:45.123');
			expect(date.format('DD')).toBe('15');
		});

		test('should convert hours field', () => {
			const date = new kk_date('2024-06-15T14:30:45.123');
			expect(date.format('HH')).toBe('14');
		});

		test('should convert minutes field', () => {
			const date = new kk_date('2024-06-15T14:30:45.123');
			expect(date.format('mm')).toBe('30');
		});

		test('should convert seconds field', () => {
			const date = new kk_date('2024-06-15T14:30:45.123');
			expect(date.format('ss')).toBe('45');
		});

		test('should convert milliseconds field with padding', () => {
			const date = new kk_date('2024-06-15T14:30:45.005');
			const formatted = date.format('HH:mm:ss.SSS');
			expect(formatted).toMatch(/14:30:45\.\d{3}/);
		});
	});

	describe('converter with timezone-aware formatting', () => {
		test('should format correctly with explicit timezone', () => {
			const date = new kk_date('2024-06-15T12:00:00Z');
			date.config({ timezone: 'Asia/Tokyo' });
			// Tokyo is UTC+9
			expect(date.format('HH')).toBe('21');
		});

		test('should format correctly with different timezone', () => {
			const date = new kk_date('2024-06-15T12:00:00Z');
			date.config({ timezone: 'America/Los_Angeles' });
			// LA is UTC-7 in summer (PDT)
			expect(date.format('HH')).toBe('05');
		});

		test('should format all fields with timezone', () => {
			const date = new kk_date('2024-06-15T12:30:45.123Z');
			date.config({ timezone: 'Europe/London' });
			// London is UTC+1 in summer (BST)
			expect(date.format('YYYY')).toBe('2024');
			expect(date.format('MM')).toBe('06');
			expect(date.format('DD')).toBe('15');
			expect(date.format('HH')).toBe('13');
			expect(date.format('mm')).toBe('30');
			expect(date.format('ss')).toBe('45');
		});

		test('should format milliseconds with timezone', () => {
			const date = new kk_date('2024-06-15T12:30:45.007Z');
			date.config({ timezone: 'UTC' });
			const formatted = date.format('HH:mm:ss.SSS');
			expect(formatted).toBe('12:30:45.007');
		});

		test('should format milliseconds with padding (< 10)', () => {
			const date = new kk_date('2024-06-15T12:30:45.005Z');
			date.config({ timezone: 'Europe/Istanbul' });
			const formatted = date.format('HH:mm:ss.SSS');
			expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
		});

		test('should format milliseconds with padding (< 100)', () => {
			const date = new kk_date('2024-06-15T12:30:45.050Z');
			date.config({ timezone: 'Europe/Istanbul' });
			const formatted = date.format('HH:mm:ss.SSS');
			expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
		});

		test('should use global timezone when no instance timezone', () => {
			const originalTz = kk_date.getTimezone();
			kk_date.setTimezone('Asia/Tokyo');

			const date = new kk_date('2024-06-15T12:00:00Z');
			// Should use global timezone
			expect(date.format('HH')).toBe('21');

			kk_date.setTimezone(originalTz);
		});

		test('should handle date crossing day boundary with timezone', () => {
			const date = new kk_date('2024-06-15T23:00:00Z');
			date.config({ timezone: 'Asia/Tokyo' });
			// 23:00 UTC + 9 hours = 08:00 next day
			expect(date.format('DD')).toBe('16');
			expect(date.format('HH')).toBe('08');
		});
	});

	describe('getTimezoneInfo edge cases', () => {
		test('should throw for null timezone', () => {
			expect(() => kk_date.getTimezoneInfo(null)).toThrow();
		});

		test('should throw for empty string timezone', () => {
			expect(() => kk_date.getTimezoneInfo('')).toThrow();
		});

		test('should return correct info for UTC', () => {
			const info = kk_date.getTimezoneInfo('UTC');
			expect(info.timezone).toBe('UTC');
			expect(info.offset).toBe(0);
			expect(info.isDST).toBe(false);
		});

		test('should detect DST info correctly', () => {
			const summerDate = new Date('2024-07-15T12:00:00Z');
			const info = kk_date.getTimezoneInfo('America/New_York', summerDate);
			expect(info.isDST).toBe(true);
			expect(info.offset).toBe(-14400000); // UTC-4 in EDT
		});
	});

	describe('checkTimezone', () => {
		test('should return true for valid timezone', () => {
			expect(kk_date.checkTimezone('UTC')).toBe(true);
			expect(kk_date.checkTimezone('America/New_York')).toBe(true);
			expect(kk_date.checkTimezone('Europe/Istanbul')).toBe(true);
		});

		test('should throw for invalid timezone', () => {
			expect(() => kk_date.checkTimezone('Invalid/Zone')).toThrow();
			expect(() => kk_date.checkTimezone('')).toThrow();
		});
	});

	describe('dateTimeFormat default paths (no timezone)', () => {
		test('should use default dddd formatter without timezone', () => {
			// Save original timezone
			const originalTz = kk_date.getTimezone();

			// Clear global timezone to use default path
			kk_date.config({ timezone: null });

			const date = new kk_date('2024-01-15'); // Monday
			// Don't set instance timezone either
			const formatted = date.format('dddd');
			expect(formatted).toBe('Monday');

			// Restore
			kk_date.setTimezone(originalTz);
		});

		test('should use default ddd formatter without timezone', () => {
			const originalTz = kk_date.getTimezone();
			kk_date.config({ timezone: null });

			const date = new kk_date('2024-01-15'); // Monday
			const formatted = date.format('ddd');
			expect(formatted).toBe('Mon');

			kk_date.setTimezone(originalTz);
		});

		test('should use default MMMM formatter without timezone', () => {
			const originalTz = kk_date.getTimezone();
			kk_date.config({ timezone: null });

			const date = new kk_date('2024-01-15');
			const formatted = date.format('MMMM');
			expect(formatted).toBe('January');

			kk_date.setTimezone(originalTz);
		});

		test('should use default MMM formatter without timezone', () => {
			const originalTz = kk_date.getTimezone();
			kk_date.config({ timezone: null });

			const date = new kk_date('2024-01-15');
			const formatted = date.format('MMM');
			expect(formatted).toBe('Jan');

			kk_date.setTimezone(originalTz);
		});

		test('should use tempLocale with default formatter', () => {
			const originalTz = kk_date.getTimezone();
			kk_date.config({ timezone: null });

			const date = new kk_date('2024-01-15');
			date.config({ locale: 'es' });
			const formatted = date.format('MMMM');
			expect(formatted).toBe('enero');

			kk_date.setTimezone(originalTz);
		});
	});

	describe('converter fast path (non-timezone)', () => {
		test('should use fast path for simple date without timezone', () => {
			const originalTz = kk_date.getTimezone();
			kk_date.config({ timezone: null });

			const date = new kk_date('2024-06-15T14:30:45');
			expect(date.format('YYYY')).toBe('2024');
			expect(date.format('MM')).toBe('06');
			expect(date.format('DD')).toBe('15');
			expect(date.format('HH')).toBe('14');
			expect(date.format('mm')).toBe('30');
			expect(date.format('ss')).toBe('45');

			kk_date.setTimezone(originalTz);
		});

		test('should format full datetime without timezone', () => {
			const originalTz = kk_date.getTimezone();
			kk_date.config({ timezone: null });

			const date = new kk_date('2024-06-15T14:30:45');
			const formatted = date.format('YYYY-MM-DD HH:mm:ss');
			expect(formatted).toBe('2024-06-15 14:30:45');

			kk_date.setTimezone(originalTz);
		});
	});
});
