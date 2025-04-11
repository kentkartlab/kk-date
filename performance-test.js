const KkDate = require('./index');
const moment = require('moment');
const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');

KkDate.caching({ status: false });

// Initialize dayjs plugins
dayjs.extend(isBetween);

// Helper function to measure execution time
function measureExecutionTime(fn) {
	const start = process.hrtime.bigint();
	for (let index = 0; index < 100000; index++) {
		fn();
	}
	const end = process.hrtime.bigint();
	return Number(end - start) / 1_000_000; // Convert to milliseconds
}

// Helper function to check if result is valid
function isValidResult(fn) {
	try {
		const result = fn();
		// Check for Invalid Date in various formats
		if (
			result === 'Invalid Date' ||
			result === 'Invalid date' ||
			(result instanceof Date && Number.isNaN(result.getTime())) ||
			result === null ||
			result === undefined
		) {
			return false;
		}
		return true;
	} catch {}
	return false;
}

// Test cases
const testCases = [
	{
		name: 'Test 0: Conv. YYYY-MM-DD HH:mm:ss',
		input: 'new Date()',
		kkDate: () => new KkDate(new Date()).format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 1: Conv. YYYY-MM-DD HH:mm:ss',
		input: '23:50:55',
		kkDate: () => new KkDate('23:50:55').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('23:50:55', 'HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('23:50:55', 'HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 2: HH:mm',
		input: '23:50',
		kkDate: () => new KkDate('23:50').format('HH:mm'),
		moment: () => moment('23:50', 'HH:mm').format('HH:mm'),
		dayjs: () => dayjs('23:50', 'HH:mm').format('HH:mm'),
	},
	{
		name: 'Test 3: Conv. YYYY.MM.DD HH:mm:ss',
		input: '23:50:55',
		kkDate: () => new KkDate('23:50:55').format('YYYY.MM.DD HH:mm:ss'),
		moment: () => moment('23:50:55', 'HH:mm:ss').format('YYYY.MM.DD HH:mm:ss'),
		dayjs: () => dayjs('23:50:55', 'HH:mm:ss').format('YYYY.MM.DD HH:mm:ss'),
	},
	{
		name: 'Test 4: Conv. HH:mm:ss',
		input: '2024-09-17 23:50:55',
		kkDate: () => new KkDate('2024-09-17 23:50:55').format('HH:mm:ss'),
		moment: () => moment('2024-09-17 23:50:55').format('HH:mm:ss'),
		dayjs: () => dayjs('2024-09-17 23:50:55').format('HH:mm:ss'),
	},
	{
		name: 'Test 5: Conv. YYYY-MM-DD',
		input: '2024-09-17 23:50:55',
		kkDate: () => new KkDate('2024-09-17 23:50:55').format('YYYY-MM-DD'),
		moment: () => moment('2024-09-17 23:50:55').format('YYYY-MM-DD'),
		dayjs: () => dayjs('2024-09-17 23:50:55').format('YYYY-MM-DD'),
	},
	{
		name: 'Test 6: Conv. YYYY-MM-DD HH:mm:ss',
		input: '2024-09-17 23:50:55',
		kkDate: () => new KkDate('2024-09-17 23:50:55').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('2024-09-17 23:50:55').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('2024-09-17 23:50:55').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 7: Conv. DD.MM.YYYY HH:mm:ss',
		input: '2024-09-17 23:50:55',
		kkDate: () => new KkDate('2024-09-17 23:50:55').format('DD.MM.YYYY HH:mm:ss'),
		moment: () => moment('2024-09-17 23:50:55').format('DD.MM.YYYY HH:mm:ss'),
		dayjs: () => dayjs('2024-09-17 23:50:55').format('DD.MM.YYYY HH:mm:ss'),
	},
	{
		name: 'Test 8: Conv. YYYY.MM.DD HH:mm:ss',
		input: '2024-09-17 23:50:55',
		kkDate: () => new KkDate('2024-09-17 23:50:55').format('YYYY.MM.DD HH:mm:ss'),
		moment: () => moment('2024-09-17 23:50:55').format('YYYY.MM.DD HH:mm:ss'),
		dayjs: () => dayjs('2024-09-17 23:50:55').format('YYYY.MM.DD HH:mm:ss'),
	},
	{
		name: 'Test 9: isValid',
		input: '23:50:55',
		kkDate: () => new KkDate('23:50:55').isValid(),
		moment: () => moment('23:50:55', 'HH:mm:ss').isValid(),
		dayjs: () => dayjs('23:50:55', 'HH:mm:ss').isValid(),
	},
	{
		name: 'Test 9: isValid Format',
		input: '23:50:55',
		kkDate: () => KkDate.isValid('23:50:55', 'HH:mm:ss'),
		moment: () => moment('23:50:55', 'HH:mm:ss', true).isValid(),
		dayjs: () => dayjs('23:50:55', 'HH:mm:ss', true).isValid(),
	},
	{
		name: 'Test 10: 1723996677',
		input: 1723996677,
		kkDate: () => new KkDate(1723996677 * 1000).format('DD.MM.YYYY HH:mm:ss'),
		moment: () => moment.unix(1723996677).format('DD.MM.YYYY HH:mm:ss'),
		dayjs: () => dayjs.unix(1723996677).format('DD.MM.YYYY HH:mm:ss'),
	},
	{
		name: 'Test 11: 19843077000',
		input: 19843077000,
		kkDate: () => new KkDate(19843077000).format('DD.MM.YYYY HH:mm:ss'),
		moment: () => moment(19843077000).format('DD.MM.YYYY HH:mm:ss'),
		dayjs: () => dayjs(19843077000).format('DD.MM.YYYY HH:mm:ss'),
	},
	{
		name: 'Test 12: 19843077000',
		input: 19843077000,
		kkDate: () => new KkDate(19843077000).format('DD.MM.YYYY HH:mm:ss'),
		moment: () => moment(19843077000).format('DD.MM.YYYY HH:mm:ss'),
		dayjs: () => dayjs(19843077000).format('DD.MM.YYYY HH:mm:ss'),
	},
	{
		name: 'Test 13: diff (days)',
		input: ['2024-01-01', '2024-01-30'],
		kkDate: () => new KkDate('2024-01-01').diff('2024-01-30', 'days'),
		moment: () => moment('2024-01-30').diff(moment('2024-01-01'), 'days'),
		dayjs: () => dayjs('2024-01-30').diff(dayjs('2024-01-01'), 'day'),
	},
	{
		name: 'Test 14: isBefore',
		input: ['2024-01-01', '2024-01-30'],
		kkDate: () => new KkDate('2024-01-01').isBefore('2024-01-30'),
		moment: () => moment('2024-01-01').isBefore(moment('2024-01-30')),
		dayjs: () => dayjs('2024-01-01').isBefore(dayjs('2024-01-30')),
	},
	{
		name: 'Test 15: isBetween',
		input: ['2024-01-01', '2024-01-30'],
		kkDate: () => new KkDate('2024-01-15').isBetween('2024-01-01', '2024-01-30'),
		moment: () => moment('2024-01-15').isBetween(moment('2024-01-01'), moment('2024-01-30')),
		dayjs: () => dayjs('2024-01-15').isBetween(dayjs('2024-01-01'), dayjs('2024-01-30')),
	},
	{
		name: 'Test 16: isAfter',
		input: ['2024-01-01', '2024-01-30'],
		kkDate: () => new KkDate('2024-01-30').isAfter('2024-01-01'),
		moment: () => moment('2024-01-30').isAfter(moment('2024-01-01')),
		dayjs: () => dayjs('2024-01-30').isAfter(dayjs('2024-01-01')),
	},
	{
		name: 'Test 17: isSame',
		input: '2024-01-01',
		kkDate: () => new KkDate('2024-01-01').isSame('2024-01-01'),
		moment: () => moment('2024-01-01').isSame(moment('2024-01-01')),
		dayjs: () => dayjs('2024-01-01').isSame(dayjs('2024-01-01')),
	},
	{
		name: 'Test 18: Turkish Date Format',
		input: '7 Nisan 2025',
		kkDate: () => new KkDate('7 Nisan 2025').format('DD.MM.YYYY HH:mm:ss'),
		moment: () => moment('7 Nisan 2025', 'D MMMM YYYY').format('DD.MM.YYYY HH:mm:ss'),
		dayjs: () => dayjs('7 Nisan 2025', 'D MMMM YYYY').format('DD.MM.YYYY HH:mm:ss'),
	},
	{
		name: 'Test 19: Time Only Format',
		input: '26:50:24',
		kkDate: () => new KkDate('26:50:24').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('26:50:24', 'HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('26:50:24', 'HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 20: Mixed Separator Format',
		input: '07.04.2025 15:30:45',
		kkDate: () => new KkDate('07.04.2025 15:30:45').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('07.04.2025 15:30:45', 'DD.MM.YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('07.04.2025 15:30:45', 'DD.MM.YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 21: Short Month Format',
		input: '07-Apr-2025',
		kkDate: () => new KkDate('07-Apr-2025').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('07-Apr-2025', 'DD-MMM-YYYY').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('07-Apr-2025', 'DD-MMM-YYYY').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 22: Full Month Name Format',
		input: 'April 7, 2025',
		kkDate: () => new KkDate('April 7, 2025').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('April 7, 2025', 'MMMM D, YYYY').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('April 7, 2025', 'MMMM D, YYYY').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 23: Turkish Full Date Format',
		input: '7 Nisan Pazartesi, 2025',
		kkDate: () => new KkDate('7 Nisan Pazartesi, 2025').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('7 Nisan Pazartesi, 2025', 'D MMMM dddd, YYYY').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('7 Nisan Pazartesi, 2025', 'D MMMM dddd, YYYY').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 24: Timezone Format',
		input: '2025-04-07T15:30:45+02:00',
		kkDate: () => new KkDate('2025-04-07T15:30:45+02:00').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('2025-04-07T15:30:45+02:00').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('2025-04-07T15:30:45+02:00').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 25: Mixed Date Time Format',
		input: 'Mon, Apr 7 2025 15:30:45',
		kkDate: () => new KkDate('Mon, Apr 7 2025 15:30:45').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('Mon, Apr 7 2025 15:30:45', 'ddd, MMM D YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('Mon, Apr 7 2025 15:30:45', 'ddd, MMM D YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 26: Hindi Date Format',
		input: '31 दिसंबर Sunday',
		kkDate: () => new KkDate('31 दिसंबर Sunday').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('31 दिसंबर Sunday').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('31 दिसंबर Sunday').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 27: Ordinal Date Format',
		input: '25th april 2025',
		kkDate: () => new KkDate('25th april 2025').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('25th april 2025', 'Do MMMM YYYY').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('25th april 2025', 'Do MMMM YYYY').format('YYYY-MM-DD HH:mm:ss'),
	},
	{
		name: 'Test 28: Russian Date Format',
		input: '25 апрель 2025',
		kkDate: () => new KkDate('25 апрель 2025').format('YYYY-MM-DD HH:mm:ss'),
		moment: () => moment('25 апрель 2025').format('YYYY-MM-DD HH:mm:ss'),
		dayjs: () => dayjs('25 апрель 2025').format('YYYY-MM-DD HH:mm:ss'),
	},
];

// Run performance tests
const results = testCases.map((test) => {
	const kkDateTime = measureExecutionTime(test.kkDate);

	// Check if each library's result is valid
	const momentIsValid = isValidResult(test.moment);
	const dayjsIsValid = isValidResult(test.dayjs);

	// Only measure execution time for valid results
	const momentTime = momentIsValid ? measureExecutionTime(test.moment) : null;
	const dayjsTime = dayjsIsValid ? measureExecutionTime(test.dayjs) : null;

	// Calculate average of other libraries (excluding unsupported)
	const supportedLibraries = [momentTime, dayjsTime].filter((time) => time !== null);
	const otherLibrariesAvg = supportedLibraries.length > 0 ? supportedLibraries.reduce((a, b) => a + b) / supportedLibraries.length : 0;

	// Calculate percentage improvements
	const speedImprovement = otherLibrariesAvg > 0 ? (((otherLibrariesAvg - kkDateTime) / otherLibrariesAvg) * 100).toFixed(2) : '100';

	return {
		Input: Array.isArray(test.input) ? test.input.join(', ') : test.input,
		Test: test.name,
		'kk-date (ms)': kkDateTime.toFixed(3),
		'Moment (ms)': momentIsValid ? momentTime.toFixed(3) : 'unsupported',
		'Day.js (ms)': dayjsIsValid ? dayjsTime.toFixed(3) : 'unsupported',
		'Speed Improvement': speedImprovement === 'N/A' ? 'N/A' : `${speedImprovement}%`,
	};
});

// Calculate overall average improvements
const overallSpeedImprovement =
	results.reduce((acc, curr) => {
		return acc + parseFloat(curr['Speed Improvement']);
	}, 0) / results.length;

console.log('\nPerformance Test Results:');
console.table(results);
console.log(`\nAverage speed: ${overallSpeedImprovement.toFixed(2)}% faster than average of other libraries`);

KkDate.caching({ status: false });
