const { describe, test, expect, beforeEach, afterEach, afterAll } = require('@jest/globals');
const { DateTime } = require('luxon');
const moment = require('moment-timezone');
const kk_date = require('../index');
const { runInZone } = require('./helpers/run-in-zone');

const SYSTEM_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

afterAll(() => {
	kk_date.config({ timezone: SYSTEM_TIMEZONE, weekStartDay: 0 });
});

describe('diff()', () => {
	beforeEach(() => {
		kk_date.config({ timezone: 'America/New_York' });
	});

	test('days are calendar days: a 23- or 25-hour DST day still counts as one', () => {
		expect(new kk_date('2024-03-10 00:00:00').diff(new kk_date('2024-03-11 00:00:00'), 'days')).toBe(1);
		expect(new kk_date('2024-11-03 00:00:00').diff(new kk_date('2024-11-04 00:00:00'), 'days')).toBe(1);
		expect(new kk_date('2024-01-01 00:00:00').diff(new kk_date('2024-07-01 00:00:00'), 'days')).toBe(182);
		expect(new kk_date('2024-03-10 00:00:00').diff(new kk_date('2024-03-11 12:00:00'), 'days', true)).toBe(1.5);
	});

	test('hours/minutes/seconds stay elapsed time', () => {
		expect(new kk_date('2024-03-10 00:00:00').diff(new kk_date('2024-03-11 00:00:00'), 'hours')).toBe(23);
		expect(new kk_date('2024-11-03 00:00:00').diff(new kk_date('2024-11-04 00:00:00'), 'minutes')).toBe(25 * 60);
	});

	test('weeks are supported (calendar days / 7)', () => {
		expect(new kk_date('2024-03-03 00:00:00').diff(new kk_date('2024-03-17 00:00:00'), 'weeks')).toBe(2);
		expect(new kk_date('2024-03-03 00:00:00').diff(new kk_date('2024-03-20 12:00:00'), 'weeks', true)).toBeCloseTo(2.5, 10);
	});

	test('months are symmetric at month ends (moment swaps the anchor)', () => {
		expect(new kk_date('2024-02-29 09:00:00').diff('2023-01-30 00:00:00', 'months')).toBe(-13);
		expect(new kk_date('2023-01-30 00:00:00').diff('2024-02-29 09:00:00', 'months')).toBe(13);
		expect(new kk_date('2024-01-31 00:00:00').diff('2024-02-29 00:00:00', 'months')).toBe(1);
	});

	test('fractional months/years equal -moment(a).diff(b) (same receiver, kk sign convention)', () => {
		kk_date.config({ timezone: 'UTC' });
		// [a, b, -moment(a).diff(b, 'months', true), -moment(a).diff(b, 'years', true)]
		const ROWS = [
			['2023-04-18T18:31:52.224Z', '2021-07-18T19:08:39.055Z', -20.999176063694744, -1.7499313386412287],
			['2022-12-20T00:40:55.379Z', '2022-02-21T02:45:35.860Z', -9.963780678626543, -0.8303150565522119],
			['2021-11-13T12:11:16.904Z', '2022-08-19T06:18:31.413Z', 9.185646098043609, 0.7654705081703007],
			['2015-12-17T22:32:01.216Z', '2017-01-17T19:55:46.563Z', 12.996499905540622, 1.0830416587950518],
			['2024-03-01T22:30:29.853Z', '2022-01-24T05:02:15.727Z', -25.231997974936142, -2.102666497911345],
			['2021-01-30T01:49:01.730Z', '2020-09-02T03:48:23.786Z', -4.900551801075268, -0.40837931675627237],
			['2023-01-25T12:57:26.104Z', '2025-03-29T05:10:59.271Z', 26.118583171669652, 2.1765485976391377],
			['2019-06-15T07:17:13.324Z', '2018-04-09T02:56:46.879Z', -14.199382633288531, -1.1832818861073775],
			['2016-10-01T03:57:02.594Z', '2018-01-25T12:06:26.023Z', 15.811328483410493, 1.3176107069508745],
			['2023-05-26T08:33:15.623Z', '2026-02-17T12:28:39.571Z', 32.714950697431306, 2.7262458914526086],
			['2017-12-06T14:10:17.715Z', '2018-10-25T17:14:11.586Z', 10.637590228009259, 0.8864658523341049],
			['2022-06-05T19:37:25.450Z', '2021-04-18T13:57:33.150Z', -13.588258773894863, -1.1323548978245719],
		];
		for (const [a, b, months, years] of ROWS) {
			expect(new kk_date(a).diff(b, 'months', true)).toBeCloseTo(months, 10);
			expect(new kk_date(a).diff(b, 'years', true)).toBeCloseTo(years, 10);
		}
	});

	// Days are whole days between the two wall clocks, not a count of dates: a day whose midnight is
	// skipped by DST starts at 01:00, and from there to the next midnight is 23 hours (0 days).
	// moment-timezone, Luxon and Temporal all agree on these rows; diff_range() lists the dates.
	test.each([
		['America/Santiago', '2024-09-08', '2024-09-09', '2024-09-10', '2024-09-15'],
		['America/Sao_Paulo', '2018-11-04', '2018-11-05', '2018-11-06', '2018-11-11'],
		['Asia/Beirut', '2024-03-31', '2024-04-01', '2024-04-02', '2024-04-07'],
	])('%s: days from the day without a midnight (%s) match moment and Luxon', (zone, day, next, after, week) => {
		kk_date.config({ timezone: zone });
		for (const [a, b, unit] of [
			[day, next, 'days'],
			[day, after, 'days'],
			[after, day, 'days'],
			[day, week, 'weeks'],
		]) {
			const fromMoment = moment.tz(b, zone).diff(moment.tz(a, zone), unit);
			const fromLuxon = Math.trunc(DateTime.fromISO(b, { zone }).diff(DateTime.fromISO(a, { zone }), unit).get(unit));
			expect([a, b, unit, fromLuxon]).toEqual([a, b, unit, fromMoment]);
			expect([a, b, unit, new kk_date(a).diff(b, unit)]).toEqual([a, b, unit, fromMoment]);
		}
		expect(new kk_date(day).diff(next, 'days')).toBe(0);
		expect(new kk_date(day).diff(after, 'days')).toBe(1);
	});

	// kk follows moment (the wall-clock difference) also where Luxon and Temporal count one day less:
	// when the end's time of day does not exist on the start's next day (02:30 -> 03:00 over a gap).
	test('days follow moment when a DST gap falls between the two times of day', () => {
		const zone = 'America/New_York';
		kk_date.config({ timezone: zone });
		const [a, b] = ['2024-03-09 02:30:00', '2024-03-10 03:00:00'];
		expect(new kk_date(a).diff(b, 'days')).toBe(moment.tz(b, zone).diff(moment.tz(a, zone), 'days'));
		expect(new kk_date(a).diff(b, 'days')).toBe(1);
	});

	// For date-only inputs the rounded fractional difference is the calendar-day difference, also
	// from a day that starts at 01:00 and across Apia's skipped day (checked against Temporal for
	// every IANA zone); the expected value here is plain calendar arithmetic.
	test.each([
		'America/Santiago',
		'Asia/Beirut',
		'Pacific/Apia',
		'America/Nuuk',
		'Australia/Lord_Howe',
		'America/New_York',
	])('%s: Math.round(diff(…, "days", true)) of date-only inputs counts calendar days', (zone) => {
		kk_date.config({ timezone: zone });
		const anchors = [Date.UTC(2024, 8, 8), Date.UTC(2024, 2, 31), Date.UTC(2011, 11, 30), Date.UTC(2024, 2, 30), Date.UTC(2024, 9, 6)];
		const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
		let seed = 7;
		const random = () => {
			seed = (seed * 1664525 + 1013904223) >>> 0;
			return seed / 4294967296;
		};
		let checked = 0;
		for (let index = 0; index < 300; index++) {
			const a = anchors[Math.floor(random() * anchors.length)] + (Math.floor(random() * 7) - 3) * 86400000;
			const b = a + (Math.floor(random() * 120) - 60) * 86400000;
			const [start, end] = [new kk_date(iso(a)), new kk_date(iso(b))];
			// a date the zone skipped (Apia 2011-12-30) reads as the next one: not a date-only pair
			if (start.format('YYYY-MM-DD') !== iso(a) || end.format('YYYY-MM-DD') !== iso(b)) continue;
			checked++;
			expect([iso(a), iso(b), Math.round(start.diff(end, 'days', true))]).toEqual([iso(a), iso(b), (b - a) / 86400000]);
		}
		expect(checked).toBeGreaterThan(250);
	});
});

describe('diff_range()', () => {
	beforeEach(() => {
		kk_date.config({ timezone: 'UTC' });
	});

	test('months step on the calendar, anchored on the start (month ends clamp)', () => {
		expect(new kk_date('2024-01-01').diff_range('2024-06-01', 'months')).toEqual([
			'2024-01-01',
			'2024-02-01',
			'2024-03-01',
			'2024-04-01',
			'2024-05-01',
			'2024-06-01',
		]);
		expect(new kk_date('2024-01-31').diff_range('2024-05-31', 'months')).toEqual([
			'2024-01-31',
			'2024-02-29',
			'2024-03-31',
			'2024-04-30',
			'2024-05-31',
		]);
	});

	test('years step on the calendar', () => {
		expect(new kk_date('2020-01-01').diff_range('2025-01-01', 'years')).toEqual([
			'2020-01-01',
			'2021-01-01',
			'2022-01-01',
			'2023-01-01',
			'2024-01-01',
			'2025-01-01',
		]);
		expect(new kk_date('2024-02-29').diff_range('2026-03-01', 'years')).toEqual(['2024-02-29', '2025-02-28', '2026-02-28']);
	});

	test('days keep every date at midnight across DST and include the last day', () => {
		kk_date.config({ timezone: 'America/New_York' });
		const range = new kk_date('2024-03-01').diff_range('2024-03-31', 'days', 'MM-DD HH:mm');
		expect(range).toHaveLength(31);
		expect(range[30]).toBe('03-31 00:00');
		expect(range.every((entry) => entry.endsWith('00:00'))).toBe(true);
	});

	test('weeks are supported, and an end before the start yields only the start', () => {
		expect(new kk_date('2024-01-01').diff_range('2024-01-22', 'weeks')).toEqual(['2024-01-01', '2024-01-08', '2024-01-15', '2024-01-22']);
		expect(new kk_date('2024-01-10').diff_range('2024-01-01', 'days')).toEqual(['2024-01-10']);
	});

	// The expected lists below were computed with Temporal (ZonedDateTime.add: wall clock kept, month
	// ends constrained, a gap moves forward) and, for days, also with date-fns eachDayOfInterval.
	test("calendar units ignore the time of day: an end time earlier than the start's keeps the last date", () => {
		expect(new kk_date('2024-01-01 10:00:00').diff_range('2024-01-03 09:00:00', 'days')).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
		expect(new kk_date('2024-01-01 10:00:00').diff_range('2024-01-15 09:00:00', 'weeks')).toEqual(['2024-01-01', '2024-01-08', '2024-01-15']);
		expect(new kk_date('2024-01-15 10:00:00').diff_range('2024-03-15 09:00:00', 'months')).toEqual(['2024-01-15', '2024-02-15', '2024-03-15']);
		expect(new kk_date('2024-06-01 10:00:00').diff_range('2026-06-01 09:00:00', 'years')).toEqual(['2024-06-01', '2025-06-01', '2026-06-01']);
		// every entry keeps the start's time of day
		expect(new kk_date('2024-01-01 10:00:00').diff_range('2024-01-03 09:00:00', 'days', 'MM-DD HH:mm')).toEqual([
			'01-01 10:00',
			'01-02 10:00',
			'01-03 10:00',
		]);
	});

	test("a month-end step that lands after the end's date is not listed", () => {
		expect(new kk_date('2024-01-31').diff_range('2024-03-15', 'months')).toEqual(['2024-01-31', '2024-02-29']);
		expect(new kk_date('2024-02-29').diff_range('2025-02-27', 'years')).toEqual(['2024-02-29']);
	});

	test('time units still step by elapsed time up to the end instant', () => {
		expect(new kk_date('2024-01-01 10:30:00').diff_range('2024-01-01 12:15:00', 'hours', 'HH:mm')).toEqual(['10:30', '11:30']);
		expect(new kk_date('2024-01-01 10:30:00').diff_range('2024-01-01 12:30:00', 'hours', 'HH:mm')).toEqual(['10:30', '11:30', '12:30']);
	});

	// DST starts at midnight here, so the day begins at 01:00 and '<day>' reads as 01:00
	test.each([
		['America/Santiago', '2024-09-08', ['2024-09-08', '2024-09-09', '2024-09-10']],
		['America/Sao_Paulo', '2018-11-04', ['2018-11-04', '2018-11-05', '2018-11-06']],
		['Asia/Beirut', '2024-03-31', ['2024-03-31', '2024-04-01', '2024-04-02']],
	])('%s: a range starting on the day without a midnight (%s) lists every date', (zone, day, expected) => {
		kk_date.config({ timezone: zone });
		expect(new kk_date(day).format('HH:mm')).toBe('01:00');
		expect(new kk_date(day).diff_range(expected[2], 'days')).toEqual(expected);
	});

	test('Pacific/Apia: the skipped 2011-12-30 is not listed and 2011-12-31 appears once', () => {
		kk_date.config({ timezone: 'Pacific/Apia' });
		expect(new kk_date('2011-12-29').diff_range('2012-01-01', 'days')).toEqual(['2011-12-29', '2011-12-31', '2012-01-01']);
		expect(new kk_date('2011-12-28').diff_range('2011-12-31', 'days')).toEqual(['2011-12-28', '2011-12-29', '2011-12-31']);
		expect(new kk_date('2011-12-29 12:00:00').diff_range('2012-01-01 08:00:00', 'days', 'MM-DD HH:mm')).toEqual([
			'12-29 12:00',
			'12-31 12:00',
			'01-01 12:00',
		]);
		// a week or month step on the skipped date keeps add()'s next date, so that period is still listed
		expect(new kk_date('2011-12-23').diff_range('2012-01-06', 'weeks')).toEqual(['2011-12-23', '2011-12-31', '2012-01-06']);
		expect(new kk_date('2011-11-30').diff_range('2012-01-30', 'months')).toEqual(['2011-11-30', '2011-12-31', '2012-01-30']);
	});

	test.each([
		['Pacific/Kiritimati', '1994-12-30', '1995-01-01', ['1994-12-30', '1995-01-01']],
		['Pacific/Kwajalein', '1993-08-20', '1993-08-22', ['1993-08-20', '1993-08-22']],
	])('%s: a skipped date is not listed', (zone, start, end, expected) => {
		kk_date.config({ timezone: zone });
		expect(new kk_date(start).diff_range(end, 'days')).toEqual(expected);
	});

	// America/Nuuk skips 23:00-24:00 on 2024-03-30: add() moves 23:30 forward into the next date, so
	// the entry for that date is read with the offset after the gap instead (22:30, Temporal's
	// 'earlier' disambiguation) and every date is listed once (date-fns eachDayOfInterval agrees).
	test('America/Nuuk: a time of day the gap pushes into the next date stays on its own date', () => {
		kk_date.config({ timezone: 'America/Nuuk' });
		const F = 'YYYY-MM-DD HH:mm';
		expect(new kk_date('2024-03-29 23:30:00').add(1, 'days').format(F)).toBe('2024-03-31 00:30');
		expect(new kk_date('2024-03-29 23:30:00').diff_range('2024-04-01', 'days')).toEqual(['2024-03-29', '2024-03-30', '2024-03-31', '2024-04-01']);
		expect(new kk_date('2024-03-29 23:30:00').diff_range('2024-04-01', 'days', F)).toEqual([
			'2024-03-29 23:30',
			'2024-03-30 22:30',
			'2024-03-31 23:30',
			'2024-04-01 23:30',
		]);
		expect(new kk_date('2024-03-23 23:30:00').diff_range('2024-04-06', 'weeks', F)).toEqual([
			'2024-03-23 23:30',
			'2024-03-30 22:30',
			'2024-04-06 23:30',
		]);
		expect(new kk_date('2024-01-30 23:30:00').diff_range('2024-04-30', 'months', F)).toEqual([
			'2024-01-30 23:30',
			'2024-02-29 23:30',
			'2024-03-30 22:30',
			'2024-04-30 23:30',
		]);
	});

	test('the system-timezone fast path gives the same lists', () => {
		expect(runInZone('America/Santiago', "return new kk_date('2024-09-08').diff_range('2024-09-10', 'days');")).toEqual([
			'2024-09-08',
			'2024-09-09',
			'2024-09-10',
		]);
		expect(runInZone('Pacific/Apia', "return new kk_date('2011-12-29').diff_range('2012-01-01', 'days');")).toEqual([
			'2011-12-29',
			'2011-12-31',
			'2012-01-01',
		]);
		expect(runInZone('Europe/Istanbul', "return new kk_date('2024-01-15 10:00:00').diff_range('2024-03-15 09:00:00', 'months');")).toEqual([
			'2024-01-15',
			'2024-02-15',
			'2024-03-15',
		]);
		expect(runInZone('America/Nuuk', "return new kk_date('2024-03-29 23:30:00').diff_range('2024-04-01', 'days', 'YYYY-MM-DD HH:mm');")).toEqual([
			'2024-03-29 23:30',
			'2024-03-30 22:30',
			'2024-03-31 23:30',
			'2024-04-01 23:30',
		]);
	});

	// Luxon as the reference (DateTime.plus keeps the wall clock and the offset side, clamps month ends
	// and moves a gap forward; an entry the gap pushes into the next date is read with the offset after
	// the gap), over random ranges around DST gaps and overlaps, midnight transitions, the gap at 23:00
	// in Nuuk and the skipped Apia day. In CI the suite also runs with TZ set to several of these zones
	// (system-zone fast path). An offline fuzz against Temporal covered every IANA zone.
	test.each([
		'America/Santiago',
		'Asia/Beirut',
		'Pacific/Apia',
		'America/Nuuk',
		'America/New_York',
		'Australia/Lord_Howe',
		'Europe/Istanbul',
	])('%s: random ranges match the Luxon reference', (zone) => {
		kk_date.config({ timezone: zone });
		const anchors = [
			'2024-09-08',
			'2018-11-04',
			'2024-03-31',
			'2011-12-30',
			'2024-03-10',
			'2024-11-03',
			'2024-04-06',
			'2024-02-29',
			'2024-01-31',
			'2024-03-30',
		];
		const spans = { days: 45, weeks: 200, months: 900, years: 3000 };
		let seed = 20261019;
		const random = () => {
			seed = (seed * 1664525 + 1013904223) >>> 0;
			return seed / 4294967296;
		};
		const pick = (list) => list[Math.floor(random() * list.length)];
		const text = (base, days) => {
			const date = DateTime.fromISO(base, { zone: 'UTC' }).plus({ days }).toFormat('yyyy-MM-dd');
			return random() < 0.5 ? date : `${date} ${DateTime.fromMillis(Math.floor(random() * 86400) * 1000, { zone: 'UTC' }).toFormat('HH:mm:ss')}`;
		};
		const LUXON_FORMAT = 'yyyy-MM-dd HH:mm:ss ZZ';
		const luxonRange = (start, end, unit) => {
			const parse = (value) => DateTime.fromFormat(value, value.length > 10 ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd', { zone });
			const first = parse(start);
			const lastDate = parse(end).toISODate();
			const firstDate = DateTime.fromObject({ year: first.year, month: first.month, day: first.day }, { zone: 'UTC' });
			const out = [first.toFormat(LUXON_FORMAT)];
			for (let n = 1; ; n++) {
				const date = firstDate.plus({ [unit]: n }).toISODate();
				if (date > lastDate) return out;
				let step = first.plus({ [unit]: n });
				if (step.toISODate() !== date) {
					const earlier = DateTime.fromMillis(Date.parse(`${date}T${first.toFormat('HH:mm:ss.SSS')}Z`) - step.offset * 60000, { zone });
					if (earlier.toISODate() === date) {
						step = earlier;
					} else if (unit === 'days') {
						continue;
					}
				}
				out.push(step.toFormat(LUXON_FORMAT));
			}
		};
		for (let index = 0; index < 250; index++) {
			const unit = pick(['days', 'weeks', 'months', 'years']);
			const base = pick(anchors);
			const start = text(base, Math.floor(random() * 9) - 4);
			const end = text(base, Math.floor(random() * spans[unit]) - 3);
			expect([start, end, unit, new kk_date(start).diff_range(end, unit, 'YYYY-MM-DD HH:mm:ss Z')]).toEqual([
				start,
				end,
				unit,
				luxonRange(start, end, unit),
			]);
		}
	});
});

describe('isBetween() with a unit compares calendar periods', () => {
	beforeEach(() => {
		kk_date.config({ timezone: 'Europe/Istanbul', weekStartDay: 0 });
	});

	test.each([
		['2024-02-29', '2024-03-01', '2024-03-31', 'months', false],
		['2024-03-31', '2024-04-01', '2024-04-30', 'months', false],
		['2024-03-15', '2024-03-31', '2024-04-30', 'months', true],
		['2023-12-31', '2024-01-01', '2024-12-31', 'years', false],
		['2024-12-25', '2024-01-01', '2024-06-01', 'years', true],
		['2024-01-14 23:00:00', '2024-01-15 00:00:00', '2024-01-15 23:59:59', 'days', false],
		['2024-01-15 02:00:00', '2024-01-15 04:00:00', '2024-01-15 23:00:00', 'days', true],
		['2024-01-13 10:00:00', '2024-01-14 00:00:00', '2024-01-20 00:00:00', 'weeks', false],
		['2024-01-20 23:00:00', '2024-01-14 00:00:00', '2024-01-14 00:00:00', 'weeks', true],
	])('%s in [%s, %s] by %s -> %s', (date, start, end, unit, expected) => {
		expect(new kk_date(date).isBetween(start, end, unit)).toBe(expected);
	});

	test('hours follow the local clock in half-hour zones', () => {
		kk_date.config({ timezone: 'Asia/Kolkata' });
		// 10:15 and 10:45 local are the same hour, although they fall in different UTC hours
		expect(new kk_date('2024-01-15 10:15:00').isBetween('2024-01-15 10:45:00', '2024-01-15 10:50:00', 'hours')).toBe(true);
		expect(new kk_date('2024-01-15 09:59:00').isBetween('2024-01-15 10:45:00', '2024-01-15 10:50:00', 'hours')).toBe(false);
	});

	test('an invalid instance throws like the other comparisons', () => {
		const invalid = new kk_date('2024-01-01');
		invalid.set('years', Number.NaN);
		expect(() => invalid.isBetween('2024-01-01', '2024-12-31')).toThrow('Invalid Date');
		expect(() => invalid.isBetween('2024-01-01', '2024-12-31', 'days')).toThrow('Invalid Date');
	});
});

describe('add() amounts', () => {
	beforeEach(() => {
		kk_date.config({ timezone: 'UTC' });
	});

	test('elapsed units take fractions exactly', () => {
		expect(new kk_date('2024-01-15 10:00:00').add(1.5, 'hours').format('HH:mm')).toBe('11:30');
		expect(new kk_date('2024-01-15 10:00:00').add(2.5, 'minutes').format('HH:mm:ss')).toBe('10:02:30');
		expect(new kk_date('2024-01-15 10:00:00').add(0.25, 'seconds').format('ss.SSS')).toBe('00.250');
		expect(new kk_date('2024-01-15 10:00:00').add(-1.5, 'hours').format('HH:mm')).toBe('08:30');
	});

	test('calendar units round half away from zero like moment (weeks/years via days/months)', () => {
		expect(new kk_date('2024-01-15').add(1.5, 'days').format('YYYY-MM-DD')).toBe('2024-01-17');
		expect(new kk_date('2024-01-15').add(0.4, 'days').format('YYYY-MM-DD')).toBe('2024-01-15');
		expect(new kk_date('2024-01-15').add(-1.5, 'days').format('YYYY-MM-DD')).toBe('2024-01-13');
		expect(new kk_date('2024-01-15').add(1.5, 'months').format('YYYY-MM-DD')).toBe('2024-03-15');
		expect(new kk_date('2024-01-15').add(1.5, 'weeks').format('YYYY-MM-DD')).toBe('2024-01-26');
		expect(new kk_date('2024-01-15').add(1.5, 'years').format('YYYY-MM-DD')).toBe('2025-07-15');
	});

	test('hours across DST are absolute (moment): +24h on the spring-forward day ends an hour later on the clock', () => {
		kk_date.config({ timezone: 'America/New_York' });
		expect(new kk_date('2024-03-09 12:00:00').add(24, 'hours').format('YYYY-MM-DD HH:mm')).toBe('2024-03-10 13:00');
		expect(new kk_date('2024-03-09 12:00:00').add(1, 'days').format('YYYY-MM-DD HH:mm')).toBe('2024-03-10 12:00');
	});

	test('a duration object adds its exact length', () => {
		expect(new kk_date('2024-01-15 10:00:00').add(kk_date.duration(90, 'minutes')).format('HH:mm')).toBe('11:30');
	});

	test('invalid amounts throw', () => {
		expect(() => new kk_date('2024-01-15').add(Number.NaN, 'days')).toThrow('amount is wrong');
		expect(() => new kk_date('2024-01-15').add('1', 'days')).toThrow('amount is wrong');
		expect(() => new kk_date('2024-01-15').add(1, 'decades')).toThrow('type is wrong');
	});
});

describe('set() clamps the day like moment', () => {
	beforeEach(() => {
		kk_date.config({ timezone: 'UTC' });
	});
	test.each([
		['2024-01-31', 'months', 1, '2024-02-29'],
		['2023-01-31', 'months', 1, '2023-02-28'],
		['2024-03-31', 'months', 3, '2024-04-30'],
		['2024-02-29', 'years', 2025, '2025-02-28'],
		['2024-01-31', 'months', 12, '2025-01-31'],
		['2024-04-15', 'days', 31, '2024-05-01'],
	])('%s set(%s, %s) -> %s', (date, unit, value, expected) => {
		expect(new kk_date(date).set(unit, value).format('YYYY-MM-DD')).toBe(expected);
	});
});

describe('fromNow() rounds like moment', () => {
	const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);
	beforeEach(() => {
		jest.useFakeTimers({ now: NOW });
		kk_date.config({ timezone: 'UTC' });
	});
	afterEach(() => {
		jest.useRealTimers();
	});
	test.each([
		[-90 * 1000, '2 minutes ago'],
		[-89 * 1000, '1 minute ago'],
		[90 * 1000, 'in 2 minutes'],
		[-36 * 3600000, '2 days ago'],
		[36 * 3600000, 'in 2 days'],
		[-45.48 * 86400000, '2 months ago'],
		[46 * 86400000, 'next month'],
		[319.5 * 86400000, 'next year'],
		[547.5 * 86400000, 'in 2 years'],
		[-10 * 1000, '10 seconds ago'],
		[0, 'now'],
	])('%s ms -> %s', (offset, expected) => {
		expect(new kk_date(NOW + offset).fromNow()).toBe(expected);
	});
});

describe('valueOfLocal() does not depend on when it is called', () => {
	afterEach(() => {
		jest.useRealTimers();
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});
	test('same instance in January and in July', () => {
		kk_date.config({ timezone: 'America/New_York' });
		const a = new kk_date('2024-01-15T12:00:00Z');
		jest.useFakeTimers({ now: Date.UTC(2025, 0, 15) });
		const january = a.valueOfLocal();
		jest.setSystemTime(Date.UTC(2025, 6, 15));
		expect(a.valueOfLocal()).toBe(january);
	});
	test('equals valueOf() while the global timezone is the system timezone', () => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
		const a = new kk_date('2024-07-15T12:00:00Z');
		expect(a.valueOfLocal()).toBe(a.valueOf());
	});
});

describe('hour periods never straddle an offset change', () => {
	const F = 'YYYY-MM-DD HH:mm:ss.SSS Z';
	test.each([
		// 1-hour fall-back: each repeated 01:xx block is its own hour (moment)
		['America/New_York', '2024-11-03T05:30:00Z', '2024-11-03 01:00:00.000 -04:00', '2024-11-03 01:59:59.999 -04:00'],
		['America/New_York', '2024-11-03T06:30:00Z', '2024-11-03 01:00:00.000 -05:00', '2024-11-03 01:59:59.999 -05:00'],
		// 30-minute fall-back (Lord Howe): the repeated half hour is its own period
		['Australia/Lord_Howe', '1990-03-03T15:00:00Z', '1990-03-04 01:30:00.000 +10:30', '1990-03-04 01:59:59.999 +10:30'],
		['Australia/Lord_Howe', '1990-03-03T14:40:00Z', '1990-03-04 01:00:00.000 +11:00', '1990-03-04 01:59:59.999 +11:00'],
		// 45-minute offsets (Chatham): the hour ends at the transition
		['Pacific/Chatham', '1990-03-17T13:30:00Z', '1990-03-18 03:00:00.000 +13:45', '1990-03-18 03:44:59.999 +13:45'],
		// a transition at 00:01 (St. John's 1987): the hour starts at the jump
		['America/St_Johns', '1987-04-05T03:35:13Z', '1987-04-05 01:01:00.000 -02:30', '1987-04-05 01:59:59.999 -02:30'],
		['Asia/Kolkata', '2024-01-15T05:10:00Z', '2024-01-15 10:00:00.000 +05:30', '2024-01-15 10:59:59.999 +05:30'],
	])('%s %s', (zone, instant, start, end) => {
		const x = new kk_date(instant).tz(zone);
		const s = new kk_date(instant).tz(zone).startOf('hours');
		const e = new kk_date(instant).tz(zone).endOf('hours');
		expect(s.format(F)).toBe(start);
		expect(e.format(F)).toBe(end);
		expect(s.getTime()).toBeLessThanOrEqual(x.getTime());
		expect(e.getTime()).toBeGreaterThanOrEqual(x.getTime());
	});
});

describe('historical local mean time (offsets with seconds)', () => {
	afterEach(() => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});
	test('arithmetic and display agree (Istanbul 1869: +01:55:52)', () => {
		const viaTz = new kk_date('2000-05-21T02:19:18.977Z').tz('Europe/Istanbul').add(-131, 'years');
		expect(viaTz.format('YYYY-MM-DD HH:mm:ss.SSS Z')).toBe('1869-05-21 05:19:18.977 +01:55');
		kk_date.config({ timezone: 'Europe/Istanbul' });
		const viaGlobal = new kk_date('2000-05-21T02:19:18.977Z').add(-131, 'years');
		expect(viaGlobal.format('YYYY-MM-DD HH:mm:ss.SSS Z')).toBe('1869-05-21 05:19:18.977 +01:55');
		expect(kk_date.getTimezoneOffset('Europe/Istanbul', new Date(Date.UTC(1869, 4, 21, 3, 23)))).toBe((1 * 3600 + 55 * 60 + 52) * 1000);
	});
});
