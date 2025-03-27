const kkDate = require('./index');

console.log('With Local Yekaterinburg', new kkDate('2025-03-27 18:43:00').format('YYYY-MM-DD HH:mm:ss'));

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

console.log(
	'With Local',
	new kkDate('2025-03-27 18:43:00')
		.config({
			timezone: 'Asia/Yekaterinburg',
		})
		.format('YYYY-MM-DD HH:mm:ss'),
);

console.log('With Kuala Convert', new kkDate('2025-03-27 18:43:00').tz('Asia/Kuala_Lumpur').format('YYYY-MM-DD HH:mm:ss'));
