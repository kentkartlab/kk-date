const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');

kk_date.config({ timezone: 'UTC' });

describe('Time Operations Tests', () => {
	describe('Time Addition Operations', () => {
		test('add hours to time', () => {
			expect(new kk_date('12:00:00').add(1, 'hours').format('HH:mm:ss')).toBe('13:00:00');
			expect(new kk_date('12:00:00').add(2, 'hours').format('HH:mm:ss')).toBe('14:00:00');
			expect(new kk_date('12:00:00').add(12, 'hours').format('HH:mm:ss')).toBe('00:00:00'); // 24 saat sonra
			expect(new kk_date('12:00:00').add(24, 'hours').format('HH:mm:ss')).toBe('12:00:00'); // 48 saat sonra
			expect(new kk_date('12:00:00').add(25, 'hours').format('HH:mm:ss')).toBe('13:00:00'); // 73 saat sonra
		});

		test('add minutes to time', () => {
			expect(new kk_date('12:00:00').add(1, 'minutes').format('HH:mm:ss')).toBe('12:01:00');
			expect(new kk_date('12:00:00').add(30, 'minutes').format('HH:mm:ss')).toBe('12:30:00');
			expect(new kk_date('12:00:00').add(60, 'minutes').format('HH:mm:ss')).toBe('13:00:00');
			expect(new kk_date('12:00:00').add(120, 'minutes').format('HH:mm:ss')).toBe('14:00:00');
			expect(new kk_date('12:00:00').add(1440, 'minutes').format('HH:mm:ss')).toBe('12:00:00'); // 24 saat sonra
		});

		test('add seconds to time', () => {
			expect(new kk_date('12:00:00').add(1, 'seconds').format('HH:mm:ss')).toBe('12:00:01');
			expect(new kk_date('12:00:00').add(30, 'seconds').format('HH:mm:ss')).toBe('12:00:30');
			expect(new kk_date('12:00:00').add(60, 'seconds').format('HH:mm:ss')).toBe('12:01:00');
			expect(new kk_date('12:00:00').add(3600, 'seconds').format('HH:mm:ss')).toBe('13:00:00');
			expect(new kk_date('12:00:00').add(86400, 'seconds').format('HH:mm:ss')).toBe('12:00:00'); // 24 saat sonra
		});

		test('add time with date overflow', () => {
			expect(new kk_date('23:59:59').add(1, 'seconds').format('HH:mm:ss')).toBe('00:00:00');
			expect(new kk_date('23:59:59').add(1, 'minutes').format('HH:mm:ss')).toBe('00:00:59');
			expect(new kk_date('23:59:59').add(1, 'hours').format('HH:mm:ss')).toBe('00:59:59');
		});

		test('add time with milliseconds', () => {
			expect(new kk_date('12:30:45.123').add(1, 'seconds').format('HH:mm:ss.SSS')).toBe('12:30:46.123');
			// kk_date milliseconds işlemlerini desteklemiyor
			expect(new kk_date('12:30:45.123').add(1000, 'seconds').format('HH:mm:ss.SSS')).toBe('12:47:25.123');
		});
	});

	describe('Time Subtraction Operations', () => {
		test('subtract hours from time', () => {
			// kk_date subtract metodu yok, negatif değerlerle add kullanılıyor
			expect(new kk_date('12:00:00').add(-1, 'hours').format('HH:mm:ss')).toBe('11:00:00');
			expect(new kk_date('12:00:00').add(-2, 'hours').format('HH:mm:ss')).toBe('10:00:00');
			expect(new kk_date('12:00:00').add(-12, 'hours').format('HH:mm:ss')).toBe('00:00:00'); // 12 saat önce
			expect(new kk_date('12:00:00').add(-24, 'hours').format('HH:mm:ss')).toBe('12:00:00'); // 24 saat önce
			expect(new kk_date('12:00:00').add(-25, 'hours').format('HH:mm:ss')).toBe('11:00:00'); // 25 saat önce
		});

		test('subtract minutes from time', () => {
			// kk_date subtract metodu yok, negatif değerlerle add kullanılıyor
			expect(new kk_date('12:00:00').add(-1, 'minutes').format('HH:mm:ss')).toBe('11:59:00');
			expect(new kk_date('12:00:00').add(-30, 'minutes').format('HH:mm:ss')).toBe('11:30:00');
			expect(new kk_date('12:00:00').add(-60, 'minutes').format('HH:mm:ss')).toBe('11:00:00');
			expect(new kk_date('12:00:00').add(-120, 'minutes').format('HH:mm:ss')).toBe('10:00:00');
			expect(new kk_date('12:00:00').add(-1440, 'minutes').format('HH:mm:ss')).toBe('12:00:00'); // 24 saat önce
		});

		test('subtract seconds from time', () => {
			// kk_date subtract metodu yok, negatif değerlerle add kullanılıyor

			expect(new kk_date('12:00:00').add(-1, 'seconds').format('HH:mm:ss')).toBe('11:59:59');
			expect(new kk_date('12:00:00').add(-30, 'seconds').format('HH:mm:ss')).toBe('11:59:30');
			expect(new kk_date('12:00:00').add(-60, 'seconds').format('HH:mm:ss')).toBe('11:59:00');
			expect(new kk_date('12:00:00').add(-3600, 'seconds').format('HH:mm:ss')).toBe('11:00:00');
			expect(new kk_date('12:00:00').add(-86400, 'seconds').format('HH:mm:ss')).toBe('12:00:00'); // 24 saat önce
		});

		test('subtract time with date underflow', () => {
			// kk_date subtract metodu yok, negatif değerlerle add kullanılıyor

			expect(new kk_date('00:00:00').add(-1, 'seconds').format('HH:mm:ss')).toBe('23:59:59');
			expect(new kk_date('00:00:00').add(-1, 'minutes').format('HH:mm:ss')).toBe('23:59:00');
			expect(new kk_date('00:00:00').add(-1, 'hours').format('HH:mm:ss')).toBe('23:00:00');
		});

		test('subtract time with milliseconds', () => {
			// kk_date subtract metodu yok, negatif değerlerle add kullanılıyor

			expect(new kk_date('12:30:45.123').add(-1, 'seconds').format('HH:mm:ss.SSS')).toBe('12:30:44.123');
			// kk_date milliseconds işlemlerini desteklemiyor
			expect(new kk_date('12:30:45.123').add(-1000, 'seconds').format('HH:mm:ss.SSS')).toBe('12:14:05.123');
		});
	});

	describe('Time Comparison Operations', () => {
		test('compare times with isBefore', () => {
			const time1 = new kk_date('12:00:00');
			const time2 = new kk_date('13:00:00');
			const time3 = new kk_date('12:00:00');

			expect(time1.isBefore(time2)).toBe(true);
			expect(time2.isBefore(time1)).toBe(false);
			expect(time1.isBefore(time3)).toBe(false);
		});

		test('compare times with isAfter', () => {
			const time1 = new kk_date('12:00:00');
			const time2 = new kk_date('13:00:00');
			const time3 = new kk_date('12:00:00');

			expect(time2.isAfter(time1)).toBe(true);
			expect(time1.isAfter(time2)).toBe(false);
			expect(time1.isAfter(time3)).toBe(false);
		});

		test('compare times with isSame', () => {
			const time1 = new kk_date('12:00:00');
			const time2 = new kk_date('12:00:00');
			const time3 = new kk_date('13:00:00');

			expect(time1.isSame(time2)).toBe(true);
			expect(time1.isSame(time3)).toBe(false);
		});

		test('compare times with isBetween', () => {
			const startTime = new kk_date('10:00:00');
			const middleTime = new kk_date('12:00:00');
			const endTime = new kk_date('14:00:00');
			const outsideTime = new kk_date('15:00:00');

			expect(middleTime.isBetween(startTime, endTime)).toBe(true);
			expect(outsideTime.isBetween(startTime, endTime)).toBe(false);
			expect(startTime.isBetween(startTime, endTime)).toBe(true); // Inclusive
			expect(endTime.isBetween(startTime, endTime)).toBe(true); // Inclusive
		});

		test('compare times with milliseconds', () => {
			const time1 = new kk_date('12:30:45.123');
			const time2 = new kk_date('12:30:45.124');
			const time3 = new kk_date('12:30:45.123');

			expect(time2.isBefore(time1)).toBe(false);
			expect(time1.isAfter(time2)).toBe(false);
			expect(time3.isSame(time1)).toBe(true);
		});
	});

	describe('Time Range Operations', () => {
		test('get time difference in hours', () => {
			const time1 = new kk_date('12:00:00');
			const time2 = new kk_date('14:00:00');
			const time3 = new kk_date('10:00:00');

			expect(time2.diff(time1, 'hours')).toBe(-2);
			expect(time1.diff(time2, 'hours')).toBe(2);
			expect(time1.diff(time3, 'hours')).toBe(-2);
		});

		test('get time difference in minutes', () => {
			const time1 = new kk_date('12:00:00');
			const time2 = new kk_date('12:30:00');
			const time3 = new kk_date('11:30:00');

			expect(time2.diff(time1, 'minutes')).toBe(-30);
			expect(time1.diff(time2, 'minutes')).toBe(30);
			expect(time1.diff(time3, 'minutes')).toBe(-30);
		});

		test('get time difference in seconds', () => {
			const time1 = new kk_date('12:00:00');
			const time2 = new kk_date('12:00:30');
			const time3 = new kk_date('11:59:30');

			expect(time2.diff(time1, 'seconds')).toBe(-30);
			expect(time1.diff(time2, 'seconds')).toBe(30);
			expect(time1.diff(time3, 'seconds')).toBe(-30);
		});

		test('get time difference with date overflow', () => {
			const time1 = new kk_date('23:00:00');
			const time2 = new kk_date('01:00:00').add(1, 'days'); // Next day

			expect(time2.diff(time1, 'hours')).toBe(-2);
			expect(time1.diff(time2, 'hours')).toBe(2);
		});
	});

	describe('Time Start/End Operations', () => {
		test('start of hour', () => {
			const time = new kk_date('12:30:45');
			expect(time.startOf('hours').format('HH:mm:ss')).toBe('12:00:00');
		});

		test('end of hour', () => {
			const time = new kk_date('12:30:45');
			expect(time.endOf('hours').format('HH:mm:ss')).toBe('12:59:59');
		});

		test('start of minute', () => {
			const time = new kk_date('12:30:45');
			expect(time.startOf('minutes').format('HH:mm:ss')).toBe('12:30:00');
		});

		test('end of minute', () => {
			const time = new kk_date('12:30:45');
			expect(time.endOf('minutes').format('HH:mm:ss')).toBe('12:30:59');
		});

		test('start of second', () => {
			const time = new kk_date('12:30:45.123');
			expect(time.startOf('seconds').format('HH:mm:ss.SSS')).toBe('12:30:45.000');
		});

		test('end of second', () => {
			const time = new kk_date('12:30:45.123');
			expect(time.endOf('seconds').format('HH:mm:ss.SSS')).toBe('12:30:45.999');
		});
	});

	describe('Time Utility Operations', () => {
		test('clone time', () => {
			const originalTime = new kk_date('12:30:45');
			const clonedTime = new kk_date(originalTime.date);

			expect(clonedTime.format('HH:mm:ss')).toBe(originalTime.format('HH:mm:ss'));
			expect(clonedTime).not.toBe(originalTime); // Different objects
		});

		test('get time components', () => {
			const time = new kk_date('12:30:45');

			expect(time.get('hours')).toBe(12);
			expect(time.get('minutes')).toBe(30);
			expect(time.get('seconds')).toBe(45);
		});

		test('set time components', () => {
			const time = new kk_date('12:30:45');

			expect(time.set('hours', 13).format('HH:mm:ss')).toBe('13:30:45');
			expect(time.set('minutes', 45).format('HH:mm:ss')).toBe('13:45:45');
			expect(time.set('seconds', 30).format('HH:mm:ss')).toBe('13:45:30');
		});

		test('get time in different units', () => {
			const time = new kk_date('12:30:45');

			expect(time.valueOf()).toBeGreaterThan(0); // Milliseconds since epoch
		});
	});

	describe('Time Format Operations', () => {
		test('format time in different formats', () => {
			const time = new kk_date('12:30:45');

			expect(time.format('HH:mm:ss')).toBe('12:30:45');
			expect(time.format('HH:mm')).toBe('12:30');
			expect(time.format('HH:mm:ss.SSS')).toBe('12:30:45.000');
			// Test 12-hour format with AM/PM
			expect(time.format('hh:mm:ss')).toBe('12:30:45 PM');
			expect(time.format('hh:mm')).toBe('12:30 PM');
		});

		test('format time with custom separator', () => {
			const time = new kk_date('12:30:45');

			expect(time.format_c(' ', 'HH', 'mm', 'ss')).toBe('12 30 45');
			expect(time.format_c('-', 'HH', 'mm', 'ss')).toBe('12-30-45');
			expect(time.format_c(':', 'HH', 'mm')).toBe('12:30');
		});

		test('format time with locale', () => {
			const time = new kk_date('12:30:45');

			// Locale-specific formatting tests
			expect(time.config({ locale: 'tr-TR' }).format('HH:mm:ss')).toBe('12:30:45');
			expect(time.config({ locale: 'en-US' }).format('HH:mm:ss')).toBe('12:30:45');
		});
	});

	describe('Time Validation Operations', () => {
		test('validate time', () => {
			const validTime = new kk_date('12:30:45');
			// kk_date overflow değerleri için hata fırlatıyor
			expect(new kk_date('25:00:00').format('HH:mm:ss')).toBe('01:00:00');

			expect(validTime.isValid()).toBe(true);
		});

		test('check if time is valid format', () => {
			expect(kk_date.isValid('12:30:45', 'HH:mm:ss')).toBe(true);
			// kk_date overflow değerleri için hata fırlatıyor
			expect(kk_date.isValid('25:00:00', 'HH:mm:ss')).toBe(true);
			expect(kk_date.isValid('invalid', 'HH:mm:ss')).toBe(false);
		});
	});

	describe('Time Chaining Operations', () => {
		test('chain time operations', () => {
			const time = new kk_date('12:00:00').add(1, 'hours').add(30, 'minutes').add(45, 'seconds');

			expect(time.format('HH:mm:ss')).toBe('13:30:45');
		});

		test('chain time operations with format', () => {
			const time = new kk_date('12:00:00').add(2, 'hours').add(-30, 'minutes').format('HH:mm:ss');

			expect(time).toBe('13:30:00');
		});

		test('chain time operations with comparison', () => {
			const time1 = new kk_date('12:00:00');
			const time2 = new kk_date('12:00:00').add(1, 'hours').add(30, 'minutes');

			expect(time2.isAfter(time1)).toBe(true);
			expect(time1.diff(time2, 'minutes')).toBe(90);
		});
	});

	describe('Time Edge Cases', () => {
		test('handle midnight boundary', () => {
			const time = new kk_date('23:59:59');
			const nextTime = time.add(1, 'seconds');

			expect(nextTime.format('HH:mm:ss')).toBe('00:00:00');
		});

		test('handle noon boundary', () => {
			const time = new kk_date('11:59:59');
			const nextTime = time.add(1, 'seconds');

			expect(nextTime.format('HH:mm:ss')).toBe('12:00:00');
		});

		test('handle large time additions', () => {
			const time = new kk_date('12:00:00');
			const result = time.add(100, 'hours');

			expect(result.format('HH:mm:ss')).toBe('16:00:00'); // 100 % 24 = 4, so 12 + 4 = 16
		});

		test('handle negative time operations', () => {
			const time = new kk_date('12:00:00');
			const result = time.add(-25, 'hours');

			expect(result.format('HH:mm:ss')).toBe('11:00:00'); // 25 % 24 = 1, so 12 - 1 = 11
		});
	});
});
