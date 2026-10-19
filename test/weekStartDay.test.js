const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');

describe('weekStartDay tests for startOf and endOf', () => {
	test('should return Sunday as startOf and Saturday as endOf when weekStartDay is 0', () => {
		const date = new kk_date();
		date.config({ weekStartDay: 0 });
		expect(date.startOf('weeks').format('dddd')).toBe('Sunday');
		expect(date.endOf('weeks').format('dddd')).toBe('Saturday');
	});

	test('should return Monday as startOf and Sunday as endOf when weekStartDay is 1', () => {
		const date = new kk_date();
		date.config({ weekStartDay: 1 });
		expect(date.startOf('weeks').format('dddd')).toBe('Monday');
		expect(date.endOf('weeks').format('dddd')).toBe('Sunday');
	});

	test('should return Tuesday as startOf and Monday as endOf when weekStartDay is 2', () => {
		const date = new kk_date();
		date.config({ weekStartDay: 2 });
		expect(date.startOf('weeks').format('dddd')).toBe('Tuesday');
		expect(date.endOf('weeks').format('dddd')).toBe('Monday');
	});

	test('should return Wednesday as startOf and Tuesday as endOf when weekStartDay is 3', () => {
		const date = new kk_date();
		date.config({ weekStartDay: 3 });
		expect(date.startOf('weeks').format('dddd')).toBe('Wednesday');
		expect(date.endOf('weeks').format('dddd')).toBe('Tuesday');
	});

	test('should return Thursday as startOf and Wednesday as endOf when weekStartDay is 4', () => {
		const date = new kk_date();
		date.config({ weekStartDay: 4 });
		expect(date.startOf('weeks').format('dddd')).toBe('Thursday');
		expect(date.endOf('weeks').format('dddd')).toBe('Wednesday');
	});

	test('should return Friday as startOf and Thursday as endOf when weekStartDay is 5', () => {
		const date = new kk_date();
		date.config({ weekStartDay: 5 });
		expect(date.startOf('weeks').format('dddd')).toBe('Friday');
		expect(date.endOf('weeks').format('dddd')).toBe('Thursday');
	});

	test('should return Saturday as startOf and Friday as endOf when weekStartDay is 6', () => {
		const date = new kk_date();
		date.config({ weekStartDay: 6 });
		expect(date.startOf('weeks').format('dddd')).toBe('Saturday');
		expect(date.endOf('weeks').format('dddd')).toBe('Friday');
	});

	test('should return Sunday as startOf and Saturday as endOf when weekStartDay is a string', () => {
		const date = new kk_date();
		date.config({ weekStartDay: 'test' });
		expect(date.startOf('weeks').format('dddd')).toBe('Sunday');
		expect(date.endOf('weeks').format('dddd')).toBe('Saturday');
	});

	test('should default to Sunday as startOf and Saturday as endOf when weekStartDay is not provided', () => {
		const date = new kk_date();
		date.config({});
		expect(date.startOf('weeks').format('dddd')).toBe('Sunday');
		expect(date.endOf('weeks').format('dddd')).toBe('Saturday');
	});
	test('should throw an error when weekStartDay', () => {
		expect(() => new kk_date().config({ weekStartDay: 8 })).toThrow();
	});
	// Fixed instants (these tests used to read the current date and a random weekStartDay, so they
	// failed whenever "this week" contained a DST change in the CI zone). Ordinary weeks and weeks
	// with a 25- or 23-hour day, in several zones, for every weekStartDay.
	const SYSTEM_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
	test.each([
		['UTC', '2024-01-17T12:00:00Z'],
		['Europe/Istanbul', '2026-10-21T12:00:00Z'],
		['Europe/London', '2026-10-27T12:00:00Z'],
		['Europe/London', '2026-03-31T12:00:00Z'],
		['America/New_York', '2026-11-04T12:00:00Z'],
		['America/New_York', '2026-03-10T12:00:00Z'],
		['Asia/Beirut', '2026-10-21T12:00:00Z'],
		['Australia/Sydney', '2026-04-06T00:00:00Z'],
		['Australia/Sydney', '2026-10-06T00:00:00Z'],
	])('start and end of the week are six calendar days apart (%s, %s)', (zone, instant) => {
		try {
			kk_date.config({ timezone: zone });
			for (let weekStartDay = 0; weekStartDay < 7; weekStartDay++) {
				kk_date.config({ weekStartDay });
				const date = new kk_date(instant);
				const start = new kk_date(date.startOf('weeks'));
				expect(start.diff(new kk_date(date.endOf('weeks')), 'days')).toBe(6);
				// the week starts on the configured weekday (format 'd': 0 = Sunday)
				expect(start.format('d')).toBe(String(weekStartDay));
			}
		} finally {
			kk_date.config({ timezone: SYSTEM_TIMEZONE, weekStartDay: 0 });
		}
	});
});
