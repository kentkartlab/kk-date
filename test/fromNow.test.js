const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');

describe('KkDate fromNow Tests', () => {
	test('should return seconds ago', () => {
		const fewSecondsAgo = new kk_date().add(-15, 'seconds');
		expect(fewSecondsAgo.fromNow()).toMatch(/seconds ago|second ago/);
	});

	test('should return minutes ago', () => {
		const fewMinutesAgo = new kk_date().add(-5, 'minutes');
		expect(fewMinutesAgo.fromNow()).toMatch(/minutes ago|minute ago/);
	});

	test('should return an hour ago', () => {
		const anHourAgo = new kk_date().add(-1, 'hours');
		expect(anHourAgo.fromNow()).toMatch(/an hour ago|1 hour ago/);
	});

	test('should return hours ago', () => {
		const fewHoursAgo = new kk_date().add(-5, 'hours');
		expect(fewHoursAgo.fromNow()).toMatch(/hours ago/);
	});

	test('should return a day ago', () => {
		const yesterday = new kk_date().add(-1, 'days');
		expect(yesterday.fromNow()).toMatch(/a day ago|yesterday|1 day ago/);
	});

	test('should return days ago', () => {
		const fewDaysAgo = new kk_date().add(-5, 'days');
		expect(fewDaysAgo.fromNow()).toMatch(/days ago/);
	});

	test('should return a month ago', () => {
		const lastMonth = new kk_date().add(-1, 'months');
		expect(lastMonth.fromNow()).toMatch(/last month/);
	});

	test('should return months ago', () => {
		const fewMonthsAgo = new kk_date().add(-5, 'months');
		expect(fewMonthsAgo.fromNow()).toMatch(/months ago/);
	});

	test('should return a year ago', () => {
		const lastYear = new kk_date().add(-1, 'years');
		expect(lastYear.fromNow()).toMatch(/a year ago|1 year ago|last year/);
	});

	test('should return years ago', () => {
		const fewYearsAgo = new kk_date().add(-5, 'years');
		expect(fewYearsAgo.fromNow()).toMatch(/years ago/);
	});

	test('should return in seconds', () => {
		const inFewSeconds = new kk_date().add(15, 'seconds');
		expect(inFewSeconds.fromNow()).toMatch(/in .* seconds|in .* second/);
	});

	test('should return in minutes', () => {
		const inFewMinutes = new kk_date().add(5, 'minutes');
		expect(inFewMinutes.fromNow()).toMatch(/in .* minutes|in .* minute/);
	});

	test('should return in an hour', () => {
		const inAnHour = new kk_date().add(1, 'hours');
		expect(inAnHour.fromNow()).toMatch(/in an hour|in 1 hour/);
	});

	test('should return in hours', () => {
		const inFewHours = new kk_date().add(5, 'hours');
		expect(inFewHours.fromNow()).toMatch(/in .* hours/);
	});

	test('should return in a day', () => {
		const tomorrow = new kk_date().add(1, 'days');
		expect(tomorrow.fromNow()).toMatch(/in a day|tomorrow|in 1 day/);
	});

	test('should return in days', () => {
		const inFewDays = new kk_date().add(5, 'days');
		expect(inFewDays.fromNow()).toMatch(/in .* days/);
	});

	test('should return in a month', () => {
		const nextMonth = new kk_date().add(1, 'months');
		expect(nextMonth.fromNow()).toMatch(/next month/);
	});

	test('should return in months', () => {
		const inFewMonths = new kk_date().add(5, 'months');
		expect(inFewMonths.fromNow()).toMatch(/in .* months/);
	});

	test('should return in a year', () => {
		const nextYear = new kk_date().add(1, 'years');
		expect(nextYear.fromNow()).toMatch(/in a year|in 1 year|next year/);
	});

	test('should return in years', () => {
		const inFewYears = new kk_date().add(5, 'years');
		expect(inFewYears.fromNow()).toMatch(/in .* years/);
	});

	// --- Locale Tests --- //
	test('should return relative time in Turkish', () => {
		const date = new kk_date().add(-3, 'days');
		kk_date.config({ locale: 'tr-TR' });
		expect(date.fromNow()).toMatch(/gün önce/);

		const futureDate = new kk_date().add(3, 'hours');
		expect(futureDate.fromNow()).toMatch(/saat sonra/);

		kk_date.config({ locale: 'en-US' });
	});

	test('should return relative time in German using instance config', () => {
		const date = new kk_date().add(-5, 'minutes');
		expect(date.config({ locale: 'de-DE' }).fromNow()).toMatch(/Minuten/);

		const futureDate = new kk_date().add(1, 'months');
		expect(futureDate.config({ locale: 'de-DE' }).fromNow()).toMatch(/Monat|Wochen|Tagen/);
	});

	test('should default to English for unsupported/invalid locale', () => {
		const date = new kk_date().add(-10, 'seconds');
		expect(() => kk_date.config({ locale: 'absolutly-invalid-locale' })).toThrow();
		expect(date.fromNow()).toMatch(/seconds ago/);
		kk_date.config({ locale: 'en-US' });
	});
});
