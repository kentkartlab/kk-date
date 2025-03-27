const kkDate = require('./index');

kkDate.config({
	locale: 'tr',
	timezone: 'Asia/Yekaterinburg',
});

const date = new kkDate('2024-01-01 00:00:00').config({
	locale: 'fr',
	timezone: 'Asia/Yekaterinburg',
});

console.log(date.format('DD MMM YYYY HH:mm'));
