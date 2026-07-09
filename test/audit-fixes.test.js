const { describe, test, expect, afterEach } = require('@jest/globals');
const kk_date = require('../index');

// Locks for audited logic fixes in index.js. Each describe block documents the
// pre-fix wrong behavior in its comments; assertions state the correct behavior.

describe('add() accepts duration objects', () => {
	// Pre-fix: the condition at index.js:1077 threw 'amount is wrong' for every
	// non-number, making the documented add(DurationObject) branch dead code.
	test('adds a minutes duration', () => {
		const d = new kk_date('2024-01-01 00:00:00');
		expect(d.add(kk_date.duration(90, 'minutes')).format('YYYY-MM-DD HH:mm:ss')).toBe('2024-01-01 01:30:00');
	});

	test('adds a days duration', () => {
		expect(new kk_date('2024-01-01 00:00:00').add(kk_date.duration(2, 'days')).format('YYYY-MM-DD HH:mm:ss')).toBe('2024-01-03 00:00:00');
	});

	test('adds a weeks duration', () => {
		expect(new kk_date('2024-01-01 00:00:00').add(kk_date.duration(1, 'weeks')).format('YYYY-MM-DD HH:mm:ss')).toBe('2024-01-08 00:00:00');
	});

	test('returns the same instance (mutate-in-place)', () => {
		const d = new kk_date('2024-01-01 00:00:00');
		expect(d.add(kk_date.duration(1, 'hours'))).toBe(d);
	});

	test('still rejects invalid amounts', () => {
		const d = new kk_date('2024-01-01 00:00:00');
		expect(() => d.add('abc', 'days')).toThrow('amount is wrong');
		expect(() => d.add({}, 'days')).toThrow('amount is wrong');
		expect(() => d.add(null, 'days')).toThrow('amount is wrong');
	});
});

describe('startOf/endOf weeks honors instance weekStartDay override of 0', () => {
	// Pre-fix: `temp_config.weekStartDay || global_config.weekStartDay` swallowed a
	// legitimate instance override of 0 (Sunday) whenever the global value was non-zero.
	afterEach(() => {
		kk_date.config({ weekStartDay: 0 });
	});

	test('instance 0 wins over global 1 in startOf', () => {
		kk_date.config({ weekStartDay: 1 });
		const d = new kk_date('2024-01-17').config({ weekStartDay: 0 }); // Wednesday
		expect(d.startOf('weeks').format('YYYY-MM-DD')).toBe('2024-01-14'); // Sunday
	});

	test('instance 0 wins over global 1 in endOf', () => {
		kk_date.config({ weekStartDay: 1 });
		const d = new kk_date('2024-01-17').config({ weekStartDay: 0 });
		expect(d.endOf('weeks').format('YYYY-MM-DD')).toBe('2024-01-20'); // Saturday
	});

	test('non-zero instance override still wins (regression)', () => {
		kk_date.config({ weekStartDay: 1 });
		const d = new kk_date('2024-01-17').config({ weekStartDay: 2 }); // Tuesday start
		expect(d.startOf('weeks').format('YYYY-MM-DD')).toBe('2024-01-16');
	});

	test('global weekStartDay still applies without instance override (regression)', () => {
		kk_date.config({ weekStartDay: 1 });
		expect(new kk_date('2024-01-17').startOf('weeks').format('YYYY-MM-DD')).toBe('2024-01-15'); // Monday
	});
});

describe('isBetween invalid unit message lists weeks', () => {
	// Pre-fix: the message omitted 'weeks' even though the unit is supported.
	test('error message enumerates every supported unit', () => {
		expect(() => new kk_date('2024-01-01').isBetween('2024-01-01', '2024-01-02', 'bogus')).toThrow(
			'Invalid unit type. Must be one of: milliseconds, seconds, minutes, hours, days, weeks, months, years',
		);
	});
});

describe('add(0, type) validates the type', () => {
	// Pre-fix: the zero-amount fast path returned early without checking the type,
	// so add(0, 'bogus') silently succeeded while add(1, 'bogus') threw.
	test('add(0, invalid type) throws', () => {
		expect(() => new kk_date('2024-01-01').add(0, 'bogus')).toThrow('type is wrong');
	});

	test('add(0, valid type) stays a no-op returning this', () => {
		const d = new kk_date('2024-01-01');
		expect(d.add(0, 'days')).toBe(d);
		expect(d.format('YYYY-MM-DD')).toBe('2024-01-01');
	});
});

describe('comparison methods consistently reject invalid instances', () => {
	// Pre-fix: isBefore/isSameOrBefore threw on an invalidated instance while
	// isAfter/isSame/isSameOrAfter silently returned false.
	const makeInvalid = () => {
		const d = new kk_date('2024-01-01');
		d.set('years', Number.NaN);
		return d;
	};

	test('all five comparisons throw Invalid Date', () => {
		expect(() => makeInvalid().isBefore('2024-01-02')).toThrow('Invalid Date');
		expect(() => makeInvalid().isSameOrBefore('2024-01-02')).toThrow('Invalid Date');
		expect(() => makeInvalid().isAfter('2024-01-02')).toThrow('Invalid Date');
		expect(() => makeInvalid().isSame('2024-01-02')).toThrow('Invalid Date');
		expect(() => makeInvalid().isSameOrAfter('2024-01-02')).toThrow('Invalid Date');
	});
});

describe('numeric comparison arguments follow the constructor seconds/ms rule', () => {
	// Pre-fix: _getTimestamp used `date <= 10 ? date*1000 : date` while the constructor
	// classifies by string length (<= 10 digits = Unix seconds), so
	// new kk_date(X).isSame(X) was false for every 10-digit Unix timestamp.
	const UNIX = 1705276800; // 2024-01-15T00:00:00Z, 10 digits

	test('same 10-digit Unix timestamp compares as same', () => {
		expect(new kk_date(UNIX).isSame(UNIX)).toBe(true);
		expect(new kk_date(UNIX).isSameOrBefore(UNIX)).toBe(true);
		expect(new kk_date(UNIX).isSameOrAfter(UNIX)).toBe(true);
	});

	test('ordering with 10-digit Unix timestamps', () => {
		expect(new kk_date(UNIX).isBefore(UNIX + 1)).toBe(true);
		expect(new kk_date(UNIX).isAfter(UNIX - 1)).toBe(true);
	});

	test('13-digit millisecond timestamps keep working (regression)', () => {
		const ms = 1705276800123;
		expect(new kk_date(ms).isSame(ms)).toBe(true);
	});

	test('small integers where both rules agree (regression)', () => {
		expect(new kk_date(5).isSame(5)).toBe(true);
	});

	test('cross-method consistency with isBetween', () => {
		expect(new kk_date(UNIX).isBetween(UNIX - 100, UNIX + 100)).toBe(true);
	});
});

describe('add(years) clamps at month end', () => {
	// Pre-fix: the years branch did a raw setMonth(+12n) without the end-of-month clamp
	// the months branch applies, so Feb 29 + 1 year overflowed to Mar 1 and
	// add(1,'years') disagreed with add(12,'months').
	test('leap day + 1 year clamps to Feb 28', () => {
		expect(new kk_date('2024-02-29').add(1, 'years').format('YYYY-MM-DD')).toBe('2025-02-28');
	});

	test('leap day - 1 year clamps to Feb 28', () => {
		expect(new kk_date('2024-02-29').add(-1, 'years').format('YYYY-MM-DD')).toBe('2023-02-28');
	});

	test('add(1, years) equals add(12, months)', () => {
		expect(new kk_date('2024-02-29').add(1, 'years').getTime()).toBe(new kk_date('2024-02-29').add(12, 'months').getTime());
	});

	test('leap day + 4 years stays Feb 29 (regression)', () => {
		expect(new kk_date('2024-02-29').add(4, 'years').format('YYYY-MM-DD')).toBe('2028-02-29');
	});

	test('ordinary dates are unaffected (regression)', () => {
		expect(new kk_date('2024-12-31').add(1, 'years').format('YYYY-MM-DD')).toBe('2025-12-31');
		expect(new kk_date('2023-01-15').add(2, 'years').format('YYYY-MM-DD')).toBe('2025-01-15');
	});
});

describe('instance config validates the timezone', () => {
	// Pre-fix: config({timezone}) stored the value without checkTimezone(), so an
	// invalid IANA name was accepted silently and only blew up later inside format()
	// with a different, Intl-generated message. tz() and the global config both
	// fail fast — the instance config now matches them.
	test('invalid timezone throws immediately', () => {
		expect(() => new kk_date('2024-01-01').config({ timezone: 'Invalid/Zone' })).toThrow('Invalid timezone: Invalid/Zone');
	});

	test('valid timezone is accepted and effective (regression)', () => {
		const d = new kk_date('2024-01-15 12:00:00').config({ timezone: 'UTC' });
		expect(typeof d.format('YYYY-MM-DD HH:mm')).toBe('string');
	});
});

describe('calendar-aware diff for months and years', () => {
	// Pre-fix: diff('months'/'years') divided the elapsed time by fixed averages
	// (2,629,800 s and 31,557,600 s), so a full 365-day calendar year reported
	// diff('years') === 0 and Jan 1 -> Mar 1 reported 1 month. Now moment-parity
	// anchor arithmetic is used. Expected values below were cross-checked against
	// moment 0.6.x. Sign convention is unchanged: a.diff(b) = b - a.
	test('a full calendar year is 1 year', () => {
		expect(new kk_date('2023-01-01').diff('2024-01-01', 'years')).toBe(1); // 365-day year
		expect(new kk_date('2024-01-01').diff('2025-01-01', 'years')).toBe(1); // 366-day year
	});

	test('whole calendar months', () => {
		expect(new kk_date('2023-01-01').diff('2023-03-01', 'months')).toBe(2);
		expect(new kk_date('2023-02-01').diff('2023-03-01', 'months')).toBe(1);
		expect(new kk_date('2024-01-15').diff('2024-02-15', 'months')).toBe(1);
	});

	test('month-end anchor edges match moment', () => {
		expect(new kk_date('2024-01-31').diff('2024-02-29', 'months')).toBe(1);
		expect(new kk_date('2024-01-31').diff('2024-03-30', 'months')).toBe(1);
		expect(new kk_date('2024-01-31').diff('2024-03-31', 'months')).toBe(2);
		expect(new kk_date('2024-01-15').diff('2024-02-14', 'months')).toBe(0);
	});

	test('reverse direction is negative', () => {
		expect(new kk_date('2024-03-31').diff('2024-01-31', 'months')).toBe(-2);
		expect(new kk_date('2024-01-01').diff('2023-01-01', 'years')).toBe(-1);
	});

	test('is_decimal interpolates between anchors', () => {
		expect(new kk_date('2024-01-01').diff('2024-07-01', 'years', true)).toBeCloseTo(0.5, 2);
		expect(new kk_date('2024-01-31').diff('2024-03-30', 'months', true)).toBeCloseTo(1.9677, 3);
		expect(new kk_date('2024-01-15').diff('2024-02-14', 'months', true)).toBeCloseTo(0.9677, 3);
	});

	test('sub-month units keep the exact arithmetic (regression)', () => {
		expect(new kk_date('2024-08-23 00:00:00').diff('2024-08-25 00:00:00', 'days')).toBe(2);
		expect(new kk_date('2024-08-23 00:00:00').diff('2024-08-23 06:30:00', 'hours', true)).toBe(6.5);
		expect(new kk_date('2024-08-23 00:00:00').diff('2024-08-23 00:01:30', 'seconds')).toBe(90);
	});

	test('diff_range keeps its fixed-average stepping (characterization)', () => {
		expect(new kk_date('2024-01-01').diff_range('2024-03-15', 'months')).toEqual(['2024-01-01', '2024-01-31', '2024-03-01']);
	});
});
