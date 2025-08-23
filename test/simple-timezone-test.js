const kk_date = require('../index');

describe('Simple Timezone Test', () => {
	test('UTC to New York and Malaysia conversion', () => {
		// Set UTC configuration
		kk_date.setTimezone('UTC');
		kk_date.setUserTimezone('UTC');
		
		// Test conversion
		const utcTime = new kk_date('2024-08-23 10:00:00').tz('UTC');
		const nyTime = utcTime.tz('America/New_York');
		const malaysiaTime = utcTime.tz('Asia/Kuala_Lumpur');
		
		console.log('UTC:', utcTime.format('YYYY-MM-DD HH:mm:ss'));
		console.log('NY:', nyTime.format('YYYY-MM-DD HH:mm:ss'));
		console.log('MY:', malaysiaTime.format('YYYY-MM-DD HH:mm:ss'));
		
		expect(nyTime.format('HH:mm')).toBe('06:00');
		expect(malaysiaTime.format('HH:mm')).toBe('18:00');
	});
});
