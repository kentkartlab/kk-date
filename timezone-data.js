const timezoneData = {
	UTC: { standardOffset: 0, dstOffset: 0, dstRule: 'none' },
	GMT: { standardOffset: 0, dstOffset: 0, dstRule: 'none' },
	'Europe/Istanbul': { standardOffset: 3 * 3600, dstOffset: 2 * 3600 },
	'Asia/Qatar': { standardOffset: 3 * 3600, dstOffset: 0 },
	'Asia/Kuala_Lumpur': { standardOffset: 8 * 3600, dstOffset: 0 },
	'Asia/Yekaterinburg': { standardOffset: 5 * 3600, dstOffset: 0 },
};

module.exports = timezoneData;
