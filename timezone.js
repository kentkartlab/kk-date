const kkDate = require('./index');

console.log('With Yekaterinburg', new kkDate('2025-03-27 18:43:00').format('YYYY-MM-DD HH:mm:ss'));

// YEKATERİNBURG 18:43

// ISTANBUL 16:44

// YEKATERINBURG 18:43

console.log(
	'With Istanbul',
	new kkDate('2025-03-27 18:43:00')
		.config({
			timezone: 'Europe/Istanbul',
		})
		.format('YYYY-MM-DD HH:mm:ss'),
);

console.log(
	'With Kuala',
	new kkDate('2025-03-27 18:43:00')
		.config({
			timezone: 'Asia/Kuala_Lumpur',
		})
		.format('YYYY-MM-DD HH:mm:ss'),
);

console.log('With Local', new kkDate('2025-03-27 18:43:00').format('YYYY-MM-DD HH:mm:ss'));
