const KkDate = require('./index');

const test_time = '23:50:59';
const test_date = '2024-08-19';
const timestamp = 1724100659;

KkDate.config({ timezone: 'Europe/Istanbul' });

console.log('___________');
console.log(
	new KkDate('2024-01-01 23:59:59').tz('America/New_York').add(1, 'seconds').add(1, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
	'2024-01-02 00:01:00',
);
