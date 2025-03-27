const kkDate = require('./index');

kkDate.config({
	locale: 'tr',
	timezone: 'Asia/Yekaterinburg',
});

console.log('With Yekaterinburg', new kkDate().format('YYYY-MM-DD HH:mm:ss'));

const date = new kkDate().config({
	timezone: 'Europe/Istanbul',
});

console.log('With Local', date.format('YYYY-MM-DD HH:mm:ss'));
