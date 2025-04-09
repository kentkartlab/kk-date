const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');

describe('kk_date add', () => {
	test('should not jump month', () => {
		expect(new kk_date('2025-01-31').add(1, 'months').format('YYYY-MM-DD')).toBe('2025-02-28');
		expect(new kk_date('2023-01-31').add(1, 'months').format('YYYY-MM-DD')).toBe('2023-02-28');
		expect(new kk_date('2024-03-31').add(1, 'months').format('YYYY-MM-DD')).toBe('2024-04-30');
		expect(new kk_date('2024-01-15').add(1, 'months').format('YYYY-MM-DD')).toBe('2024-02-15');
	});
});

describe('Comprehensive Time Tests', () => {
	describe('Hour Tests', () => {
		test('should handle all hours of the day', () => {
			const hours = Array.from({ length: 24 }, (_, i) => i);
			for (const hour of hours) {
				const paddedHour = hour.toString().padStart(2, '0');
				const date = new kk_date(`2024-01-01 ${paddedHour}:00:00`);
				expect(date.format('HH')).toBe(paddedHour);
			}
		});

		test('should handle hour transitions', () => {
			const testCases = [
				{ input: '23:59:59', add: 1, expected: '00:59:59' },
				{ input: '00:00:00', add: -1, expected: '23:00:00' },
				{ input: '12:00:00', add: 12, expected: '00:00:00' },
				{ input: '00:00:00', add: 24, expected: '00:00:00' },
			];

			for (const { input, add, expected } of testCases) {
				expect(new kk_date(`2024-01-01 ${input}`).add(add, 'hours').format('HH:mm:ss')).toBe(expected);
			}
		});
	});
});
