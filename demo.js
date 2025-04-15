const kk_date = require('./index');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
// import utc from 'dayjs/plugin/utc' // ES 2015

const timezone = require('dayjs/plugin/timezone'); // dependent on utc plugin
// import timezone from 'dayjs/plugin/timezone' // ES 2015

dayjs.extend(utc);
dayjs.extend(timezone);

console.log('dayjs', dayjs('2024-01-01 23:59:59').tz('America/New_York').add(1, 'minutes').add(1, 'second').format('YYYY-MM-DD HH:mm:ss'));

kk_date.config({ timezone: 'America/Belem' });

const testCases = [
	{
		test_global_timezone: null,
		input: '2024-01-01 23:59:59',
		timezone: 'America/New_York',
		operations: [
			{ value: 1, unit: 'seconds' },
			{ value: 1, unit: 'minutes' },
		],
		expected: '2024-01-01 16:01:00',
	},
	{
		test_global_timezone: 'America/Belem',
		input: '2024-01-01 23:59:59',
		timezone: 'America/New_York',
		operations: [
			{ value: 1, unit: 'seconds' },
			{ value: 1, unit: 'minutes' },
		],
		expected: '2024-01-01 22:01:00',
	},
	{
		test_global_timezone: null,
		input: '2024-12-31 23:59:59',
		timezone: 'Asia/Tokyo',
		operations: [
			{ value: 1, unit: 'seconds' },
			{ value: 1, unit: 'minutes' },
		],
		expected: '2025-01-01 06:01:00',
	},
];
for (const { input, timezone, operations, expected } of testCases) {
	console.log('_____________');
	const date = new kk_date(input).tz(timezone);
	for (const { value, unit } of operations) {
		date.add(value, unit);
	}
	console.log(date.format('YYYY-MM-DD HH:mm:ss'), expected);
}
