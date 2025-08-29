const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');

describe('User Timezone Conversion Scenarios', () => {
	// Test 1: ABD (New York, EDT / UTC−4) 06:00 → Malezya (Kuala Lumpur, UTC+8) = 18:00
	test('ABD New York 06:00 → Malezya Kuala Lumpur 18:00', () => {
		// New York EDT 06:00 = UTC 10:00, Malaysia UTC+8 = 18:00
		const nyTime = new kk_date('2024-08-23T10:00:00.000Z').tz('America/New_York'); // 06:00 EDT
		const malaysiaTime = new kk_date('2024-08-23T10:00:00.000Z').tz('Asia/Kuala_Lumpur'); // 18:00 MYT

		expect(nyTime.format('HH:mm')).toBe('06:00');
		expect(malaysiaTime.format('HH:mm')).toBe('18:00');
	});

	// Test 2: İngiltere (Londra, BST / UTC+1) 01:00 → Türkiye (İstanbul, UTC+3) = 03:00
	test('İngiltere Londra 01:00 → Türkiye İstanbul 03:00', () => {
		// London BST 01:00 = UTC 00:00, Turkey UTC+3 = 03:00
		const londonTime = new kk_date('2024-08-23T00:00:00.000Z').tz('Europe/London'); // 01:00 BST
		const turkeyTime = new kk_date('2024-08-23T00:00:00.000Z').tz('Europe/Istanbul'); // 03:00 TRT

		expect(londonTime.format('HH:mm')).toBe('01:00');
		expect(turkeyTime.format('HH:mm')).toBe('03:00');
	});

	// Test 3: ABD (Los Angeles, PDT / UTC−7) 21:30 → Türkiye (İstanbul) = 07:30 (next day)
	test('ABD Los Angeles 21:30 → Türkiye İstanbul 07:30 (gün değişir)', () => {
		// LA PDT 21:30 = UTC 04:30 (next day), Turkey UTC+3 = 07:30 (next day)
		const laTime = new kk_date('2024-08-24T04:30:00.000Z').tz('America/Los_Angeles'); // 21:30 PDT (23rd)
		const turkeyTime = new kk_date('2024-08-24T04:30:00.000Z').tz('Europe/Istanbul'); // 07:30 TRT (24th)

		expect(`${laTime.format('YYYY-MM-DD')} ${laTime.format('HH:mm')}`).toBe('2024-08-23 21:30');
		expect(`${turkeyTime.format('YYYY-MM-DD')} ${turkeyTime.format('HH:mm')}`).toBe('2024-08-24 07:30');
	});

	// Test 4: Türkiye (İstanbul, UTC+3) 14:00 → ABD (New York, EDT / UTC−4) = 07:00
	test('Türkiye İstanbul 14:00 → ABD New York 07:00', () => {
		// Turkey 14:00 = UTC 11:00, NY EDT UTC-4 = 07:00
		const turkeyTime = new kk_date('2024-08-23T11:00:00.000Z').tz('Europe/Istanbul'); // 14:00 TRT
		const nyTime = new kk_date('2024-08-23T11:00:00.000Z').tz('America/New_York'); // 07:00 EDT

		expect(turkeyTime.format('HH:mm')).toBe('14:00');
		expect(nyTime.format('HH:mm')).toBe('07:00');
	});

	// Test 5: Malezya (Kuala Lumpur, UTC+8) 09:00 → İngiltere (Londra, BST / UTC+1) = 02:00
	test('Malezya Kuala Lumpur 09:00 → İngiltere Londra 02:00', () => {
		// Malaysia 09:00 = UTC 01:00, London BST UTC+1 = 02:00
		const malaysiaTime = new kk_date('2024-08-23T01:00:00.000Z').tz('Asia/Kuala_Lumpur'); // 09:00 MYT
		const londonTime = new kk_date('2024-08-23T01:00:00.000Z').tz('Europe/London'); // 02:00 BST

		expect(malaysiaTime.format('HH:mm')).toBe('09:00');
		expect(londonTime.format('HH:mm')).toBe('02:00');
	});

	// Additional validation tests to ensure all conversions are working
	test('Timezone offset validation', () => {
		const testDate = new kk_date('2024-08-23T12:00:00.000Z');

		// Test timezone offsets
		const nyInfo = testDate.tz('America/New_York').getTimezoneInfo();
		const malayInfo = testDate.tz('Asia/Kuala_Lumpur').getTimezoneInfo();
		const londonInfo = testDate.tz('Europe/London').getTimezoneInfo();
		const turkeyInfo = testDate.tz('Europe/Istanbul').getTimezoneInfo();

		expect(nyInfo.offset / (60 * 60 * 1000)).toBe(-4); // EDT
		expect(malayInfo.offset / (60 * 60 * 1000)).toBe(8); // MYT
		expect(londonInfo.offset / (60 * 60 * 1000)).toBe(1); // BST
		expect(turkeyInfo.offset / (60 * 60 * 1000)).toBe(3); // TRT
	});
});
