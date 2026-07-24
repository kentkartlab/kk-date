const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');
const { timezone_cache } = require('../constants');

describe('getTimezoneOffset cache', () => {
	// Pre-fix: the 7-day TTL branch was dead (the cache key embeds date.getTime(), so the
	// stored timestamp always equaled the lookup time) and the cache had no size bound,
	// growing by one entry per distinct (timezone, millisecond) forever.
	test('offset cache is bounded', () => {
		timezone_cache.clear();
		const BASE = Date.UTC(2024, 0, 1);
		for (let i = 0; i < 10050; i++) {
			kk_date.getTimezoneOffset('Europe/Istanbul', new Date(BASE + i * 60000));
		}
		expect(timezone_cache.size).toBeLessThanOrEqual(10001);
		timezone_cache.clear();
	});

	test('cached and fresh offsets agree', () => {
		const d = new Date('2024-01-15T12:00:00Z');
		const first = kk_date.getTimezoneOffset('Europe/Istanbul', d);
		const second = kk_date.getTimezoneOffset('Europe/Istanbul', d); // cache hit
		timezone_cache.clear();
		const fresh = kk_date.getTimezoneOffset('Europe/Istanbul', d);
		expect(first).toBe(3 * 60 * 60 * 1000);
		expect(second).toBe(first);
		expect(fresh).toBe(first);
	});
});

describe('getTimezoneInfo / isDST hemisphere correctness', () => {
	// Pre-fix: the code assumed January = standard time and July = daylight time,
	// which inverts isDST and swaps standardOffset/daylightOffset in the Southern
	// Hemisphere (Sydney in January IS on DST).
	const JAN = new Date('2024-01-15T00:00:00Z');
	const JUL = new Date('2024-07-15T00:00:00Z');

	test('Southern Hemisphere: Sydney January is DST', () => {
		const info = kk_date.getTimezoneInfo('Australia/Sydney', JAN);
		expect(info.offset).toBe(39600000); // +11h AEDT
		expect(info.isDST).toBe(true);
		expect(info.standardOffset).toBe(36000000); // +10h AEST
		expect(info.daylightOffset).toBe(39600000);
	});

	test('Southern Hemisphere: Sydney July is standard time', () => {
		const info = kk_date.getTimezoneInfo('Australia/Sydney', JUL);
		expect(info.offset).toBe(36000000);
		expect(info.isDST).toBe(false);
		expect(kk_date.isDST('Australia/Sydney', JAN)).toBe(true);
		expect(kk_date.isDST('Australia/Sydney', JUL)).toBe(false);
	});

	test('Northern Hemisphere regression: New York', () => {
		const jul = kk_date.getTimezoneInfo('America/New_York', JUL);
		expect(jul.offset).toBe(-14400000); // -4h EDT
		expect(jul.isDST).toBe(true);
		expect(jul.standardOffset).toBe(-18000000); // -5h EST
		expect(jul.daylightOffset).toBe(-14400000);
		expect(jul.abbreviation).toBe('EDT'); // abbreviation path must stay untouched
		const jan = kk_date.getTimezoneInfo('America/New_York', JAN);
		expect(jan.isDST).toBe(false);
		expect(jan.offset).toBe(-18000000);
	});

	test('zones without DST report standard === daylight and isDST false', () => {
		for (const d of [JAN, JUL]) {
			const tokyo = kk_date.getTimezoneInfo('Asia/Tokyo', d);
			expect(tokyo.isDST).toBe(false);
			expect(tokyo.standardOffset).toBe(32400000);
			expect(tokyo.daylightOffset).toBe(32400000);
			const utc = kk_date.getTimezoneInfo('UTC', d);
			expect(utc.offset).toBe(0);
			expect(utc.isDST).toBe(false);
		}
	});

	test('30-minute DST edge: Lord Howe Island', () => {
		const jan = kk_date.getTimezoneInfo('Australia/Lord_Howe', JAN);
		expect(jan.isDST).toBe(true);
		expect(jan.standardOffset).toBe(37800000); // +10:30
		expect(jan.daylightOffset).toBe(39600000); // +11:00 (30-min shift)
		const jul = kk_date.getTimezoneInfo('Australia/Lord_Howe', JUL);
		expect(jul.isDST).toBe(false);
	});
});
