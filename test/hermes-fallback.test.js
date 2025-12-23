const KkDate = require('../index');
const { getTimezoneOffset } = require('../functions');

describe('Hermes/React Native Fallback - getTimezoneOffset', () => {
	describe('Normal operation (longOffset supported)', () => {
		it('should return correct offset for UTC', () => {
			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('UTC', date);
			expect(offset).toBe(0);
		});

		it('should return correct offset for positive timezone (Europe/Istanbul UTC+3)', () => {
			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('Europe/Istanbul', date);
			expect(offset).toBe(3 * 60 * 60 * 1000);
		});

		it('should return correct offset for negative timezone (America/New_York UTC-5)', () => {
			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('America/New_York', date);
			expect(offset).toBe(-5 * 60 * 60 * 1000);
		});

		it('should return correct offset for half-hour timezone (Asia/Kolkata UTC+5:30)', () => {
			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('Asia/Kolkata', date);
			expect(offset).toBe(5.5 * 60 * 60 * 1000);
		});

		it('should return correct offset for 45-minute timezone (Asia/Kathmandu UTC+5:45)', () => {
			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('Asia/Kathmandu', date);
			expect(offset).toBe((5 * 60 + 45) * 60 * 1000);
		});
	});

	describe('Fallback simulation (longOffset not supported)', () => {
		let originalDateTimeFormat;

		beforeAll(() => {
			// Save original Intl.DateTimeFormat
			originalDateTimeFormat = Intl.DateTimeFormat;
		});

		afterAll(() => {
			// Restore original Intl.DateTimeFormat
			Intl.DateTimeFormat = originalDateTimeFormat;
		});

		it('should fallback when longOffset returns no timeZoneName part', () => {
			// Mock DateTimeFormat to simulate Hermes behavior
			const MockDateTimeFormat = function (locale, options) {
				if (options && options.timeZoneName === 'longOffset') {
					return {
						formatToParts: () => [
							{ type: 'month', value: '1' },
							{ type: 'literal', value: '/' },
							{ type: 'day', value: '15' },
							{ type: 'literal', value: '/' },
							{ type: 'year', value: '2025' },
							// No timeZoneName part - simulating Hermes
						],
					};
				}
				// For other calls (validation, fallback), use original
				return new originalDateTimeFormat(locale, options);
			};

			Intl.DateTimeFormat = MockDateTimeFormat;

			// Clear cache to force recalculation
			const { timezone_cache } = require('../constants');
			timezone_cache.clear();

			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('Europe/Istanbul', date);

			// Should still return correct offset via fallback
			expect(offset).toBe(3 * 60 * 60 * 1000);
		});

		it('should reconstruct offset when longOffset returns split GMT parts (real Hermes behavior)', () => {
			// This simulates actual Hermes behavior where timeZoneName is split:
			// {"type": "timeZoneName", "value": "GMT"},
			// {"type": "literal", "value": "+"},
			// {"type": "literal", "value": "03"},
			// {"type": "literal", "value": ":"},
			// {"type": "timeZoneName", "value": "00"}
			const MockDateTimeFormat = function (locale, options) {
				if (options && options.timeZoneName === 'longOffset') {
					return {
						formatToParts: () => [
							{ type: 'month', value: '12' },
							{ type: 'literal', value: '/' },
							{ type: 'day', value: '23' },
							{ type: 'literal', value: '/' },
							{ type: 'year', value: '2025' },
							{ type: 'literal', value: ',' },
							{ type: 'literal', value: ' ' },
							{ type: 'timeZoneName', value: 'GMT' }, // Just "GMT", not "GMT+03:00"
							{ type: 'literal', value: '+' },
							{ type: 'literal', value: '03' },
							{ type: 'literal', value: ':' },
							{ type: 'timeZoneName', value: '00' },
						],
					};
				}
				return new originalDateTimeFormat(locale, options);
			};

			Intl.DateTimeFormat = MockDateTimeFormat;

			const { timezone_cache, long_timezone_cache } = require('../constants');
			timezone_cache.clear();
			long_timezone_cache.clear();

			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('Europe/Istanbul', date);

			// Should reconstruct offset from split parts and return correct offset
			expect(offset).toBe(3 * 60 * 60 * 1000);
		});

		it('should fallback when longOffset throws error', () => {
			const MockDateTimeFormat = function (locale, options) {
				if (options && options.timeZoneName === 'longOffset') {
					throw new Error('longOffset not supported');
				}
				return new originalDateTimeFormat(locale, options);
			};

			Intl.DateTimeFormat = MockDateTimeFormat;

			const { timezone_cache } = require('../constants');
			timezone_cache.clear();

			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('America/New_York', date);

			expect(offset).toBe(-5 * 60 * 60 * 1000);
		});

		it('should handle half-hour offsets in fallback mode', () => {
			const MockDateTimeFormat = function (locale, options) {
				if (options && options.timeZoneName === 'longOffset') {
					return {
						formatToParts: () => [], // Empty - no timeZoneName
					};
				}
				return new originalDateTimeFormat(locale, options);
			};

			Intl.DateTimeFormat = MockDateTimeFormat;

			const { timezone_cache } = require('../constants');
			timezone_cache.clear();

			const date = new Date('2025-01-15T12:00:00Z');
			const offset = getTimezoneOffset('Asia/Kolkata', date);

			expect(offset).toBe(5.5 * 60 * 60 * 1000);
		});
	});

	describe('endOf/startOf with fallback', () => {
		it('endOf months should return correct date for December', () => {
			const result = new KkDate('2025-12-23').endOf('months').format('YYYY-MM-DD');
			expect(result).toBe('2025-12-31');
		});

		it('endOf months should return correct date for February (leap year)', () => {
			const result = new KkDate('2024-02-15').endOf('months').format('YYYY-MM-DD');
			expect(result).toBe('2024-02-29');
		});

		it('endOf months should return correct date for February (non-leap year)', () => {
			const result = new KkDate('2025-02-15').endOf('months').format('YYYY-MM-DD');
			expect(result).toBe('2025-02-28');
		});

		it('startOf months should return correct date', () => {
			const result = new KkDate('2025-12-23').startOf('months').format('YYYY-MM-DD');
			expect(result).toBe('2025-12-01');
		});

		it('endOf years should return correct date', () => {
			const result = new KkDate('2025-06-15').endOf('years').format('YYYY-MM-DD');
			expect(result).toBe('2025-12-31');
		});
	});

	describe('Edge cases', () => {
		it('should handle year boundary correctly', () => {
			const result = new KkDate('2025-12-31').endOf('days').format('YYYY-MM-DD HH:mm:ss');
			expect(result).toBe('2025-12-31 23:59:59');
		});

		it('should handle DST transition dates', () => {
			// March DST transition in US
			const marchDate = new Date('2025-03-09T12:00:00Z');
			const offsetMarch = getTimezoneOffset('America/New_York', marchDate);

			// November DST transition in US
			const novDate = new Date('2025-11-02T12:00:00Z');
			const offsetNov = getTimezoneOffset('America/New_York', novDate);

			// EDT (summer) is UTC-4, EST (winter) is UTC-5
			expect(offsetMarch).toBe(-4 * 60 * 60 * 1000); // EDT
			expect(offsetNov).toBe(-5 * 60 * 60 * 1000); // EST
		});

		it('should handle timezone with global config', () => {
			KkDate.config({ timezone: 'UTC' });
			const result = new KkDate('2025-12-23').endOf('months').format('YYYY-MM-DD');
			expect(result).toBe('2025-12-31');

			// Reset
			KkDate.config({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
		});

		it('should handle multiple sequential operations', () => {
			const date = new KkDate('2025-06-15');
			const result = date.startOf('months').endOf('months').format('YYYY-MM-DD');
			expect(result).toBe('2025-06-30');
		});
	});

	describe('Timezone offset consistency', () => {
		const timezones = [
			{ name: 'UTC', expectedWinter: 0, expectedSummer: 0 },
			{ name: 'Europe/Istanbul', expectedWinter: 3, expectedSummer: 3 },
			{ name: 'Europe/London', expectedWinter: 0, expectedSummer: 1 },
			{ name: 'America/New_York', expectedWinter: -5, expectedSummer: -4 },
			{ name: 'America/Los_Angeles', expectedWinter: -8, expectedSummer: -7 },
			{ name: 'Asia/Tokyo', expectedWinter: 9, expectedSummer: 9 },
			{ name: 'Australia/Sydney', expectedWinter: 11, expectedSummer: 10 },
		];

		const winterDate = new Date('2025-01-15T12:00:00Z');
		const summerDate = new Date('2025-07-15T12:00:00Z');

		for (const tz of timezones) {
			it(`should return correct offset for ${tz.name} in winter`, () => {
				const offset = getTimezoneOffset(tz.name, winterDate);
				const hours = offset / (60 * 60 * 1000);
				expect(hours).toBe(tz.expectedWinter);
			});

			it(`should return correct offset for ${tz.name} in summer`, () => {
				const offset = getTimezoneOffset(tz.name, summerDate);
				const hours = offset / (60 * 60 * 1000);
				expect(hours).toBe(tz.expectedSummer);
			});
		}
	});
});
