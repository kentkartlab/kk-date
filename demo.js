const KkDate = require('./index');

const test_time = '23:50:59';
const test_date = '2024-08-19';

console.log(new KkDate(`${test_time}`, 'HH:mm:ss').tz('Europe/London').format('HH:mm:ss'), test_time);
console.log(new KkDate(`${test_date}`, 'YYYY-MM-DD').tz('Europe/London').format('YYYY-MM-DD HH:mm:ss'), test_date);
