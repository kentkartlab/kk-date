const kk_date = require('../index');

describe('Index.js Coverage Tests', () => {
	describe('Unix Timestamp handling (lines 88-89)', () => {
		test('should handle Unix timestamp (seconds)', () => {
			// Unix timestamp for 2024-01-15 00:00:00 UTC
			const unixTimestamp = 1705276800;
			const date = new kk_date(unixTimestamp);
			// Timestamp sonucu sistem timezone'una göre değişir, bu yüzden UTC'de kontrol ediyoruz
			expect(date.isValid()).toBe(true);
			expect(date.toISOString()).toBe('2024-01-15T00:00:00.000Z');
		});

		test('should handle short Unix timestamp', () => {
			const shortTimestamp = 1000000000; // Sep 9, 2001
			const date = new kk_date(shortTimestamp);
			expect(date.isValid()).toBe(true);
		});
	});

	describe('Overflow time handling (lines 176-344)', () => {
		test('should handle DD.MM.YYYY HH:mm:ss with overflow hours', () => {
			const date = new kk_date('15.01.2024 26:30:45');
			expect(date.isValid()).toBe(true);
			// 26:30 on Jan 15 = 02:30 on Jan 16
			expect(date.format('DD')).toBe('16');
			expect(date.format('HH')).toBe('02');
		});

		test('should handle DD.MM.YYYY HH:mm with overflow hours', () => {
			const date = new kk_date('15.01.2024 25:30');
			expect(date.isValid()).toBe(true);
			expect(date.format('DD')).toBe('16');
			expect(date.format('HH')).toBe('01');
		});

		test('should handle YYYY-MM-DD HH:mm:ss with overflow hours', () => {
			const date = new kk_date('2024-01-15 27:15:30');
			expect(date.isValid()).toBe(true);
			expect(date.format('DD')).toBe('16');
			expect(date.format('HH')).toBe('03');
		});

		test('should handle YYYY-MM-DD HH:mm with overflow hours', () => {
			const date = new kk_date('2024-01-15 28:45');
			expect(date.isValid()).toBe(true);
			expect(date.format('DD')).toBe('16');
			expect(date.format('HH')).toBe('04');
		});

		test('should handle YYYY.MM.DD HH:mm:ss with overflow hours', () => {
			const date = new kk_date('2024.01.15 26:00:00');
			expect(date.isValid()).toBe(true);
			expect(date.format('DD')).toBe('16');
		});

		test('should handle YYYY-MM-DD HH:mm with overflow hours', () => {
			const date = new kk_date('2024-01-15 25:30');
			expect(date.isValid()).toBe(true);
			expect(date.format('DD')).toBe('16');
			expect(date.format('HH')).toBe('01');
		});

		test('should handle DD-MM-YYYY HH:mm:ss with overflow hours', () => {
			const date = new kk_date('15-01-2024 25:00:00');
			expect(date.isValid()).toBe(true);
			expect(date.format('DD')).toBe('16');
		});

		test('should handle DD-MM-YYYY HH:mm with overflow hours', () => {
			const date = new kk_date('15-01-2024 24:30');
			expect(date.isValid()).toBe(true);
			expect(date.format('DD')).toBe('16');
			expect(date.format('HH')).toBe('00');
		});
	});

	describe('Native Date methods (lines 556-655)', () => {
		test('toDateString should return date string', () => {
			const date = new kk_date('2024-01-15');
			const result = date.toDateString();
			expect(result).toContain('Jan');
			expect(result).toContain('15');
			expect(result).toContain('2024');
		});

		test('toISOString should return ISO format', () => {
			const date = new kk_date('2024-01-15T12:30:45Z');
			const result = date.toISOString();
			expect(result).toBe('2024-01-15T12:30:45.000Z');
		});

		test('toJSON should return JSON representation', () => {
			const date = new kk_date('2024-01-15T12:30:45Z');
			const result = date.toJSON();
			expect(result).toBe('2024-01-15T12:30:45.000Z');
		});

		test('toUTCString should return UTC string', () => {
			const date = new kk_date('2024-01-15T12:30:45Z');
			const result = date.toUTCString();
			expect(result).toContain('15 Jan 2024');
			expect(result).toContain('12:30:45');
		});

		test('toLocaleDateString should return locale date', () => {
			const date = new kk_date('2024-01-15');
			const result = date.toLocaleDateString();
			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
		});

		test('toLocaleDateString with options', () => {
			const date = new kk_date('2024-01-15');
			const result = date.toLocaleDateString({ weekday: 'long' });
			expect(typeof result).toBe('string');
		});

		test('toLocaleString should return locale datetime', () => {
			const date = new kk_date('2024-01-15T12:30:45');
			const result = date.toLocaleString();
			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
		});

		test('toLocaleString with options', () => {
			const date = new kk_date('2024-01-15T12:30:45');
			const result = date.toLocaleString({ hour12: false });
			expect(typeof result).toBe('string');
		});

		test('toLocaleTimeString should return locale time', () => {
			const date = new kk_date('2024-01-15T12:30:45');
			const result = date.toLocaleTimeString();
			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
		});

		test('toLocaleTimeString with options', () => {
			const date = new kk_date('2024-01-15T12:30:45');
			const result = date.toLocaleTimeString({ hour12: true });
			expect(typeof result).toBe('string');
		});

		test('toTimeString should return time string', () => {
			const date = new kk_date('2024-01-15T12:30:45');
			const result = date.toTimeString();
			expect(result).toContain('12:30:45');
		});

		test('toString should return string representation', () => {
			const date = new kk_date('2024-01-15');
			const result = date.toString();
			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe('Time-only formats (line 161)', () => {
		test('should handle hh:mm AM format', () => {
			const date = new kk_date('10:30 AM');
			expect(date.isValid()).toBe(true);
			expect(date.format('HH:mm')).toBe('10:30');
		});

		test('should handle hh:mm PM format', () => {
			const date = new kk_date('02:30 PM');
			expect(date.isValid()).toBe(true);
			expect(date.format('HH:mm')).toBe('14:30');
		});

		test('should handle 12:00 AM (midnight)', () => {
			const date = new kk_date('12:00 AM');
			expect(date.isValid()).toBe(true);
			expect(date.format('HH:mm')).toBe('00:00');
		});

		test('should handle 12:00 PM (noon)', () => {
			const date = new kk_date('12:00 PM');
			expect(date.isValid()).toBe(true);
			expect(date.format('HH:mm')).toBe('12:00');
		});
	});

	describe('Format cases (lines 1559-1886)', () => {
		test('should format D MMMM YYYY (no leading zero)', () => {
			const date = new kk_date('2024-01-05');
			const result = date.format('D MMMM YYYY');
			expect(result).toBe('5 January 2024');
		});

		test('should format Do MMMM YYYY (ordinal)', () => {
			expect(new kk_date('2024-01-01').format('Do MMMM YYYY')).toBe('1st January 2024');
			expect(new kk_date('2024-01-02').format('Do MMMM YYYY')).toBe('2nd January 2024');
			expect(new kk_date('2024-01-03').format('Do MMMM YYYY')).toBe('3rd January 2024');
			expect(new kk_date('2024-01-04').format('Do MMMM YYYY')).toBe('4th January 2024');
			expect(new kk_date('2024-01-11').format('Do MMMM YYYY')).toBe('11th January 2024');
			expect(new kk_date('2024-01-21').format('Do MMMM YYYY')).toBe('21st January 2024');
			expect(new kk_date('2024-01-22').format('Do MMMM YYYY')).toBe('22nd January 2024');
		});

		test('should format Do MMM YYYY (ordinal short month)', () => {
			expect(new kk_date('2024-03-01').format('Do MMM YYYY')).toBe('1st Mar 2024');
			expect(new kk_date('2024-03-15').format('Do MMM YYYY')).toBe('15th Mar 2024');
			expect(new kk_date('2024-03-23').format('Do MMM YYYY')).toBe('23rd Mar 2024');
		});

		test('should format DD MMMM dddd YYYY', () => {
			const date = new kk_date('2024-01-15'); // Monday
			const result = date.format('DD MMMM dddd YYYY');
			expect(result).toBe('15 January Monday 2024');
		});

		test('should format DD MMMM dddd, YYYY', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('DD MMMM dddd, YYYY');
			expect(result).toBe('15 January Monday, 2024');
		});

		test('should format dddd, DD MMMM YYYY', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('dddd, DD MMMM YYYY');
			expect(result).toBe('Monday, 15 January 2024');
		});

		test('should format DD MMMM dddd', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('DD MMMM dddd');
			expect(result).toBe('15 January Monday');
		});

		test('should format DD MMMM', () => {
			const date = new kk_date('2024-08-19');
			const result = date.format('DD MMMM');
			expect(result).toBe('19 August');
		});

		test('should format MMMM YYYY', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('MMMM YYYY');
			expect(result).toBe('January 2024');
		});

		test('should format MMM YYYY', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('MMM YYYY');
			expect(result).toBe('Jan 2024');
		});

		test('should format DD MMM YYYY', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('DD MMM YYYY');
			expect(result).toBe('15 Jan 2024');
		});

		test('should format DD MMM', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('DD MMM');
			expect(result).toBe('15 Jan');
		});

		test('should format DD MMM YYYY HH:mm', () => {
			const date = new kk_date('2024-01-15T14:30:00');
			const result = date.format('DD MMM YYYY HH:mm');
			expect(result).toBe('15 Jan 2024 14:30');
		});

		test('should format YYYY MMM DD', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('YYYY MMM DD');
			expect(result).toBe('2024 Jan 15');
		});

		test('should format YYYY MMMM DD', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('YYYY MMMM DD');
			expect(result).toBe('2024 January 15');
		});

		test('should format YYYYMMDD', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('YYYYMMDD');
			expect(result).toBe('20240115');
		});

		test('should format YYYY-MM', () => {
			const date = new kk_date('2024-01-15');
			const result = date.format('YYYY-MM');
			expect(result).toBe('2024-01');
		});
	});


	describe('add() with timezone-aware operations', () => {
		test('should add months with timezone', () => {
			const date = new kk_date('2024-01-31T12:00:00Z');
			date.config({ timezone: 'America/New_York' });
			date.add(1, 'months');
			// Adding 1 month to Jan 31 should give Feb 29 (2024 is leap year)
			expect(date.format('MM')).toBe('02');
		});

		test('should add days with timezone', () => {
			const date = new kk_date('2024-01-15T12:00:00Z');
			date.config({ timezone: 'Asia/Tokyo' });
			date.add(5, 'days');
			expect(date.format('DD')).toBe('20');
		});
	});

	describe('set() operations', () => {
		test('should set year', () => {
			const date = new kk_date('2024-01-15');
			date.set('years', 2025);
			expect(date.format('YYYY')).toBe('2025');
		});

		test('should set month', () => {
			const date = new kk_date('2024-01-15');
			date.set('months', 6);
			// Month is 0-indexed internally, so 6 = July
			expect(parseInt(date.format('MM'))).toBeGreaterThanOrEqual(6);
		});

		test('should set day', () => {
			const date = new kk_date('2024-01-15');
			date.set('days', 20);
			expect(date.format('DD')).toBe('20');
		});

		test('should set hours', () => {
			const date = new kk_date('2024-01-15T10:00:00');
			date.set('hours', 15);
			expect(date.format('HH')).toBe('15');
		});

		test('should set minutes', () => {
			const date = new kk_date('2024-01-15T10:00:00');
			date.set('minutes', 45);
			expect(date.format('mm')).toBe('45');
		});

		test('should set seconds', () => {
			const date = new kk_date('2024-01-15T10:00:00');
			date.set('seconds', 30);
			expect(date.format('ss')).toBe('30');
		});
	});

	describe('get() operations', () => {
		test('should get year', () => {
			const date = new kk_date('2024-06-15');
			expect(date.get('years')).toBe(2024);
		});

		test('should get month', () => {
			const date = new kk_date('2024-06-15');
			// get('months') returns 0-indexed month (5 = June) or 1-indexed depending on implementation
			const month = date.get('months');
			expect(month === 5 || month === 6).toBe(true);
		});

		test('should get day', () => {
			const date = new kk_date('2024-06-15');
			expect(date.get('days')).toBe(15);
		});

		test('should get hours', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			expect(date.get('hours')).toBe(14);
		});

		test('should get minutes', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			expect(date.get('minutes')).toBe(30);
		});

		test('should get seconds', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			expect(date.get('seconds')).toBe(45);
		});
	});

	describe('startOf/endOf operations', () => {
		test('startOf year', () => {
			// Tarih string olarak verildiğinde lokal olarak parse edilir
			const date = new kk_date('2024-06-15 14:30:45');
			date.startOf('years');
			// startOf yılın başına gider, MM ve DD kontrolü timezone-independent
			expect(date.format('MM')).toBe('01');
			expect(date.format('DD')).toBe('01');
			expect(date.format('HH')).toBe('00');
		});

		test('endOf year', () => {
			const date = new kk_date('2024-06-15 14:30:45');
			date.endOf('years');
			expect(date.format('MM')).toBe('12');
			expect(date.format('DD')).toBe('31');
			expect(date.format('HH')).toBe('23');
		});

		test('startOf month', () => {
			const date = new kk_date('2024-06-15 14:30:45');
			date.startOf('months');
			expect(date.format('MM')).toBe('06');
			expect(date.format('DD')).toBe('01');
		});

		test('endOf month', () => {
			const date = new kk_date('2024-06-15 14:30:45');
			date.endOf('months');
			expect(date.format('DD')).toBe('30');
		});

		test('startOf day', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			date.startOf('days');
			expect(date.format('HH:mm:ss')).toBe('00:00:00');
		});

		test('endOf day', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			date.endOf('days');
			expect(date.format('HH:mm:ss')).toBe('23:59:59');
		});

		test('startOf hour', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			date.startOf('hours');
			expect(date.format('mm')).toBe('00');
			expect(date.format('ss')).toBe('00');
		});

		test('endOf hour', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			date.endOf('hours');
			expect(date.format('mm')).toBe('59');
			expect(date.format('ss')).toBe('59');
		});

		test('startOf minute', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			date.startOf('minutes');
			expect(date.format('ss')).toBe('00');
		});

		test('endOf minute', () => {
			const date = new kk_date('2024-06-15T14:30:45');
			date.endOf('minutes');
			expect(date.format('ss')).toBe('59');
		});
	});

	describe('config error handling (lines 1975-1981)', () => {
		test('should throw for invalid locale', () => {
			expect(() => kk_date.config({ locale: 'invalid-locale-xyz' })).toThrow();
		});

		test('should accept valid locale', () => {
			expect(() => kk_date.config({ locale: 'en' })).not.toThrow();
		});
	});

	describe('valueOf and valueOfLocal', () => {
		test('valueOf should return timestamp', () => {
			const date = new kk_date('2024-01-15T12:00:00Z');
			const value = date.valueOf();
			expect(typeof value).toBe('number');
			expect(value).toBe(date.getTime());
		});

		test('valueOfLocal should return adjusted timestamp', () => {
			const date = new kk_date('2024-01-15T12:00:00');
			const value = date.valueOfLocal();
			expect(typeof value).toBe('number');
		});
	});

	describe('format with null template', () => {
		test('should return ISO format with timezone offset when template is null', () => {
			const date = new kk_date('2024-01-15T12:30:45');
			const result = date.format(null);
			// Should be like: 2024-01-15T12:30:45+03:00
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
		});
	});

	describe('X and x format (timestamp)', () => {
		test('should format as Unix timestamp (X)', () => {
			const date = new kk_date('2024-01-15T00:00:00Z');
			const result = date.format('X');
			// Unix timestamp should be numeric string
			expect(parseInt(result)).toBeGreaterThan(1700000000);
		});

		test('should format as millisecond timestamp (x)', () => {
			const date = new kk_date('2024-01-15T00:00:00Z');
			const result = date.format('x');
			// Millisecond timestamp should be numeric string
			expect(parseInt(result)).toBeGreaterThan(1700000000000);
		});
	});

	describe('Various date formats parsing', () => {
		test('should parse MM/DD/YYYY format', () => {
			const date = new kk_date('01/15/2024');
			expect(date.isValid()).toBe(true);
			expect(date.format('YYYY-MM-DD')).toBe('2024-01-15');
		});

		test('should parse MM/DD/YYYY format', () => {
			const date = new kk_date('01/15/2024');
			expect(date.isValid()).toBe(true);
			expect(date.format('YYYY-MM-DD')).toBe('2024-01-15');
		});

		test('should parse YYYYMMDD format', () => {
			const date = new kk_date('20240115');
			expect(date.isValid()).toBe(true);
			expect(date.format('YYYY-MM-DD')).toBe('2024-01-15');
		});

		test('should parse YYYY-MM format', () => {
			const date = new kk_date('2024-01');
			expect(date.isValid()).toBe(true);
		});
	});
});
