/**
 * kk-date Performance Benchmark
 *
 * This benchmark compares kk-date performance against other popular date libraries:
 * - moment-timezone
 * - Day.js + timezone plugin
 * - Luxon
 *
 * Test scenarios include:
 * - Constructor Performance (New Date, String parsing, Timestamp)
 * - Formatting Performance (Various date formats)
 * - Comparison Performance (isBefore, isAfter, isSame)
 * - Manipulation Performance (Add days/months, Start of day)
 * - Validation Performance (isValid, Format validation)
 * - Timezone Conversion Performance (UTC to various timezones)
 * - Multiple Timezone Conversions (8 major timezones)
 * - Timezone + Formatting Performance (Combined operations)
 * - DST Transition Performance (Daylight Saving Time handling)
 * - Big Data Performance (1M operations)
 * - Cache Performance Test (With/without caching)
 * - Memory Usage Comparison
 *
 * Usage:
 *   node benchmark.js
 *
 * Dependencies required:
 *   npm install moment-timezone dayjs luxon
 */

const KkDate = require('./index');
const dayjs = require('dayjs');
const momentTimezone = require('moment-timezone');
const luxon = require('luxon');

// Enable timezone plugins for dayjs
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// Enable caching for better performance
KkDate.caching({ status: false, defaultTtl: 3600 });

// Helper function to measure execution time
function measureExecutionTime(fn, iterations = 500000) {
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = process.hrtime.bigint();
	return Number(end - start) / 1_000_000; // Convert to milliseconds
}

// Helper function to calculate operations per second
function calculateOpsPerSec(timeMs, iterations) {
	return Math.round((iterations / timeMs) * 1000);
}

// Performance test scenarios
const testScenarios = [
	{
		name: 'Constructor Performance',
		tests: [
			{
				name: 'New Date()',
				kkDate: () => new KkDate(new Date()),
				moment: () => momentTimezone(new Date()),
				dayjs: () => dayjs(new Date()),
			},
			{
				name: 'String Date (YYYY-MM-DD)',
				kkDate: () => new KkDate('2024-01-15'),
				moment: () => momentTimezone('2024-01-15'),
				dayjs: () => dayjs('2024-01-15'),
			},
			{
				name: 'String DateTime (YYYY-MM-DD HH:mm:ss)',
				kkDate: () => new KkDate('2024-01-15 14:30:45'),
				moment: () => momentTimezone('2024-01-15 14:30:45'),
				dayjs: () => dayjs('2024-01-15 14:30:45'),
			},
			{
				name: 'Timestamp',
				kkDate: () => new KkDate(1705311045000),
				moment: () => momentTimezone(1705311045000),
				dayjs: () => dayjs(1705311045000),
			},
			{
				name: 'DD.MM.YYYY Format',
				kkDate: () => new KkDate('15.01.2024'),
				moment: () => momentTimezone('15.01.2024', 'DD.MM.YYYY'),
				dayjs: () => dayjs('15.01.2024', 'DD.MM.YYYY'),
			},
			{
				name: 'DD.MM.YYYY HH:mm:ss Format',
				kkDate: () => new KkDate('15.01.2024 14:30:45'),
				moment: () => momentTimezone('15.01.2024 14:30:45', 'DD.MM.YYYY HH:mm:ss'),
				dayjs: () => dayjs('15.01.2024 14:30:45', 'DD.MM.YYYY HH:mm:ss'),
			},
			{
				name: 'DD-MM-YYYY Format',
				kkDate: () => new KkDate('15-01-2024'),
				moment: () => momentTimezone('15-01-2024', 'DD-MM-YYYY'),
				dayjs: () => dayjs('15-01-2024', 'DD-MM-YYYY'),
			},
			{
				name: 'DD-MM-YYYY HH:mm:ss Format',
				kkDate: () => new KkDate('15-01-2024 14:30:45'),
				moment: () => momentTimezone('15-01-2024 14:30:45', 'DD-MM-YYYY HH:mm:ss'),
				dayjs: () => dayjs('15-01-2024 14:30:45', 'DD-MM-YYYY HH:mm:ss'),
			},
			{
				name: 'YYYY.MM.DD Format',
				kkDate: () => new KkDate('2024.01.15'),
				moment: () => momentTimezone('2024.01.15', 'YYYY.MM.DD'),
				dayjs: () => dayjs('2024.01.15', 'YYYY.MM.DD'),
			},
			{
				name: 'YYYY.MM.DD HH:mm:ss Format',
				kkDate: () => new KkDate('2024.01.15 14:30:45'),
				moment: () => momentTimezone('2024.01.15 14:30:45', 'YYYY.MM.DD HH:mm:ss'),
				dayjs: () => dayjs('2024.01.15 14:30:45', 'YYYY.MM.DD HH:mm:ss'),
			},
			{
				name: 'YYYYMMDD Format',
				kkDate: () => new KkDate('20240115'),
				moment: () => momentTimezone('20240115', 'YYYYMMDD'),
				dayjs: () => dayjs('20240115', 'YYYYMMDD'),
			},
			{
				name: 'DD MMMM YYYY Format',
				kkDate: () => new KkDate('15 January 2024'),
				moment: () => momentTimezone('15 January 2024', 'DD MMMM YYYY'),
				dayjs: () => dayjs('15 January 2024', 'DD MMMM YYYY'),
			},
			{
				name: 'DD MMMM dddd Format',
				kkDate: () => new KkDate('15 January Monday'),
				moment: () => momentTimezone('15 January Monday', 'DD MMMM dddd'),
				dayjs: () => dayjs('15 January Monday', 'DD MMMM dddd'),
			},
			{
				name: 'dddd, DD MMMM YYYY Format',
				kkDate: () => new KkDate('Monday, 15 January 2024'),
				moment: () => momentTimezone('Monday, 15 January 2024', 'dddd, DD MMMM YYYY'),
				dayjs: () => dayjs('Monday, 15 January 2024', 'dddd, DD MMMM YYYY'),
			},
			{
				name: 'YYYY-MM Format',
				kkDate: () => new KkDate('2024-01'),
				moment: () => momentTimezone('2024-01', 'YYYY-MM'),
				dayjs: () => dayjs('2024-01', 'YYYY-MM'),
			},
			{
				name: 'YYYY-DD-MM Format',
				kkDate: () => new KkDate('2024-15-01'),
				moment: () => momentTimezone('2024-15-01', 'YYYY-DD-MM'),
				dayjs: () => dayjs('2024-15-01', 'YYYY-DD-MM'),
			},
			{
				name: 'D MMMM YYYY Format',
				kkDate: () => new KkDate('15 January 2024'),
				moment: () => momentTimezone('15 January 2024', 'D MMMM YYYY'),
				dayjs: () => dayjs('15 January 2024', 'D MMMM YYYY'),
			},
			{
				name: 'YYYY MMM DD Format',
				kkDate: () => new KkDate('2024 Jan 15'),
				moment: () => momentTimezone('2024 Jan 15', 'YYYY MMM DD'),
				dayjs: () => dayjs('2024 Jan 15', 'YYYY MMM DD'),
			},
			{
				name: 'HH:mm:ss Format',
				kkDate: () => new KkDate('14:30:45'),
				moment: () => momentTimezone('14:30:45', 'HH:mm:ss'),
				dayjs: () => dayjs('14:30:45', 'HH:mm:ss'),
			},
			{
				name: 'HH:mm:ss.SSS Format',
				kkDate: () => new KkDate('14:30:45.123'),
				moment: () => momentTimezone('14:30:45.123', 'HH:mm:ss.SSS'),
				dayjs: () => dayjs('14:30:45.123', 'HH:mm:ss.SSS'),
			},
			{
				name: 'HH:mm Format',
				kkDate: () => new KkDate('14:30'),
				moment: () => momentTimezone('14:30', 'HH:mm'),
				dayjs: () => dayjs('14:30', 'HH:mm'),
			},
			{
				name: 'hh:mm Format',
				kkDate: () => new KkDate('02:30 PM'),
				moment: () => momentTimezone('02:30 PM', 'hh:mm A'),
				dayjs: () => dayjs('02:30 PM', 'hh:mm A'),
			},
			{
				name: 'ISO 8601 String',
				kkDate: () => new KkDate('2024-01-15T14:30:45.123Z'),
				moment: () => momentTimezone('2024-01-15T14:30:45.123Z'),
				dayjs: () => dayjs('2024-01-15T14:30:45.123Z'),
			},
			{
				name: 'ISO 8601 with Timezone',
				kkDate: () => new KkDate('2024-01-15T14:30:45+03:00'),
				moment: () => momentTimezone('2024-01-15T14:30:45+03:00'),
				dayjs: () => dayjs('2024-01-15T14:30:45+03:00'),
			},
			{
				name: 'Unix Timestamp (seconds)',
				kkDate: () => new KkDate(1705311045),
				moment: () => momentTimezone.unix(1705311045),
				dayjs: () => dayjs.unix(1705311045),
			},
			{
				name: 'Unix Timestamp (milliseconds)',
				kkDate: () => new KkDate(1705311045000),
				moment: () => momentTimezone(1705311045000),
				dayjs: () => dayjs(1705311045000),
			},
			{
				name: 'DD MMMM Format',
				kkDate: () => new KkDate('15 January'),
				moment: () => momentTimezone('15 January', 'DD MMMM'),
				dayjs: () => dayjs('15 January', 'DD MMMM'),
			},
			{
				name: 'MMMM YYYY Format',
				kkDate: () => new KkDate('January 2024'),
				moment: () => momentTimezone('January 2024', 'MMMM YYYY'),
				dayjs: () => dayjs('January 2024', 'MMMM YYYY'),
			},
			{
				name: 'DD MMM YYYY Format',
				kkDate: () => new KkDate('15 Jan 2024'),
				moment: () => momentTimezone('15 Jan 2024', 'DD MMM YYYY'),
				dayjs: () => dayjs('15 Jan 2024', 'DD MMM YYYY'),
			},
			{
				name: 'DD MMMM dddd, YYYY Format',
				kkDate: () => new KkDate('15 January Monday, 2024'),
				moment: () => momentTimezone('15 January Monday, 2024', 'DD MMMM dddd, YYYY'),
				dayjs: () => dayjs('15 January Monday, 2024', 'DD MMMM dddd, YYYY'),
			},
		],
	},
	{
		name: 'Formatting Performance',
		tests: [
			{
				name: 'YYYY-MM-DD',
				kkDate: () => new KkDate('2024-01-15 14:30:45').format('YYYY-MM-DD'),
				moment: () => momentTimezone('2024-01-15 14:30:45').format('YYYY-MM-DD'),
				dayjs: () => dayjs('2024-01-15 14:30:45').format('YYYY-MM-DD'),
			},
			{
				name: 'DD.MM.YYYY HH:mm:ss',
				kkDate: () => new KkDate('2024-01-15 14:30:45').format('DD.MM.YYYY HH:mm:ss'),
				moment: () => momentTimezone('2024-01-15 14:30:45').format('DD.MM.YYYY HH:mm:ss'),
				dayjs: () => dayjs('2024-01-15 14:30:45').format('DD.MM.YYYY HH:mm:ss'),
			},
			{
				name: 'Text Format (DD MMMM YYYY)',
				kkDate: () => new KkDate('2024-01-15 14:30:45').format('DD MMMM YYYY'),
				moment: () => momentTimezone('2024-01-15 14:30:45').format('DD MMMM YYYY'),
				dayjs: () => dayjs('2024-01-15 14:30:45').format('DD MMMM YYYY'),
			},
		],
	},
	{
		name: 'Comparison Performance',
		tests: [
			{
				name: 'isBefore',
				kkDate: () => new KkDate('2024-01-15').isBefore(new KkDate('2024-01-20')),
				moment: () => momentTimezone('2024-01-15').isBefore(momentTimezone('2024-01-20')),
				dayjs: () => dayjs('2024-01-15').isBefore(dayjs('2024-01-20')),
			},
			{
				name: 'isAfter',
				kkDate: () => new KkDate('2024-01-20').isAfter(new KkDate('2024-01-15')),
				moment: () => momentTimezone('2024-01-20').isAfter(momentTimezone('2024-01-15')),
				dayjs: () => dayjs('2024-01-20').isAfter(dayjs('2024-01-15')),
			},
			{
				name: 'isSame',
				kkDate: () => new KkDate('2024-01-15').isSame(new KkDate('2024-01-15')),
				moment: () => momentTimezone('2024-01-15').isSame(momentTimezone('2024-01-15')),
				dayjs: () => dayjs('2024-01-15').isSame(dayjs('2024-01-15')),
			},
		],
	},
	{
		name: 'Manipulation Performance',
		tests: [
			{
				name: 'Add Days',
				kkDate: () => new KkDate('2024-01-15').add(5, 'days'),
				moment: () => momentTimezone('2024-01-15').add(5, 'days'),
				dayjs: () => dayjs('2024-01-15').add(5, 'days'),
			},
			{
				name: 'Add Months',
				kkDate: () => new KkDate('2024-01-15').add(2, 'months'),
				moment: () => momentTimezone('2024-01-15').add(2, 'months'),
				dayjs: () => dayjs('2024-01-15').add(2, 'months'),
			},
			{
				name: 'Start of Day',
				kkDate: () => new KkDate('2024-01-15 14:30:45').startOf('days'),
				moment: () => momentTimezone('2024-01-15 14:30:45').startOf('day'),
				dayjs: () => dayjs('2024-01-15 14:30:45').startOf('day'),
			},
		],
	},
	{
		name: 'Validation Performance',
		tests: [
			{
				name: 'isValid',
				kkDate: () => new KkDate('2024-01-15').isValid(),
				moment: () => momentTimezone('2024-01-15').isValid(),
				dayjs: () => dayjs('2024-01-15').isValid(),
			},
			{
				name: 'Format Validation',
				kkDate: () => KkDate.isValid('2024-01-15', 'YYYY-MM-DD'),
				moment: () => momentTimezone('2024-01-15', 'YYYY-MM-DD', true).isValid(),
				dayjs: () => dayjs('2024-01-15', 'YYYY-MM-DD', true).isValid(),
			},
		],
	},
	{
		name: 'Timezone Conversion Performance',
		tests: [
			{
				name: 'UTC to America/New_York',
				kkDate: () => new KkDate('2024-08-23 10:00:00').tz('America/New_York'),
				moment: () => momentTimezone('2024-08-23 10:00:00').tz('America/New_York'),
				dayjs: () => dayjs('2024-08-23 10:00:00').tz('America/New_York'),
				luxon: () => luxon.DateTime.fromISO('2024-08-23T10:00:00Z').setZone('America/New_York'),
				iterations: 100000,
			},
			{
				name: 'UTC to Europe/London',
				kkDate: () => new KkDate('2024-08-23 10:00:00').tz('Europe/London'),
				moment: () => momentTimezone('2024-08-23 10:00:00').tz('Europe/London'),
				dayjs: () => dayjs('2024-08-23 10:00:00').tz('Europe/London'),
				luxon: () => luxon.DateTime.fromISO('2024-08-23T10:00:00Z').setZone('Europe/London'),
				iterations: 100000,
			},
			{
				name: 'UTC to Asia/Tokyo',
				kkDate: () => new KkDate('2024-08-23 10:00:00').tz('Asia/Tokyo'),
				moment: () => momentTimezone('2024-08-23 10:00:00').tz('Asia/Tokyo'),
				dayjs: () => dayjs('2024-08-23 10:00:00').tz('Asia/Tokyo'),
				luxon: () => luxon.DateTime.fromISO('2024-08-23T10:00:00Z').setZone('Asia/Tokyo'),
				iterations: 100000,
			},
		],
	},
	{
		name: 'Multiple Timezone Conversions',
		tests: [
			{
				name: '8 Major Timezones',
				kkDate: () => {
					const date = new KkDate('2024-08-23 10:00:00');
					date.tz('America/New_York');
					date.tz('Europe/London');
					date.tz('Asia/Tokyo');
					date.tz('Australia/Sydney');
					date.tz('America/Los_Angeles');
					date.tz('Europe/Paris');
					date.tz('Asia/Shanghai');
					date.tz('America/Chicago');
					return date;
				},
				moment: () => {
					const date = momentTimezone('2024-08-23 10:00:00');
					date.tz('America/New_York');
					date.tz('Europe/London');
					date.tz('Asia/Tokyo');
					date.tz('Australia/Sydney');
					date.tz('America/Los_Angeles');
					date.tz('Europe/Paris');
					date.tz('Asia/Shanghai');
					date.tz('America/Chicago');
					return date;
				},
				dayjs: () => {
					const date = dayjs('2024-08-23 10:00:00');
					date.tz('America/New_York');
					date.tz('Europe/London');
					date.tz('Asia/Tokyo');
					date.tz('Australia/Sydney');
					date.tz('America/Los_Angeles');
					date.tz('Europe/Paris');
					date.tz('Asia/Shanghai');
					date.tz('America/Chicago');
					return date;
				},
				luxon: () => {
					let date = luxon.DateTime.fromISO('2024-08-23T10:00:00Z');
					date = date.setZone('America/New_York');
					date = date.setZone('Europe/London');
					date = date.setZone('Asia/Tokyo');
					date = date.setZone('Australia/Sydney');
					date = date.setZone('America/Los_Angeles');
					date = date.setZone('Europe/Paris');
					date = date.setZone('Asia/Shanghai');
					date = date.setZone('America/Chicago');
					return date;
				},
				iterations: 100000,
			},
		],
	},
	{
		name: 'Timezone + Formatting Performance',
		tests: [
			{
				name: 'TZ + Format (YYYY-MM-DD HH:mm:ss)',
				kkDate: () => new KkDate('2024-08-23 10:00:00').tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'),
				moment: () => momentTimezone('2024-08-23 10:00:00').tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'),
				dayjs: () => dayjs('2024-08-23 10:00:00').tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'),
				luxon: () => luxon.DateTime.fromISO('2024-08-23T10:00:00Z').setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss'),
				iterations: 100000,
			},
		],
	},
	{
		name: 'DST Transition Performance',
		tests: [
			{
				name: 'DST Transition Detection',
				kkDate: () => {
					const date = new KkDate('2024-03-10 02:00:00');
					date.tz('America/New_York');
					return date.format('YYYY-MM-DD HH:mm:ss');
				},
				moment: () => {
					const date = momentTimezone('2024-03-10 02:00:00');
					date.tz('America/New_York');
					return date.format('YYYY-MM-DD HH:mm:ss');
				},
				dayjs: () => {
					const date = dayjs('2024-03-10 02:00:00');
					date.tz('America/New_York');
					return date.format('YYYY-MM-DD HH:mm:ss');
				},
				luxon: () => {
					const date = luxon.DateTime.fromISO('2024-03-10T02:00:00Z').setZone('America/New_York');
					return date.toFormat('yyyy-MM-dd HH:mm:ss');
				},
				iterations: 100000,
			},
		],
	},
	{
		name: 'Big Data Performance',
		tests: [
			{
				name: '1M Date Operations',
				kkDate: () => {
					const date = new KkDate('2024-08-23 10:00:00');
					date.tz('America/New_York');
					date.format('YYYY-MM-DD HH:mm:ss');
					return date;
				},
				moment: () => {
					const date = momentTimezone('2024-08-23 10:00:00');
					date.tz('America/New_York');
					date.format('YYYY-MM-DD HH:mm:ss');
					return date;
				},
				dayjs: () => {
					const date = dayjs('2024-08-23 10:00:00');
					date.tz('America/New_York');
					date.format('YYYY-MM-DD HH:mm:ss');
					return date;
				},
				luxon: () => {
					const date = luxon.DateTime.fromISO('2024-08-23T10:00:00Z').setZone('America/New_York');
					date.toFormat('yyyy-MM-dd HH:mm:ss');
					return date;
				},
				iterations: 1000000,
			},
		],
	},
];

// Run benchmarks
console.log('🚀 kk-date Performance Benchmark\n');

let totalKkDateTime = 0;
let totalMomentTime = 0;
let totalDayjsTime = 0;
let totalLuxonTime = 0;
let totalLuxonTest = 0;
let testCount = 0;

testScenarios.forEach((scenario) => {
	console.log(`\n📊 ${scenario.name}`);
	console.log('='.repeat(50));

	scenario.tests.forEach((test) => {
		const iterations = test.iterations || 500000;

		// Measure kk-date
		const kkDateTime = measureExecutionTime(() => {
			const setup = test.setup ? test.setup() : null;
			return test.kkDate(setup);
		}, iterations);

		// Measure moment
		const momentTime = measureExecutionTime(() => {
			const setup = test.setup ? test.setup() : null;
			return test.moment(setup);
		}, iterations);

		// Measure dayjs
		const dayjsTime = measureExecutionTime(() => {
			const setup = test.setup ? test.setup() : null;
			return test.dayjs(setup);
		}, iterations);

		// Measure luxon if available
		let luxonTime = 0;
		if (test.luxon) {
			luxonTime = measureExecutionTime(() => {
				const setup = test.setup ? test.setup() : null;
				return test.luxon(setup);
			}, iterations);
			totalLuxonTest++;
		}

		// Calculate operations per second
		const kkDateOps = calculateOpsPerSec(kkDateTime, iterations);
		const momentOps = calculateOpsPerSec(momentTime, iterations);
		const dayjsOps = calculateOpsPerSec(dayjsTime, iterations);
		const luxonOps = test.luxon ? calculateOpsPerSec(luxonTime, iterations) : 0;

		// Calculate improvements
		const competitors = [momentTime, dayjsTime];
		if (test.luxon) {
			competitors.push(luxonTime);
		}
		const avgOtherTime = competitors.reduce((a, b) => a + b, 0) / competitors.length;
		const improvement = (((avgOtherTime - kkDateTime) / avgOtherTime) * 100).toFixed(2);

		console.log(`\n${test.name}:`);
		console.log(`  kk-date:  ${kkDateTime.toFixed(3)}ms (${kkDateOps.toLocaleString()} ops/sec)`);
		console.log(`  Moment:   ${momentTime.toFixed(3)}ms (${momentOps.toLocaleString()} ops/sec)`);
		console.log(`  Day.js:   ${dayjsTime.toFixed(3)}ms (${dayjsOps.toLocaleString()} ops/sec)`);
		if (test.luxon) {
			console.log(`  Luxon:    ${luxonTime.toFixed(3)}ms (${luxonOps.toLocaleString()} ops/sec)`);
		}
		console.log(`  Speed:    ${improvement}% faster than average`);

		totalKkDateTime += kkDateTime;
		totalMomentTime += momentTime;
		totalDayjsTime += dayjsTime;
		if (test.luxon) {
			totalLuxonTime += luxonTime;
		}
		testCount++;
	});
});

// Overall results
console.log(`\n${'='.repeat(60)}`);
console.log('📈 OVERALL RESULTS');
console.log('='.repeat(60));

const avgKkDateTime = totalKkDateTime / testCount;
const avgMomentTime = totalMomentTime / testCount;
const avgDayjsTime = totalDayjsTime / testCount;
const avgLuxonTime = totalLuxonTime / totalLuxonTest;
const avgOtherTime = (avgMomentTime + avgDayjsTime + avgLuxonTime) / 3;
const overallImprovement = (((avgOtherTime - avgKkDateTime) / avgOtherTime) * 100).toFixed(2);

console.log(`Average kk-date time:  ${avgKkDateTime.toFixed(3)}ms`);
console.log(`Average Moment time:   ${avgMomentTime.toFixed(3)}ms`);
console.log(`Average Day.js time:   ${avgDayjsTime.toFixed(3)}ms`);
console.log(`Average Luxon time:    ${avgLuxonTime.toFixed(3)}ms`);
console.log(`\n🎯 kk-date is ${overallImprovement}% faster than average of other libraries`);

// Memory usage comparison
console.log('\n💾 MEMORY USAGE COMPARISON');
console.log('='.repeat(60));

const memoryTest = () => {
	const startMemory = process.memoryUsage().heapUsed;
	const iterations = 100000;

	// Test kk-date memory usage
	for (let i = 0; i < iterations; i++) {
		new KkDate('2024-08-23 10:00:00');
	}
	const kkDateMemory = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024;

	// Test moment memory usage
	for (let i = 0; i < iterations; i++) {
		momentTimezone('2024-08-23 10:00:00');
	}
	const momentMemory = (process.memoryUsage().heapUsed - startMemory - kkDateMemory * 1024 * 1024) / 1024 / 1024;

	// Test dayjs memory usage
	for (let i = 0; i < iterations; i++) {
		dayjs('2024-08-23 10:00:00');
	}
	const dayjsMemory = (process.memoryUsage().heapUsed - startMemory - kkDateMemory * 1024 * 1024 - momentMemory * 1024 * 1024) / 1024 / 1024;

	// Test luxon memory usage
	for (let i = 0; i < iterations; i++) {
		luxon.DateTime.fromISO('2024-08-23T10:00:00');
	}
	const luxonMemory =
		(process.memoryUsage().heapUsed - startMemory - kkDateMemory * 1024 * 1024 - momentMemory * 1024 * 1024 - dayjsMemory * 1024 * 1024) /
		1024 /
		1024;

	console.log(`Memory usage for ${iterations.toLocaleString()} date instances:`);
	console.log(`  kk-date:  ${kkDateMemory.toFixed(2)} MB`);
	console.log(`  Moment:   ${momentMemory.toFixed(2)} MB`);
	console.log(`  Day.js:   ${dayjsMemory.toFixed(2)} MB`);
	console.log(`  Luxon:    ${luxonMemory.toFixed(2)} MB`);
};

memoryTest();

// Cache performance test for all scenarios
console.log('\n⚡ CACHE PERFORMANCE TEST');
console.log('='.repeat(60));

const cacheTestAllScenarios = () => {
	const iterations = 100000;
	let totalNoCacheTime = 0;
	let totalWithCacheTime = 0;
	let scenarioCount = 0;

	// Test each scenario without and with cache
	for (const scenario of testScenarios) {
		for (const test of scenario.tests) {
			// Test without cache
			KkDate.caching({ status: false });
			const startTimeNoCache = process.hrtime.bigint();
			for (let i = 0; i < iterations; i++) {
				test.kkDate();
			}
			const endTimeNoCache = process.hrtime.bigint();
			const timeNoCache = Number(endTimeNoCache - startTimeNoCache) / 1_000_000;

			// Test with cache
			KkDate.caching({ status: true, defaultTtl: 3600 });
			const startTimeWithCache = process.hrtime.bigint();
			for (let i = 0; i < iterations; i++) {
				test.kkDate();
			}
			const endTimeWithCache = process.hrtime.bigint();
			const timeWithCache = Number(endTimeWithCache - startTimeWithCache) / 1_000_000;

			totalNoCacheTime += timeNoCache;
			totalWithCacheTime += timeWithCache;
			scenarioCount++;
		}
	}

	const avgNoCacheTime = totalNoCacheTime / scenarioCount;
	const avgWithCacheTime = totalWithCacheTime / scenarioCount;
	const cacheImprovement = (((avgNoCacheTime - avgWithCacheTime) / avgNoCacheTime) * 100).toFixed(2);

	console.log(`Average without cache: ${avgNoCacheTime.toFixed(3)}ms`);
	console.log(`Average with cache:    ${avgWithCacheTime.toFixed(3)}ms`);
	console.log(`Cache impact:          ${cacheImprovement}% performance improvement`);
};

cacheTestAllScenarios();

// Cache statistics
const cacheStats = KkDate.caching_status();
console.log('\n💾 Cache Statistics:');
console.log(`Cache size: ${cacheStats.cacheSize}/${cacheStats.maxCacheSize}`);
console.log(`Total hits: ${cacheStats.totalHits}`);
console.log(`Hit ratio: ${((cacheStats.totalHits / (cacheStats.totalHits + cacheStats.cacheSize)) * 100).toFixed(2)}%`);

// Memory usage
const memUsage = process.memoryUsage();
console.log('\n🧠 Memory Usage:');
console.log(`RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

console.log('\n✨ Benchmark completed!');
KkDate.caching({ status: false });
