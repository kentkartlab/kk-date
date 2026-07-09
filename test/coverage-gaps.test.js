const { describe, test, expect, afterAll } = require('@jest/globals');
const kk_date = require('../index');

// Coverage for public API members that previously had zero or partial test coverage.
// No behavior changes are asserted here — these lock the current, correct behavior.

describe('isSameOrBefore', () => {
	test('equal instant returns true', () => {
		expect(new kk_date('2024-08-19 10:00:00').isSameOrBefore('2024-08-19 10:00:00')).toBe(true);
	});

	test('earlier instant returns true', () => {
		expect(new kk_date('2024-08-19 10:00:00').isSameOrBefore('2024-08-19 10:00:01')).toBe(true);
	});

	test('later instant returns false', () => {
		expect(new kk_date('2024-08-19 10:00:00').isSameOrBefore('2024-08-19 09:59:59')).toBe(false);
	});

	test('accepts Date and KkDate arguments', () => {
		const base = new kk_date('2024-08-19 10:00:00');
		expect(base.isSameOrBefore(new kk_date('2024-08-19 10:00:00'))).toBe(true);
		expect(base.isSameOrBefore(new Date(base.getTime()))).toBe(true);
		expect(base.isSameOrBefore(new kk_date('2024-08-19 09:00:00'))).toBe(false);
	});
});

describe('isSameOrAfter', () => {
	test('equal instant returns true', () => {
		expect(new kk_date('2024-08-19 10:00:00').isSameOrAfter('2024-08-19 10:00:00')).toBe(true);
	});

	test('later instant returns true', () => {
		expect(new kk_date('2024-08-19 10:00:00').isSameOrAfter('2024-08-19 09:59:59')).toBe(true);
	});

	test('earlier instant returns false', () => {
		expect(new kk_date('2024-08-19 10:00:00').isSameOrAfter('2024-08-19 10:00:01')).toBe(false);
	});

	test('accepts Date and KkDate arguments', () => {
		const base = new kk_date('2024-08-19 10:00:00');
		expect(base.isSameOrAfter(new kk_date('2024-08-19 10:00:00'))).toBe(true);
		expect(base.isSameOrAfter(new Date(base.getTime()))).toBe(true);
		expect(base.isSameOrAfter(new kk_date('2024-08-19 11:00:00'))).toBe(false);
	});
});

describe('caching_flush', () => {
	afterAll(() => {
		kk_date.caching({ status: false });
	});

	test('returns false while caching service is off', () => {
		expect(kk_date.caching_flush()).toBe(false);
	});

	test('flushes seeded cache and reports empty stats when on', () => {
		kk_date.caching({ status: true });
		new kk_date('2024-08-19 10:00:00');
		new kk_date('2024-08-19 10:00:00');
		expect(kk_date.caching_flush()).toBe(true);
		expect(kk_date.caching_status().total).toBe(0);
	});
});

describe('user timezone', () => {
	const saved = kk_date.getUserTimezone();

	afterAll(() => {
		kk_date.setUserTimezone(saved);
	});

	test('setUserTimezone / getUserTimezone round-trip', () => {
		kk_date.setUserTimezone('Europe/Istanbul');
		expect(kk_date.getUserTimezone()).toBe('Europe/Istanbul');
		kk_date.setUserTimezone('America/New_York');
		expect(kk_date.getUserTimezone()).toBe('America/New_York');
	});

	test('setUserTimezone rejects invalid timezone', () => {
		expect(() => kk_date.setUserTimezone('Bad/Zone')).toThrow('Invalid timezone: Bad/Zone');
	});
});

describe('diff is_decimal', () => {
	test('days with is_decimal returns fraction', () => {
		expect(new kk_date('2024-08-23 00:00:00').diff('2024-08-24 12:00:00', 'days', true)).toBe(1.5);
	});

	test('hours with is_decimal returns exact value', () => {
		expect(new kk_date('2024-08-23 00:00:00').diff('2024-08-24 12:00:00', 'hours', true)).toBe(36);
	});

	test('default floors toward zero', () => {
		expect(new kk_date('2024-08-23 00:00:00').diff('2024-08-24 12:00:00', 'days')).toBe(1);
		expect(new kk_date('2024-08-24 12:00:00').diff('2024-08-23 00:00:00', 'days')).toBe(-1);
	});
});

describe('duration extra units', () => {
	test('weeks', () => {
		const d = kk_date.duration(2, 'weeks');
		expect(d.weeks).toBe(2);
		expect(d.days).toBe(0);
		expect(d.asDays()).toBe(14);
	});

	test('months uses the fixed 31-day month', () => {
		const d = kk_date.duration(1, 'months');
		expect(d.months).toBe(1);
		expect(d.asDays()).toBe(31);
	});

	test('seconds', () => {
		const d = kk_date.duration(90, 'seconds');
		expect(d.minutes).toBe(1);
		expect(d.seconds).toBe(30);
		expect(d.asMilliseconds()).toBe(90000);
	});
});

describe('valueOfLocal check_error param', () => {
	test('check_error=false returns a number for valid dates', () => {
		const base = new kk_date('2024-08-19 10:00:00');
		expect(typeof base.valueOfLocal(false)).toBe('number');
		expect(base.valueOfLocal(false)).toBe(base.valueOfLocal());
	});
});

describe('isBetween units', () => {
	const base = new kk_date('2024-08-19 12:00:00');

	test('seconds / hours / days inside range', () => {
		expect(base.isBetween('2024-08-19 00:00:00', '2024-08-20 00:00:00', 'seconds')).toBe(true);
		expect(base.isBetween('2024-08-19 00:00:00', '2024-08-20 00:00:00', 'hours')).toBe(true);
		expect(base.isBetween('2024-08-19 00:00:00', '2024-08-20 00:00:00', 'days')).toBe(true);
	});

	test('weeks inside range', () => {
		expect(base.isBetween('2024-08-05 00:00:00', '2024-09-02 00:00:00', 'weeks')).toBe(true);
	});

	test('months and years bucket comparison', () => {
		expect(base.isBetween('2024-07-01 00:00:00', '2024-10-01 00:00:00', 'months')).toBe(true);
		expect(base.isBetween('2024-01-01 00:00:00', '2024-02-01 00:00:00', 'months')).toBe(false);
		expect(base.isBetween('2023-01-01 00:00:00', '2025-01-01 00:00:00', 'years')).toBe(true);
		expect(base.isBetween('2020-01-01 00:00:00', '2021-01-01 00:00:00', 'years')).toBe(false);
	});

	test('seconds outside range returns false', () => {
		expect(new kk_date('2024-08-20 00:00:05').isBetween('2024-08-19 00:00:00', '2024-08-20 00:00:00', 'seconds')).toBe(false);
	});
});

describe('convertToTimezone default source', () => {
	test('omitted source falls back to the configured user timezone', () => {
		const d = new Date('2024-01-15T12:00:00Z');
		const out = kk_date.convertToTimezone(d, 'Europe/Istanbul');
		const expected = d.getTime() + kk_date.getTimezoneOffset('Europe/Istanbul', d) - kk_date.getTimezoneOffset(kk_date.getUserTimezone(), d);
		expect(out).toBeInstanceOf(Date);
		expect(out.getTime()).toBe(expected);
	});

	test('invalid target timezone throws', () => {
		expect(() => kk_date.convertToTimezone(new Date(), 'Invalid/Timezone')).toThrow('Failed to convert timezone');
	});
});
