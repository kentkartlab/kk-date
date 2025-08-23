const KkDate = require('./index');
const moment = require('moment');
const dayjs = require('dayjs');

// Enable caching for better performance
KkDate.caching({ status: true, defaultTtl: 3600 });

// Helper function to measure execution time
function measureExecutionTime(fn, iterations = 500000) {
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = process.hrtime.bigint();
	return Number(end - start) / 1_000_000; // Convert to milliseconds
}

// Performance test scenarios
const testScenarios = [
	{
		name: 'Constructor Performance',
		tests: [
			{
				name: 'New Date()',
				kkDate: () => new KkDate(new Date()),
				moment: () => moment(new Date()),
				dayjs: () => dayjs(new Date()),
			},
			{
				name: 'String Date (YYYY-MM-DD)',
				kkDate: () => new KkDate('2024-01-15'),
				moment: () => moment('2024-01-15'),
				dayjs: () => dayjs('2024-01-15'),
			},
			{
				name: 'String DateTime',
				kkDate: () => new KkDate('2024-01-15 14:30:45'),
				moment: () => moment('2024-01-15 14:30:45'),
				dayjs: () => dayjs('2024-01-15 14:30:45'),
			},
			{
				name: 'Timestamp',
				kkDate: () => new KkDate(1705311045000),
				moment: () => moment(1705311045000),
				dayjs: () => dayjs(1705311045000),
			},
		],
	},
	{
		name: 'Formatting Performance',
		tests: [
			{
				name: 'YYYY-MM-DD',
				setup: () => new KkDate('2024-01-15 14:30:45'),
				kkDate: (date) => date.format('YYYY-MM-DD'),
				moment: (date) => moment(date).format('YYYY-MM-DD'),
				dayjs: (date) => dayjs(date).format('YYYY-MM-DD'),
			},
			{
				name: 'DD.MM.YYYY HH:mm:ss',
				setup: () => new KkDate('2024-01-15 14:30:45'),
				kkDate: (date) => date.format('DD.MM.YYYY HH:mm:ss'),
				moment: (date) => moment(date).format('DD.MM.YYYY HH:mm:ss'),
				dayjs: (date) => dayjs(date).format('DD.MM.YYYY HH:mm:ss'),
			},
			{
				name: 'Text Format (DD MMMM YYYY)',
				setup: () => new KkDate('2024-01-15 14:30:45'),
				kkDate: (date) => date.format('DD MMMM YYYY'),
				moment: (date) => moment(date).format('DD MMMM YYYY'),
				dayjs: (date) => dayjs(date).format('DD MMMM YYYY'),
			},
		],
	},
	{
		name: 'Comparison Performance',
		tests: [
			{
				name: 'isBefore',
				setup: () => ({ date1: new KkDate('2024-01-15'), date2: new KkDate('2024-01-20') }),
				kkDate: (dates) => dates.date1.isBefore(dates.date2),
				moment: (dates) => moment(dates.date1).isBefore(moment(dates.date2)),
				dayjs: (dates) => dayjs(dates.date1).isBefore(dayjs(dates.date2)),
			},
			{
				name: 'isAfter',
				setup: () => ({ date1: new KkDate('2024-01-20'), date2: new KkDate('2024-01-15') }),
				kkDate: (dates) => dates.date1.isAfter(dates.date2),
				moment: (dates) => moment(dates.date1).isAfter(moment(dates.date2)),
				dayjs: (dates) => dayjs(dates.date1).isAfter(dayjs(dates.date2)),
			},
			{
				name: 'isSame',
				setup: () => ({ date1: new KkDate('2024-01-15'), date2: new KkDate('2024-01-15') }),
				kkDate: (dates) => dates.date1.isSame(dates.date2),
				moment: (dates) => moment(dates.date1).isSame(moment(dates.date2)),
				dayjs: (dates) => dayjs(dates.date1).isSame(dayjs(dates.date2)),
			},
		],
	},
	{
		name: 'Manipulation Performance',
		tests: [
			{
				name: 'Add Days',
				setup: () => new KkDate('2024-01-15'),
				kkDate: (date) => date.add(5, 'days'),
				moment: (date) => moment(date).add(5, 'days'),
				dayjs: (date) => dayjs(date).add(5, 'days'),
			},
			{
				name: 'Add Months',
				setup: () => new KkDate('2024-01-15'),
				kkDate: (date) => date.add(2, 'months'),
				moment: (date) => moment(date).add(2, 'months'),
				dayjs: (date) => dayjs(date).add(2, 'months'),
			},
			{
				name: 'Start of Day',
				setup: () => new KkDate('2024-01-15 14:30:45'),
				kkDate: (date) => date.startOf('days'),
				moment: (date) => moment(date).startOf('day'),
				dayjs: (date) => dayjs(date).startOf('day'),
			},
		],
	},
	{
		name: 'Validation Performance',
		tests: [
			{
				name: 'isValid',
				setup: () => new KkDate('2024-01-15'),
				kkDate: (date) => date.isValid(),
				moment: (date) => moment(date).isValid(),
				dayjs: (date) => dayjs(date).isValid(),
			},
			{
				name: 'Format Validation',
				kkDate: () => KkDate.isValid('2024-01-15', 'YYYY-MM-DD'),
				moment: () => moment('2024-01-15', 'YYYY-MM-DD', true).isValid(),
				dayjs: () => dayjs('2024-01-15', 'YYYY-MM-DD', true).isValid(),
			},
		],
	},
];

// Run benchmarks
console.log('🚀 kk-date Performance Benchmark\n');

let totalKkDateTime = 0;
let totalMomentTime = 0;
let totalDayjsTime = 0;
let testCount = 0;

testScenarios.forEach((scenario) => {
	console.log(`\n📊 ${scenario.name}`);
	console.log('='.repeat(50));

	scenario.tests.forEach((test) => {
		const iterations = 500000;

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

		// Calculate improvements
		const avgOtherTime = (momentTime + dayjsTime) / 2;
		const improvement = (((avgOtherTime - kkDateTime) / avgOtherTime) * 100).toFixed(2);

		console.log(`\n${test.name}:`);
		console.log(`  kk-date:  ${kkDateTime.toFixed(3)}ms`);
		console.log(`  Moment:   ${momentTime.toFixed(3)}ms`);
		console.log(`  Day.js:   ${dayjsTime.toFixed(3)}ms`);
		console.log(`  Speed:    ${improvement}% faster than average`);

		totalKkDateTime += kkDateTime;
		totalMomentTime += momentTime;
		totalDayjsTime += dayjsTime;
		testCount++;
	});
});

// Overall results
console.log('\n' + '='.repeat(60));
console.log('📈 OVERALL RESULTS');
console.log('='.repeat(60));

const avgKkDateTime = totalKkDateTime / testCount;
const avgMomentTime = totalMomentTime / testCount;
const avgDayjsTime = totalDayjsTime / testCount;
const avgOtherTime = (avgMomentTime + avgDayjsTime) / 2;
const overallImprovement = (((avgOtherTime - avgKkDateTime) / avgOtherTime) * 100).toFixed(2);

console.log(`Average kk-date time:  ${avgKkDateTime.toFixed(3)}ms`);
console.log(`Average Moment time:   ${avgMomentTime.toFixed(3)}ms`);
console.log(`Average Day.js time:   ${avgDayjsTime.toFixed(3)}ms`);
console.log(`\n🎯 kk-date is ${overallImprovement}% faster than average of other libraries`);

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
