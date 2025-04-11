const kk_date = require('./index');
const global_timezone = 'Europe/Istanbul';
kk_date.config({ timezone: global_timezone });

console.log(new kk_date().format('DD-MM-YYYY HH:mm:ss'));

console.log(
	new kk_date('2024-01-01 23:59:59').tz('America/New_York').add(1, 'seconds').add(1, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
	', 2024-01-01 17:01:00',
);
