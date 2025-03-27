const kkDate = require('./index');

kkDate.caching({ status: true });
const timezone = 'Europe/Istanbul';
kkDate.config({ timezone });

const timestamp = 1724100659;

const sonuc = new kkDate(timestamp).format('X');
console.log(sonuc, timestamp);
console.log(timestamp - sonuc);
