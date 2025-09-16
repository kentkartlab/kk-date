/**
 * kk-date Sequential Date Performance Benchmark
 *
 * This benchmark tests real-world usage patterns with 600 sequential days
 * comparing kk-date against moment-timezone, Day.js, and Luxon
 */

const KkDate = require('./index');
const moment = require('moment-timezone');
const dayjs = require('dayjs');
const { DateTime } = require('luxon');

// Enable timezone plugins for dayjs
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// Test configuration
const DAYS_TO_TEST = 1000;
const ITERATIONS_PER_DAY = 100;

// Starting date
const START_DATE = new Date('2023-01-01');

console.log('🚀 kk-date Sequential Date Benchmark');
console.log('=====================================');
console.log(`Testing ${DAYS_TO_TEST} sequential days with ${ITERATIONS_PER_DAY} operations per day\n`);

// Helper to measure time
function measureTime(fn) {
	const start = process.hrtime.bigint();
	fn();
	const end = process.hrtime.bigint();
	return Number(end - start) / 1000000; // Convert to milliseconds
}

// Test scenarios
const scenarios = [
	{
		name: '📅 Date Creation & Formatting',
		run: (dateStr) => ({
			kkdate: () => {
				const d = new KkDate(dateStr);
				d.format('YYYY-MM-DD');
				d.format('DD/MM/YYYY');
				d.format('DD MMM YYYY');
			},
			moment: () => {
				const d = moment(dateStr);
				d.format('YYYY-MM-DD');
				d.format('DD/MM/YYYY');
				d.format('MMM DD, YYYY');
			},
			dayjs: () => {
				const d = dayjs(dateStr);
				d.format('YYYY-MM-DD');
				d.format('DD/MM/YYYY');
				d.format('MMM DD, YYYY');
			},
			luxon: () => {
				const d = DateTime.fromISO(dateStr);
				d.toFormat('yyyy-MM-dd');
				d.toFormat('dd/MM/yyyy');
				d.toFormat('MMM dd, yyyy');
			},
		}),
	},
	{
		name: '⏰ Time Operations',
		run: (dateStr) => ({
			kkdate: () => {
				const d = new KkDate(dateStr);
				d.add(1, 'days');
				d.add(2, 'hours');
				d.add(-30, 'minutes');
				d.startOf('days');
				d.endOf('days');
			},
			moment: () => {
				const d = moment(dateStr);
				d.add(1, 'days');
				d.add(2, 'hours');
				d.subtract(30, 'minutes');
				d.startOf('day');
				d.endOf('day');
			},
			dayjs: () => {
				const d = dayjs(dateStr);
				d.add(1, 'days');
				d.add(2, 'hours');
				d.subtract(30, 'minutes');
				d.startOf('day');
				d.endOf('day');
			},
			luxon: () => {
				const d = DateTime.fromISO(dateStr);
				d.plus({ days: 1 });
				d.plus({ hours: 2 });
				d.minus({ minutes: 30 });
				d.startOf('day');
				d.endOf('day');
			},
		}),
	},
	{
		name: '🌍 Timezone Conversions',
		run: (dateStr) => ({
			kkdate: () => {
				const d = new KkDate(dateStr);
				d.tz('America/New_York').format('YYYY-MM-DD HH:mm:ss');
				d.tz('Europe/London').format('YYYY-MM-DD HH:mm:ss');
				d.tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
			},
			moment: () => {
				const d = moment(dateStr);
				d.tz('America/New_York').format('YYYY-MM-DD HH:mm:ss');
				d.tz('Europe/London').format('YYYY-MM-DD HH:mm:ss');
				d.tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
			},
			dayjs: () => {
				const d = dayjs(dateStr);
				d.tz('America/New_York').format('YYYY-MM-DD HH:mm:ss');
				d.tz('Europe/London').format('YYYY-MM-DD HH:mm:ss');
				d.tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
			},
			luxon: () => {
				const d = DateTime.fromISO(dateStr);
				d.setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');
				d.setZone('Europe/London').toFormat('yyyy-MM-dd HH:mm:ss');
				d.setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss');
			},
		}),
	},
	{
		name: '🔄 Complex Operations',
		run: (dateStr) => ({
			kkdate: () => {
				const d = new KkDate(dateStr);
				const future = new KkDate(dateStr).add(7, 'days');
				d.isBefore(future);
				d.isAfter(future);
				d.diff(future, 'days');
				d.format('YYYY-MM-DD HH:mm:ss');
				future.format('YYYY-MM-DD HH:mm:ss');
			},
			moment: () => {
				const d = moment(dateStr);
				const future = moment(dateStr).add(7, 'days');
				d.isBefore(future);
				d.isAfter(future);
				d.diff(future, 'days');
				d.format('YYYY-MM-DD HH:mm:ss');
				future.format('YYYY-MM-DD HH:mm:ss');
			},
			dayjs: () => {
				const d = dayjs(dateStr);
				const future = dayjs(dateStr).add(7, 'days');
				d.isBefore(future);
				d.isAfter(future);
				d.diff(future, 'days');
				d.format('YYYY-MM-DD HH:mm:ss');
				future.format('YYYY-MM-DD HH:mm:ss');
			},
			luxon: () => {
				const d = DateTime.fromISO(dateStr);
				const future = DateTime.fromISO(dateStr).plus({ days: 7 });
				d < future;
				d > future;
				d.diff(future, 'days').days;
				d.toFormat('yyyy-MM-dd HH:mm:ss');
				future.toFormat('yyyy-MM-dd HH:mm:ss');
			},
		}),
	},
];

// Run benchmarks
console.log('Running benchmarks...\n');

const results = {
	kkdate: {},
	moment: {},
	dayjs: {},
	luxon: {},
};

// Initialize results
for (const scenario of scenarios) {
	results.kkdate[scenario.name] = 0;
	results.moment[scenario.name] = 0;
	results.dayjs[scenario.name] = 0;
	results.luxon[scenario.name] = 0;
}

// Generate dates for 600 days
const dates = [];
for (let i = 0; i < DAYS_TO_TEST; i++) {
	const date = new Date(START_DATE);
	date.setDate(date.getDate() + i);
	dates.push(`${date.toISOString().split('T')[0]}T12:00:00`);
}

// Progress indicator
let progress = 0;
const progressInterval = Math.floor(DAYS_TO_TEST / 20);

// Run tests for each day
for (let index = 0; index < dates.length; index++) {
	const dateStr = dates[index];
	// Show progress
	if (index % progressInterval === 0) {
		progress = Math.floor((index / DAYS_TO_TEST) * 100);
		process.stdout.write(`\rProgress: ${'█'.repeat(Math.floor(progress / 5))}${'░'.repeat(20 - Math.floor(progress / 5))} ${progress}%`);
	}

	for (const scenario of scenarios) {
		const tests = scenario.run(dateStr);

		// Run each test ITERATIONS_PER_DAY times
		for (let i = 0; i < ITERATIONS_PER_DAY; i++) {
			results.kkdate[scenario.name] += measureTime(tests.kkdate);
			results.moment[scenario.name] += measureTime(tests.moment);
			results.dayjs[scenario.name] += measureTime(tests.dayjs);
			results.luxon[scenario.name] += measureTime(tests.luxon);
		}
	}
}

console.log(`\r${' '.repeat(50)}\r`); // Clear progress line

// Display results
console.log('📊 Results (Total time for', DAYS_TO_TEST * ITERATIONS_PER_DAY, 'operations per scenario)');
console.log('='.repeat(70));

for (const scenario of scenarios) {
	console.log(`\n${scenario.name}`);
	console.log('-'.repeat(50));

	const times = {
		'kk-date': results.kkdate[scenario.name],
		Moment: results.moment[scenario.name],
		'Day.js': results.dayjs[scenario.name],
		Luxon: results.luxon[scenario.name],
	};

	// Sort by performance
	const sorted = Object.entries(times).sort((a, b) => a[1] - b[1]);
	const fastest = sorted[0][1];

	sorted.forEach(([lib, time], index) => {
		const ratio = ((time / fastest - 1) * 100).toFixed(1);
		const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
		const timeStr = time.toFixed(2).padStart(10);
		const opsPerSec = ((DAYS_TO_TEST * ITERATIONS_PER_DAY) / (time / 1000)).toFixed(0);

		if (index === 0) {
			console.log(`${medal} ${lib.padEnd(10)} ${timeStr}ms (${opsPerSec.padStart(8)} ops/sec) ⚡ FASTEST`);
		} else {
			console.log(`${medal} ${lib.padEnd(10)} ${timeStr}ms (${opsPerSec.padStart(8)} ops/sec) +${ratio}% slower`);
		}
	});
}

// Overall summary
console.log(`\n${'='.repeat(70)}`);
console.log('📈 Overall Performance Summary');
console.log('='.repeat(70));

const totalTimes = {
	'kk-date': Object.values(results.kkdate).reduce((a, b) => a + b, 0),
	Moment: Object.values(results.moment).reduce((a, b) => a + b, 0),
	'Day.js': Object.values(results.dayjs).reduce((a, b) => a + b, 0),
	Luxon: Object.values(results.luxon).reduce((a, b) => a + b, 0),
};

const sortedTotal = Object.entries(totalTimes).sort((a, b) => a[1] - b[1]);
const fastestTotal = sortedTotal[0][1];

for (let index = 0; index < sortedTotal.length; index++) {
	const [lib, time] = sortedTotal[index];
	const ratio = ((time / fastestTotal - 1) * 100).toFixed(1);
	const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
	const timeStr = time.toFixed(2).padStart(10);
	const totalOps = DAYS_TO_TEST * ITERATIONS_PER_DAY * scenarios.length;
	const opsPerSec = (totalOps / (time / 1000)).toFixed(0);

	if (index === 0) {
		console.log(`${medal} ${lib.padEnd(10)} ${timeStr}ms (${opsPerSec.padStart(8)} ops/sec) ⚡ OVERALL WINNER`);
	} else {
		console.log(`${medal} ${lib.padEnd(10)} ${timeStr}ms (${opsPerSec.padStart(8)} ops/sec) +${ratio}% slower`);
	}
}

// Memory usage
const memUsage = process.memoryUsage();
console.log('\n🧠 Memory Usage:');
console.log(`RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);

console.log('\n✨ Benchmark completed!');
