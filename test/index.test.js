const kk_date = require('../index');

test('GENERAL TEST', () => {
	const test_date = '2024-08-19';
	const test_time = '23:50:59';
	const timestamp = 1724100659;

	// Checking time parse and format with time;
	expect(new kk_date(`${test_time}`).format('HH:mm:ss')).toBe(`${test_time}`);
	expect(new kk_date(`${test_time}`).add(1, 'minutes').format('HH:mm:ss')).toBe('23:51:59');
	expect(new kk_date(`${test_date} ${test_time}`).format('HH:mm:ss')).toBe(`${test_time}`);
	expect(new kk_date(`${test_date} ${test_time}`).format('YYYY-MM-DD')).toBe(`${test_date}`);
	expect(new kk_date(`${test_date} ${test_time}`).format('YYYY-MM-DD HH:mm:ss')).toBe(`${test_date} ${test_time}`);
	expect(new kk_date(`${test_date} ${test_time}`).add(1, 'days').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-08-20 23:50:59');
	expect(new kk_date(`${test_date} ${test_time}`).add(1, 'months').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-09-19 23:50:59');
	expect(new kk_date(`${test_date} ${test_time}`).add(1, 'seconds').add(1, 'months').format('YYYY-MM-DD HH:mm:ss')).toBe('2024-09-19 23:51:00');
	expect(new kk_date(`${test_date}`).diff('2024-09-19', 'months')).toBe(1);
	expect(new kk_date(`${test_date}`).add(-1, 'months').diff('2024-09-19', 'months')).toBe(2);
	expect(new kk_date(`${test_date}`).add(-1, 'months').diff_range('2024-09-19', 'months')).toHaveLength(3);
	expect(new kk_date(`${test_date}`).add(-1, 'months').diff_range('2024-09-19', 'months')).toHaveLength(3);
	expect(new kk_date(`${test_date} ${test_time}`).format_c(' ', 'YYYY', 'MM', 'DD', 'HH:mm:ss')).toBe('2024 08 19 23:50:59');
	expect(new kk_date(`${test_date} ${test_time}`).format_c(' ', 'YYYY', 'MM', 'dddd', 'HH:mm:ss')).toBe('2024 08 monday 23:50:59');
	expect(new kk_date(`${test_date} ${test_time}`).format('dddd')).toBe('monday');
	expect(new kk_date(timestamp).format('dddd')).toBe('monday');
	expect(new kk_date(timestamp).format('YYYY-MM-DD')).toBe(`${test_date}`);
	expect(new kk_date(timestamp).format('YYYY-MM-DD HH:mm:ss')).toBe(`${test_date} ${test_time}`);
});
