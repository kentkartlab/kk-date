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
	expect(new kk_date(`${test_date} ${test_time}`).format('DD.MM.YYYY')).toBe('19.08.2024');
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
	expect(new kk_date(timestamp).format('YYYY-MM-DDTHH:mm:ss')).toBe('2024-08-19T23:50:59');
	expect(new kk_date(timestamp).format('X')).toBe(timestamp);
	expect(new kk_date(timestamp).format('x')).toBe(timestamp * 1000);
	expect(new kk_date(timestamp).format('YYYY-MM-DD HH:mm:ss')).toBe(`${test_date} ${test_time}`);
	expect(new kk_date(`${test_date} ${test_time}`).isAfter('2024-08-18')).toBe(true);
	expect(new kk_date(`${test_date} ${test_time}`).isSameOrAfter('2024-08-18')).toBe(true);
	expect(new kk_date(`${test_date} ${test_time}`).isBefore('2024-08-20')).toBe(true);
	expect(new kk_date(`${test_date} ${test_time}`).isBetween('2024-08-19', '2024-08-19 23:51')).toBe(true);
	expect(new kk_date(`${test_date} ${test_time}`).isValid()).toBe(true);
	expect(new kk_date(`${test_date} ${test_time}`).isSame(`${test_date} ${test_time}`)).toBe(true);
	expect(() => {
		new kk_date('asfasf1231231231asdasd').getDate();
	}).toThrow('Invalid Date');
	expect(() => {
		new kk_date(new Date('123123asdsad21231')).getDate();
	}).toThrow('Invalid Date');
	expect(() => {
		new kk_date(`${test_date} ${test_time}`).isSame('123123assadfa21312s');
	}).toThrow('Invalid Date');
});
