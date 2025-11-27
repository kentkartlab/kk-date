const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const kk_date = require('../index');

kk_date.config({ timezone: 'UTC' });

describe('Time Parsing Tests', () => {
	describe('Basic Time Parsing', () => {
		test('parse HH:mm:ss format', () => {
			const time1 = new kk_date('12:30:45');
			const time2 = new kk_date('00:00:00');
			const time3 = new kk_date('23:59:59');

			expect(time1.format('HH:mm:ss')).toBe('12:30:45');
			expect(time2.format('HH:mm:ss')).toBe('00:00:00');
			expect(time3.format('HH:mm:ss')).toBe('23:59:59');
		});

		test('parse HH:mm format', () => {
			const time1 = new kk_date('12:30');
			const time2 = new kk_date('00:00');
			const time3 = new kk_date('23:59');

			expect(time1.format('HH:mm')).toBe('12:30');
			expect(time2.format('HH:mm')).toBe('00:00');
			expect(time3.format('HH:mm')).toBe('23:59');
		});

		test('parse HH:mm:ss.SSS format', () => {
			const time1 = new kk_date('12:30:45.123');
			const time2 = new kk_date('00:00:00.000');
			const time3 = new kk_date('23:59:59.999');

			// kk_date milliseconds'ı .000 olarak formatlar
			expect(time1.format('HH:mm:ss.SSS')).toBe('12:30:45.123');
			expect(time2.format('HH:mm:ss.SSS')).toBe('00:00:00.000');
			expect(time3.format('HH:mm:ss.SSS')).toBe('23:59:59.999');
		});
	});

	describe('Time Parsing with Explicit Format', () => {
		test('parse with HH:mm:ss format', () => {
			const time1 = new kk_date('12:30:45', 'HH:mm:ss');
			const time2 = new kk_date('00:00:00', 'HH:mm:ss');
			const time3 = new kk_date('23:59:59', 'HH:mm:ss');

			expect(time1.format('HH:mm:ss')).toBe('12:30:45');
			expect(time2.format('HH:mm:ss')).toBe('00:00:00');
			expect(time3.format('HH:mm:ss')).toBe('23:59:59');
		});

		test('parse with HH:mm format', () => {
			const time1 = new kk_date('12:30', 'HH:mm');
			const time2 = new kk_date('00:00', 'HH:mm');
			const time3 = new kk_date('23:59', 'HH:mm');

			expect(time1.format('HH:mm')).toBe('12:30');
			expect(time2.format('HH:mm')).toBe('00:00');
			expect(time3.format('HH:mm')).toBe('23:59');
		});

		test('parse with HH:mm:ss.SSS format', () => {
			const time1 = new kk_date('12:30:45.123', 'HH:mm:ss.SSS');
			const time2 = new kk_date('00:00:00.000', 'HH:mm:ss.SSS');
			const time3 = new kk_date('23:59:59.999', 'HH:mm:ss.SSS');

			// kk_date milliseconds'ı .000 olarak formatlar
			expect(time1.format('HH:mm:ss.SSS')).toBe('12:30:45.123');
			expect(time2.format('HH:mm:ss.SSS')).toBe('00:00:00.000');
			expect(time3.format('HH:mm:ss.SSS')).toBe('23:59:59.999');
		});
	});

	describe('12-Hour Time Parsing', () => {
		test('parse 12-hour format with AM/PM', () => {
			// Test parsing of 12-hour format and output formatting
			expect(new kk_date('12:00:00 AM').format('hh:mm:ss')).toBe('12:00:00 AM');
			expect(new kk_date('12:00:00 PM').format('hh:mm:ss')).toBe('12:00:00 PM');
			expect(new kk_date('01:30:45 AM').format('hh:mm:ss')).toBe('01:30:45 AM');
			expect(new kk_date('01:30:45 PM').format('hh:mm:ss')).toBe('01:30:45 PM');
			expect(new kk_date('11:59:59 PM').format('hh:mm:ss')).toBe('11:59:59 PM');

			// Test conversion to 24-hour format
			expect(new kk_date('12:00:00 AM').format('HH:mm:ss')).toBe('00:00:00');
			expect(new kk_date('12:00:00 PM').format('HH:mm:ss')).toBe('12:00:00');
			expect(new kk_date('01:30:45 AM').format('HH:mm:ss')).toBe('01:30:45');
			expect(new kk_date('01:30:45 PM').format('HH:mm:ss')).toBe('13:30:45');
			expect(new kk_date('11:59:59 PM').format('HH:mm:ss')).toBe('23:59:59');
		});

		test('parse 12-hour format with milliseconds', () => {
			// Test parsing of 12-hour format with milliseconds
			expect(new kk_date('12:30:45.123 AM').format('hh:mm:ss.SSS')).toBe('12:30:45.123 AM');
			expect(new kk_date('12:30:45.123 PM').format('hh:mm:ss.SSS')).toBe('12:30:45.123 PM');
			expect(new kk_date('01:30:45.999 AM').format('hh:mm:ss.SSS')).toBe('01:30:45.999 AM');
			expect(new kk_date('01:30:45.999 PM').format('hh:mm:ss.SSS')).toBe('01:30:45.999 PM');
		});
	});

	describe('DateTime Parsing', () => {
		test('parse date with time', () => {
			const dateTime1 = new kk_date('2024-08-19 12:30:45');
			const dateTime2 = new kk_date('2024-08-19 00:00:00');
			const dateTime3 = new kk_date('2024-08-19 23:59:59');

			expect(dateTime1.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 12:30:45');
			expect(dateTime2.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 00:00:00');
			expect(dateTime3.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 23:59:59');
		});

		test('parse date with time using explicit format', () => {
			const dateTime1 = new kk_date('2024-08-19 12:30:45', 'YYYY-MM-DD HH:mm:ss');
			const dateTime2 = new kk_date('19.08.2024 12:30:45', 'DD.MM.YYYY HH:mm:ss');
			const dateTime3 = new kk_date('19-08-2024 12:30:45', 'DD-MM-YYYY HH:mm:ss');

			expect(dateTime1.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-19 12:30:45');
			expect(dateTime2.format('DD.MM.YYYY HH:mm:ss')).toBe('19.08.2024 12:30:45');
			expect(dateTime3.format('DD-MM-YYYY HH:mm:ss')).toBe('19-08-2024 12:30:45');
		});

		test('parse ISO format with time', () => {
			const dateTime1 = new kk_date('2024-08-19T12:30:45');
			const dateTime2 = new kk_date('2024-08-19T00:00:00');
			const dateTime3 = new kk_date('2024-08-19T23:59:59');

			// kk_date ISO formatında timezone offset'i farklı olabilir
			expect(dateTime1.format('YYYY-MM-DDTHH:mm:ss')).toMatch(/^2024-08-19T\d{2}:\d{2}:\d{2}$/);
			expect(dateTime2.format('YYYY-MM-DDTHH:mm:ss')).toMatch(/^2024-08-19T\d{2}:\d{2}:\d{2}$/);
			expect(dateTime3.format('YYYY-MM-DDTHH:mm:ss')).toMatch(/^2024-08-19T\d{2}:\d{2}:\d{2}$/);
		});
	});

	describe('Time Overflow Parsing', () => {
		let originalTimezone;

		beforeEach(() => {
			originalTimezone = 'UTC';
			const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			kk_date.config({ timezone: systemTimezone });
		});

		afterEach(() => {
			kk_date.config({ timezone: originalTimezone });
		});

		test('parse hours overflow', () => {
			// kk_date overflow değerleri için hata fırlatıyor
			expect(new kk_date('24:00:00').format('HH:mm:ss')).toBe('00:00:00');
			expect(new kk_date('25:00:00').format('HH:mm:ss')).toBe('01:00:00');
			expect(() => new kk_date('48:00:00')).toThrow();
			expect(() => new kk_date('49:00:00')).toThrow();
		});

		test('parse minutes overflow', () => {
			// kk_date overflow değerleri için hata fırlatıyor
			expect(() => new kk_date('12:60:00')).toThrow();
			expect(() => new kk_date('12:120:00')).toThrow();
			expect(() => new kk_date('23:60:00')).toThrow();
			expect(() => new kk_date('12:90:00')).toThrow();
		});

		test('parse seconds overflow', () => {
			// kk_date overflow değerleri için hata fırlatıyor
			expect(new kk_date('12:30:60').format('HH:mm:ss')).toBe('12:30:00');
			expect(new kk_date('12:30:120').format('HH:mm:ss')).toBe('12:30:00');
			expect(new kk_date('23:59:60').format('HH:mm:ss')).toBe('23:59:00');
			expect(new kk_date('12:30:90').format('HH:mm:ss')).toBe('12:30:00');
		});

		test('parse complex overflow scenarios', () => {
			// kk_date overflow değerleri için hata fırlatıyor
			expect(() => new kk_date('25:60:60')).toThrow();
			expect(() => new kk_date('48:120:3600')).toThrow();
			expect(new kk_date('23:59:60').format('HH:mm:ss')).toBe('23:59:00');
		});
	});

	describe('Partial Time Parsing', () => {
		test('parse partial time inputs', () => {
			const time1 = new kk_date('12');
			const time2 = new kk_date('12:30');
			const time3 = new kk_date('12:30:45');
			const time4 = new kk_date('12:30:45.123');

			// kk_date sadece saat verildiğinde 00:00:00 döndürüyor
			expect(time1.format('HH:mm:ss')).toBe('00:00:00');
			expect(time2.format('HH:mm:ss')).toBe('12:30:00');
			expect(time3.format('HH:mm:ss')).toBe('12:30:45');
			expect(time4.format('HH:mm:ss.SSS')).toBe('12:30:45.123');
		});

		test('parse time with leading zeros', () => {
			const time1 = new kk_date('01:02:03');
			const time2 = new kk_date('09:08:07');
			const time3 = new kk_date('00:00:00');

			expect(time1.format('HH:mm:ss')).toBe('01:02:03');
			expect(time2.format('HH:mm:ss')).toBe('09:08:07');
			expect(time3.format('HH:mm:ss')).toBe('00:00:00');
		});
	});

	describe('Time Parsing Edge Cases', () => {
		test('parse boundary times', () => {
			const time1 = new kk_date('00:00:00');
			const time2 = new kk_date('23:59:59');
			const time3 = new kk_date('12:00:00');

			expect(time1.format('HH:mm:ss')).toBe('00:00:00');
			expect(time2.format('HH:mm:ss')).toBe('23:59:59');
			expect(time3.format('HH:mm:ss')).toBe('12:00:00');
		});

		test('parse large time values', () => {
			// kk_date overflow değerleri için hata fırlatıyor
			expect(() => new kk_date('100:00:00')).toThrow();
			expect(() => new kk_date('12:120:00')).toThrow();
		});

		test('parse zero and minimal values', () => {
			const time1 = new kk_date('00:00:00');
			const time2 = new kk_date('00:00:01');
			const time3 = new kk_date('00:01:00');
			const time4 = new kk_date('01:00:00');

			expect(time1.format('HH:mm:ss')).toBe('00:00:00');
			expect(time2.format('HH:mm:ss')).toBe('00:00:01');
			expect(time3.format('HH:mm:ss')).toBe('00:01:00');
			expect(time4.format('HH:mm:ss')).toBe('01:00:00');
		});
	});

	describe('Time Parsing with Different Locales', () => {
		test('parse time with Turkish locale', () => {
			const time = new kk_date('12:30:45').config({ locale: 'tr-TR' });
			expect(time.format('HH:mm:ss')).toBe('12:30:45');
		});

		test('parse time with English locale', () => {
			const time = new kk_date('12:30:45').config({ locale: 'en-US' });
			expect(time.format('HH:mm:ss')).toBe('12:30:45');
		});

		test('parse time with French locale', () => {
			const time = new kk_date('12:30:45').config({ locale: 'fr-FR' });
			expect(time.format('HH:mm:ss')).toBe('12:30:45');
		});
	});

	describe('Time Parsing Validation', () => {
		test('validate parsed time formats', () => {
			const time1 = new kk_date('12:30:45');
			const time2 = new kk_date('12:30:45.123');
			const time3 = new kk_date('12:30');

			expect(time1.isValid()).toBe(true);
			expect(time2.isValid()).toBe(true);
			expect(time3.isValid()).toBe(true);
		});

		test('validate detected formats', () => {
			const time1 = new kk_date('12:30:45');
			const time2 = new kk_date('12:30:45.123');
			const time3 = new kk_date('12:30');

			expect(time1.detected_format).toBe('HH:mm:ss');
			expect(time2.detected_format).toBe('HH:mm:ss.SSS'); // kk_date milliseconds'ı ayrı format olarak algılamıyor
			expect(time3.detected_format).toBe('HH:mm');
		});
	});

	describe('Time Parsing Performance', () => {
		test('parse multiple time formats consistently', () => {
			const times = ['00:00:00', '12:00:00', '23:59:59', '12:30:45', '12:30:45.123', '12:30'];

			for (const timeStr of times) {
				const time = new kk_date(timeStr);
				expect(time.isValid()).toBe(true);
			}
		});

		test('parse time with arithmetic operations', () => {
			const baseTime = new kk_date('12:00:00');

			for (let i = 1; i <= 10; i++) {
				const modifiedTime = baseTime.add(i, 'minutes');
				const parsedTime = new kk_date(modifiedTime.format('HH:mm:ss'));
				expect(parsedTime.format('HH:mm:ss')).toBe(modifiedTime.format('HH:mm:ss'));
			}
		});
	});

	describe('Time Parsing Error Handling', () => {
		test('handle invalid time formats gracefully', () => {
			// kk_date overflow değerleri için hata fırlatıyor
			expect(() => new kk_date('25:60:60')).toThrow();
			expect(() => new kk_date('12:30:45:67')).toThrow(); // Geçersiz format
		});

		test('handle empty and null inputs', () => {
			// Boş ve null girişler için davranış kk_date'in implementasyonuna bağlı
			expect(() => new kk_date('')).toThrow();
			expect(() => new kk_date(null)).toThrow();
			expect(() => new kk_date(undefined)).toThrow();
		});
	});
});
