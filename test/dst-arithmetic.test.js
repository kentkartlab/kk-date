const { describe, test, expect, afterAll } = require('@jest/globals');
const kk_date = require('../index');
const { runInZone } = require('./helpers/run-in-zone');

const SYSTEM_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const F = 'YYYY-MM-DD HH:mm:ss.SSS Z';

/**
 * DST-safe arithmetic. Every row runs through the instance path (.tz(zone)) and the global path
 * (config({ timezone: zone })); in CI the suite also runs with TZ set to several of these zones,
 * which exercises the system-timezone fast path for the same rows.
 *
 * Expected values come from Luxon as an independent oracle: a wall-clock result that a DST gap
 * skips moves forward by the gap, the date starts at its first instant and ends right before the
 * next date starts, and seconds/minutes/hours are absolute durations. Two America/Havana rows are
 * hand-verified instead, because Luxon is wrong there: DST ends at 01:00 -> 00:00, so Nov 3
 * 00:00-00:59 occurs twice; the date begins at the FIRST midnight and Nov 2 ends right before it
 * (Luxon returns the second midnight, and an "end of Nov 2" that is already dated Nov 3).
 *
 * [zone, start instant, operation, expected (format F in that zone)]
 */
const ROWS = [
	['America/Santiago', '2024-04-06T03:00:00.000Z', "add(1,'days')", '2024-04-07 00:00:00.000 -04:00'],
	['America/Santiago', '2024-04-06T15:00:00.000Z', "add(1,'days')", '2024-04-07 12:00:00.000 -04:00'],
	['America/Santiago', '2024-04-07T16:00:00.000Z', "startOf('days')", '2024-04-07 00:00:00.000 -04:00'],
	['America/Santiago', '2024-04-06T15:00:00.000Z', "endOf('days')", '2024-04-06 23:59:59.999 -04:00'],
	['America/Santiago', '2024-04-07T16:00:00.000Z', "endOf('days')", '2024-04-07 23:59:59.999 -04:00'],
	['America/Santiago', '2024-04-07T01:30:00.000Z', "add(5,'hours')", '2024-04-07 02:30:00.000 -04:00'],
	['America/Santiago', '2024-04-07T02:50:00.000Z', "add(200,'minutes')", '2024-04-07 02:10:00.000 -04:00'],
	['America/Santiago', '2024-04-07T02:59:30.000Z', "add(3600,'seconds')", '2024-04-06 23:59:30.000 -04:00'],
	['America/Santiago', '2024-09-07T04:00:00.000Z', "add(1,'days')", '2024-09-08 01:00:00.000 -03:00'],
	['America/Santiago', '2024-09-07T16:00:00.000Z', "add(1,'days')", '2024-09-08 12:00:00.000 -03:00'],
	['America/Santiago', '2024-09-08T15:00:00.000Z', "startOf('days')", '2024-09-08 01:00:00.000 -03:00'],
	['America/Santiago', '2024-09-07T16:00:00.000Z', "endOf('days')", '2024-09-07 23:59:59.999 -04:00'],
	['America/Santiago', '2024-09-08T15:00:00.000Z', "endOf('days')", '2024-09-08 23:59:59.999 -03:00'],
	['America/Santiago', '2024-09-08T02:30:00.000Z', "add(5,'hours')", '2024-09-08 04:30:00.000 -03:00'],
	['America/Santiago', '2024-09-08T03:50:00.000Z', "add(200,'minutes')", '2024-09-08 04:10:00.000 -03:00'],
	['America/Santiago', '2024-09-08T03:59:30.000Z', "add(3600,'seconds')", '2024-09-08 01:59:30.000 -03:00'],
	['Africa/Cairo', '2024-04-24T22:00:00.000Z', "add(1,'days')", '2024-04-26 01:00:00.000 +03:00'],
	['Africa/Cairo', '2024-04-25T10:00:00.000Z', "add(1,'days')", '2024-04-26 12:00:00.000 +03:00'],
	['Africa/Cairo', '2024-04-26T09:00:00.000Z', "startOf('days')", '2024-04-26 01:00:00.000 +03:00'],
	['Africa/Cairo', '2024-04-25T10:00:00.000Z', "endOf('days')", '2024-04-25 23:59:59.999 +02:00'],
	['Africa/Cairo', '2024-04-26T09:00:00.000Z', "endOf('days')", '2024-04-26 23:59:59.999 +03:00'],
	['Africa/Cairo', '2024-04-25T20:30:00.000Z', "add(5,'hours')", '2024-04-26 04:30:00.000 +03:00'],
	['Africa/Cairo', '2024-04-25T21:50:00.000Z', "add(200,'minutes')", '2024-04-26 04:10:00.000 +03:00'],
	['Africa/Cairo', '2024-04-25T21:59:30.000Z', "add(3600,'seconds')", '2024-04-26 01:59:30.000 +03:00'],
	['Africa/Cairo', '2024-10-30T21:00:00.000Z', "add(1,'days')", '2024-11-01 00:00:00.000 +02:00'],
	['Africa/Cairo', '2024-10-31T09:00:00.000Z', "add(1,'days')", '2024-11-01 12:00:00.000 +02:00'],
	['Africa/Cairo', '2024-11-01T10:00:00.000Z', "startOf('days')", '2024-11-01 00:00:00.000 +02:00'],
	['Africa/Cairo', '2024-10-31T09:00:00.000Z', "endOf('days')", '2024-10-31 23:59:59.999 +02:00'],
	['Africa/Cairo', '2024-11-01T10:00:00.000Z', "endOf('days')", '2024-11-01 23:59:59.999 +02:00'],
	['Africa/Cairo', '2024-10-31T19:30:00.000Z', "add(5,'hours')", '2024-11-01 02:30:00.000 +02:00'],
	['Africa/Cairo', '2024-10-31T20:50:00.000Z', "add(200,'minutes')", '2024-11-01 02:10:00.000 +02:00'],
	['Africa/Cairo', '2024-10-31T20:59:30.000Z', "add(3600,'seconds')", '2024-10-31 23:59:30.000 +02:00'],
	['Asia/Beirut', '2024-03-29T22:00:00.000Z', "add(1,'days')", '2024-03-31 01:00:00.000 +03:00'],
	['Asia/Beirut', '2024-03-30T10:00:00.000Z', "add(1,'days')", '2024-03-31 12:00:00.000 +03:00'],
	['Asia/Beirut', '2024-03-31T09:00:00.000Z', "startOf('days')", '2024-03-31 01:00:00.000 +03:00'],
	['Asia/Beirut', '2024-03-30T10:00:00.000Z', "endOf('days')", '2024-03-30 23:59:59.999 +02:00'],
	['Asia/Beirut', '2024-03-31T09:00:00.000Z', "endOf('days')", '2024-03-31 23:59:59.999 +03:00'],
	['Asia/Beirut', '2024-03-30T20:30:00.000Z', "add(5,'hours')", '2024-03-31 04:30:00.000 +03:00'],
	['Asia/Beirut', '2024-03-30T21:50:00.000Z', "add(200,'minutes')", '2024-03-31 04:10:00.000 +03:00'],
	['Asia/Beirut', '2024-03-30T21:59:30.000Z', "add(3600,'seconds')", '2024-03-31 01:59:30.000 +03:00'],
	['Asia/Beirut', '2024-10-25T21:00:00.000Z', "add(1,'days')", '2024-10-27 00:00:00.000 +02:00'],
	['Asia/Beirut', '2024-10-26T09:00:00.000Z', "add(1,'days')", '2024-10-27 12:00:00.000 +02:00'],
	['Asia/Beirut', '2024-10-27T10:00:00.000Z', "startOf('days')", '2024-10-27 00:00:00.000 +02:00'],
	['Asia/Beirut', '2024-10-26T09:00:00.000Z', "endOf('days')", '2024-10-26 23:59:59.999 +02:00'],
	['Asia/Beirut', '2024-10-27T10:00:00.000Z', "endOf('days')", '2024-10-27 23:59:59.999 +02:00'],
	['Asia/Beirut', '2024-10-26T19:30:00.000Z', "add(5,'hours')", '2024-10-27 02:30:00.000 +02:00'],
	['Asia/Beirut', '2024-10-26T20:50:00.000Z', "add(200,'minutes')", '2024-10-27 02:10:00.000 +02:00'],
	['Asia/Beirut', '2024-10-26T20:59:30.000Z', "add(3600,'seconds')", '2024-10-26 23:59:30.000 +02:00'],
	['Australia/Sydney', '2024-10-04T14:00:00.000Z', "add(1,'days')", '2024-10-06 00:00:00.000 +10:00'],
	['Australia/Sydney', '2024-10-05T02:00:00.000Z', "add(1,'days')", '2024-10-06 12:00:00.000 +11:00'],
	['Australia/Sydney', '2024-10-06T01:00:00.000Z', "startOf('days')", '2024-10-06 00:00:00.000 +10:00'],
	['Australia/Sydney', '2024-10-05T02:00:00.000Z', "endOf('days')", '2024-10-05 23:59:59.999 +10:00'],
	['Australia/Sydney', '2024-10-06T01:00:00.000Z', "endOf('days')", '2024-10-06 23:59:59.999 +11:00'],
	['Australia/Sydney', '2024-10-05T12:30:00.000Z', "add(5,'hours')", '2024-10-06 04:30:00.000 +11:00'],
	['Australia/Sydney', '2024-10-05T13:50:00.000Z', "add(200,'minutes')", '2024-10-06 04:10:00.000 +11:00'],
	['Australia/Sydney', '2024-10-05T13:59:30.000Z', "add(3600,'seconds')", '2024-10-06 00:59:30.000 +10:00'],
	['Australia/Sydney', '2024-04-05T13:00:00.000Z', "add(1,'days')", '2024-04-07 00:00:00.000 +11:00'],
	['Australia/Sydney', '2024-04-06T01:00:00.000Z', "add(1,'days')", '2024-04-07 12:00:00.000 +10:00'],
	['Australia/Sydney', '2024-04-07T02:00:00.000Z', "startOf('days')", '2024-04-07 00:00:00.000 +11:00'],
	['Australia/Sydney', '2024-04-06T01:00:00.000Z', "endOf('days')", '2024-04-06 23:59:59.999 +11:00'],
	['Australia/Sydney', '2024-04-07T02:00:00.000Z', "endOf('days')", '2024-04-07 23:59:59.999 +10:00'],
	['Australia/Sydney', '2024-04-06T11:30:00.000Z', "add(5,'hours')", '2024-04-07 02:30:00.000 +10:00'],
	['Australia/Sydney', '2024-04-06T12:50:00.000Z', "add(200,'minutes')", '2024-04-07 02:10:00.000 +10:00'],
	['Australia/Sydney', '2024-04-06T12:59:30.000Z', "add(3600,'seconds')", '2024-04-07 00:59:30.000 +11:00'],
	['Pacific/Auckland', '2024-09-27T12:00:00.000Z', "add(1,'days')", '2024-09-29 00:00:00.000 +12:00'],
	['Pacific/Auckland', '2024-09-28T00:00:00.000Z', "add(1,'days')", '2024-09-29 12:00:00.000 +13:00'],
	['Pacific/Auckland', '2024-09-28T23:00:00.000Z', "startOf('days')", '2024-09-29 00:00:00.000 +12:00'],
	['Pacific/Auckland', '2024-09-28T00:00:00.000Z', "endOf('days')", '2024-09-28 23:59:59.999 +12:00'],
	['Pacific/Auckland', '2024-09-28T23:00:00.000Z', "endOf('days')", '2024-09-29 23:59:59.999 +13:00'],
	['Pacific/Auckland', '2024-09-28T10:30:00.000Z', "add(5,'hours')", '2024-09-29 04:30:00.000 +13:00'],
	['Pacific/Auckland', '2024-09-28T11:50:00.000Z', "add(200,'minutes')", '2024-09-29 04:10:00.000 +13:00'],
	['Pacific/Auckland', '2024-09-28T11:59:30.000Z', "add(3600,'seconds')", '2024-09-29 00:59:30.000 +12:00'],
	['Pacific/Auckland', '2024-04-05T11:00:00.000Z', "add(1,'days')", '2024-04-07 00:00:00.000 +13:00'],
	['Pacific/Auckland', '2024-04-05T23:00:00.000Z', "add(1,'days')", '2024-04-07 12:00:00.000 +12:00'],
	['Pacific/Auckland', '2024-04-07T00:00:00.000Z', "startOf('days')", '2024-04-07 00:00:00.000 +13:00'],
	['Pacific/Auckland', '2024-04-05T23:00:00.000Z', "endOf('days')", '2024-04-06 23:59:59.999 +13:00'],
	['Pacific/Auckland', '2024-04-07T00:00:00.000Z', "endOf('days')", '2024-04-07 23:59:59.999 +12:00'],
	['Pacific/Auckland', '2024-04-06T09:30:00.000Z', "add(5,'hours')", '2024-04-07 02:30:00.000 +12:00'],
	['Pacific/Auckland', '2024-04-06T10:50:00.000Z', "add(200,'minutes')", '2024-04-07 02:10:00.000 +12:00'],
	['Pacific/Auckland', '2024-04-06T10:59:30.000Z', "add(3600,'seconds')", '2024-04-07 00:59:30.000 +13:00'],
	['Asia/Jerusalem', '2024-03-27T22:00:00.000Z', "add(1,'days')", '2024-03-29 00:00:00.000 +02:00'],
	['Asia/Jerusalem', '2024-03-28T10:00:00.000Z', "add(1,'days')", '2024-03-29 12:00:00.000 +03:00'],
	['Asia/Jerusalem', '2024-03-29T09:00:00.000Z', "startOf('days')", '2024-03-29 00:00:00.000 +02:00'],
	['Asia/Jerusalem', '2024-03-28T10:00:00.000Z', "endOf('days')", '2024-03-28 23:59:59.999 +02:00'],
	['Asia/Jerusalem', '2024-03-29T09:00:00.000Z', "endOf('days')", '2024-03-29 23:59:59.999 +03:00'],
	['Asia/Jerusalem', '2024-03-28T20:30:00.000Z', "add(5,'hours')", '2024-03-29 04:30:00.000 +03:00'],
	['Asia/Jerusalem', '2024-03-28T21:50:00.000Z', "add(200,'minutes')", '2024-03-29 04:10:00.000 +03:00'],
	['Asia/Jerusalem', '2024-03-28T21:59:30.000Z', "add(3600,'seconds')", '2024-03-29 00:59:30.000 +02:00'],
	['Europe/Chisinau', '2024-03-29T22:00:00.000Z', "add(1,'days')", '2024-03-31 00:00:00.000 +02:00'],
	['Europe/Chisinau', '2024-03-30T10:00:00.000Z', "add(1,'days')", '2024-03-31 12:00:00.000 +03:00'],
	['Europe/Chisinau', '2024-03-31T09:00:00.000Z', "startOf('days')", '2024-03-31 00:00:00.000 +02:00'],
	['Europe/Chisinau', '2024-03-30T10:00:00.000Z', "endOf('days')", '2024-03-30 23:59:59.999 +02:00'],
	['Europe/Chisinau', '2024-03-31T09:00:00.000Z', "endOf('days')", '2024-03-31 23:59:59.999 +03:00'],
	['Europe/Chisinau', '2024-03-30T20:30:00.000Z', "add(5,'hours')", '2024-03-31 04:30:00.000 +03:00'],
	['Europe/Chisinau', '2024-03-30T21:50:00.000Z', "add(200,'minutes')", '2024-03-31 04:10:00.000 +03:00'],
	['Europe/Chisinau', '2024-03-30T21:59:30.000Z', "add(3600,'seconds')", '2024-03-31 00:59:30.000 +02:00'],
	['America/Nuuk', '2024-10-26T01:00:00.000Z', "add(1,'days')", '2024-10-27 00:00:00.000 -02:00'],
	['America/Nuuk', '2024-10-26T13:00:00.000Z', "add(1,'days')", '2024-10-27 12:00:00.000 -02:00'],
	['America/Nuuk', '2024-10-27T14:00:00.000Z', "startOf('days')", '2024-10-27 00:00:00.000 -02:00'],
	['America/Nuuk', '2024-10-26T13:00:00.000Z', "endOf('days')", '2024-10-26 23:59:59.999 -02:00'],
	['America/Nuuk', '2024-10-27T14:00:00.000Z', "endOf('days')", '2024-10-27 23:59:59.999 -02:00'],
	['America/Nuuk', '2024-10-26T23:30:00.000Z', "add(5,'hours')", '2024-10-27 02:30:00.000 -02:00'],
	['America/Nuuk', '2024-10-27T00:50:00.000Z', "add(200,'minutes')", '2024-10-27 02:10:00.000 -02:00'],
	['America/Nuuk', '2024-10-27T00:59:30.000Z', "add(3600,'seconds')", '2024-10-26 23:59:30.000 -02:00'],
	['America/Havana', '2024-11-02T04:00:00.000Z', "add(1,'days')", '2024-11-03 00:00:00.000 -04:00'],
	['America/Havana', '2024-11-02T16:00:00.000Z', "add(1,'days')", '2024-11-03 12:00:00.000 -05:00'],
	['America/Havana', '2024-11-03T17:00:00.000Z', "startOf('days')", '2024-11-03 00:00:00.000 -04:00'], // hand-verified, see header
	['America/Havana', '2024-11-02T16:00:00.000Z', "endOf('days')", '2024-11-02 23:59:59.999 -04:00'], // hand-verified, see header
	['America/Havana', '2024-11-03T17:00:00.000Z', "endOf('days')", '2024-11-03 23:59:59.999 -05:00'],
	['America/Havana', '2024-11-03T02:30:00.000Z', "add(5,'hours')", '2024-11-03 02:30:00.000 -05:00'],
	['America/Havana', '2024-11-03T03:50:00.000Z', "add(200,'minutes')", '2024-11-03 02:10:00.000 -05:00'],
	['America/Havana', '2024-11-03T03:59:30.000Z', "add(3600,'seconds')", '2024-11-03 00:59:30.000 -04:00'],
	['America/New_York', '2024-03-09T05:00:00.000Z', "add(1,'days')", '2024-03-10 00:00:00.000 -05:00'],
	['America/New_York', '2024-03-09T17:00:00.000Z', "add(1,'days')", '2024-03-10 12:00:00.000 -04:00'],
	['America/New_York', '2024-03-10T16:00:00.000Z', "startOf('days')", '2024-03-10 00:00:00.000 -05:00'],
	['America/New_York', '2024-03-09T17:00:00.000Z', "endOf('days')", '2024-03-09 23:59:59.999 -05:00'],
	['America/New_York', '2024-03-10T16:00:00.000Z', "endOf('days')", '2024-03-10 23:59:59.999 -04:00'],
	['America/New_York', '2024-03-10T03:30:00.000Z', "add(5,'hours')", '2024-03-10 04:30:00.000 -04:00'],
	['America/New_York', '2024-03-10T04:50:00.000Z', "add(200,'minutes')", '2024-03-10 04:10:00.000 -04:00'],
	['America/New_York', '2024-03-10T04:59:30.000Z', "add(3600,'seconds')", '2024-03-10 00:59:30.000 -05:00'],
	['America/New_York', '2024-11-02T04:00:00.000Z', "add(1,'days')", '2024-11-03 00:00:00.000 -04:00'],
	['America/New_York', '2024-11-02T16:00:00.000Z', "add(1,'days')", '2024-11-03 12:00:00.000 -05:00'],
	['America/New_York', '2024-11-03T17:00:00.000Z', "startOf('days')", '2024-11-03 00:00:00.000 -04:00'],
	['America/New_York', '2024-11-02T16:00:00.000Z', "endOf('days')", '2024-11-02 23:59:59.999 -04:00'],
	['America/New_York', '2024-11-03T17:00:00.000Z', "endOf('days')", '2024-11-03 23:59:59.999 -05:00'],
	['America/New_York', '2024-11-03T02:30:00.000Z', "add(5,'hours')", '2024-11-03 02:30:00.000 -05:00'],
	['America/New_York', '2024-11-03T03:50:00.000Z', "add(200,'minutes')", '2024-11-03 02:10:00.000 -05:00'],
	['America/New_York', '2024-11-03T03:59:30.000Z', "add(3600,'seconds')", '2024-11-03 00:59:30.000 -04:00'],
	['Europe/Berlin', '2024-03-29T23:00:00.000Z', "add(1,'days')", '2024-03-31 00:00:00.000 +01:00'],
	['Europe/Berlin', '2024-03-30T11:00:00.000Z', "add(1,'days')", '2024-03-31 12:00:00.000 +02:00'],
	['Europe/Berlin', '2024-03-31T10:00:00.000Z', "startOf('days')", '2024-03-31 00:00:00.000 +01:00'],
	['Europe/Berlin', '2024-03-30T11:00:00.000Z', "endOf('days')", '2024-03-30 23:59:59.999 +01:00'],
	['Europe/Berlin', '2024-03-31T10:00:00.000Z', "endOf('days')", '2024-03-31 23:59:59.999 +02:00'],
	['Europe/Berlin', '2024-03-30T21:30:00.000Z', "add(5,'hours')", '2024-03-31 04:30:00.000 +02:00'],
	['Europe/Berlin', '2024-03-30T22:50:00.000Z', "add(200,'minutes')", '2024-03-31 04:10:00.000 +02:00'],
	['Europe/Berlin', '2024-03-30T22:59:30.000Z', "add(3600,'seconds')", '2024-03-31 00:59:30.000 +01:00'],
	['Europe/London', '2024-10-25T23:00:00.000Z', "add(1,'days')", '2024-10-27 00:00:00.000 +01:00'],
	['Europe/London', '2024-10-26T11:00:00.000Z', "add(1,'days')", '2024-10-27 12:00:00.000 +00:00'],
	['Europe/London', '2024-10-27T12:00:00.000Z', "startOf('days')", '2024-10-27 00:00:00.000 +01:00'],
	['Europe/London', '2024-10-26T11:00:00.000Z', "endOf('days')", '2024-10-26 23:59:59.999 +01:00'],
	['Europe/London', '2024-10-27T12:00:00.000Z', "endOf('days')", '2024-10-27 23:59:59.999 +00:00'],
	['Europe/London', '2024-10-26T21:30:00.000Z', "add(5,'hours')", '2024-10-27 02:30:00.000 +00:00'],
	['Europe/London', '2024-10-26T22:50:00.000Z', "add(200,'minutes')", '2024-10-27 02:10:00.000 +00:00'],
	['Europe/London', '2024-10-26T22:59:30.000Z', "add(3600,'seconds')", '2024-10-27 00:59:30.000 +01:00'],
	['Australia/Lord_Howe', '2024-10-04T13:30:00.000Z', "add(1,'days')", '2024-10-06 00:00:00.000 +10:30'],
	['Australia/Lord_Howe', '2024-10-05T01:30:00.000Z', "add(1,'days')", '2024-10-06 12:00:00.000 +11:00'],
	['Australia/Lord_Howe', '2024-10-06T01:00:00.000Z', "startOf('days')", '2024-10-06 00:00:00.000 +10:30'],
	['Australia/Lord_Howe', '2024-10-05T01:30:00.000Z', "endOf('days')", '2024-10-05 23:59:59.999 +10:30'],
	['Australia/Lord_Howe', '2024-10-06T01:00:00.000Z', "endOf('days')", '2024-10-06 23:59:59.999 +11:00'],
	['Australia/Lord_Howe', '2024-10-05T12:00:00.000Z', "add(5,'hours')", '2024-10-06 04:00:00.000 +11:00'],
	['Australia/Lord_Howe', '2024-10-05T13:20:00.000Z', "add(200,'minutes')", '2024-10-06 03:40:00.000 +11:00'],
	['Australia/Lord_Howe', '2024-10-05T13:29:30.000Z', "add(3600,'seconds')", '2024-10-06 00:59:30.000 +10:30'],
	['Australia/Lord_Howe', '2024-04-05T13:00:00.000Z', "add(1,'days')", '2024-04-07 00:00:00.000 +11:00'],
	['Australia/Lord_Howe', '2024-04-06T01:00:00.000Z', "add(1,'days')", '2024-04-07 12:00:00.000 +10:30'],
	['Australia/Lord_Howe', '2024-04-07T01:30:00.000Z', "startOf('days')", '2024-04-07 00:00:00.000 +11:00'],
	['Australia/Lord_Howe', '2024-04-06T01:00:00.000Z', "endOf('days')", '2024-04-06 23:59:59.999 +11:00'],
	['Australia/Lord_Howe', '2024-04-07T01:30:00.000Z', "endOf('days')", '2024-04-07 23:59:59.999 +10:30'],
	['Australia/Lord_Howe', '2024-04-06T11:30:00.000Z', "add(5,'hours')", '2024-04-07 03:00:00.000 +10:30'],
	['Australia/Lord_Howe', '2024-04-06T12:50:00.000Z', "add(200,'minutes')", '2024-04-07 02:40:00.000 +10:30'],
	['Australia/Lord_Howe', '2024-04-06T12:59:30.000Z', "add(3600,'seconds')", '2024-04-07 00:59:30.000 +11:00'],
	['America/New_York', '2024-01-15T15:00:00.000Z', "set('months',6)", '2024-07-15 10:00:00.000 -04:00'],
	['America/New_York', '2024-07-15T14:00:00.000Z', "set('months',0)", '2024-01-15 10:00:00.000 -05:00'],
	['America/New_York', '2024-01-31T15:00:00.000Z', "set('months',1)", '2024-02-29 10:00:00.000 -05:00'],
	['America/New_York', '2024-01-15T15:00:00.000Z', "add(6,'months')", '2024-07-15 10:00:00.000 -04:00'],
	['America/New_York', '2024-01-15T15:00:00.000Z', "startOf('years')", '2024-01-01 00:00:00.000 -05:00'],
	['America/New_York', '2024-07-15T14:00:00.000Z', "endOf('months')", '2024-07-31 23:59:59.999 -04:00'],
	['Europe/London', '2024-01-15T10:00:00.000Z', "set('months',6)", '2024-07-15 10:00:00.000 +01:00'],
	['Europe/London', '2024-07-15T09:00:00.000Z', "set('months',0)", '2024-01-15 10:00:00.000 +00:00'],
	['Europe/London', '2024-01-31T10:00:00.000Z', "set('months',1)", '2024-02-29 10:00:00.000 +00:00'],
	['Europe/London', '2024-01-15T10:00:00.000Z', "add(6,'months')", '2024-07-15 10:00:00.000 +01:00'],
	['Europe/London', '2024-01-15T10:00:00.000Z', "startOf('years')", '2024-01-01 00:00:00.000 +00:00'],
	['Europe/London', '2024-07-15T09:00:00.000Z', "endOf('months')", '2024-07-31 23:59:59.999 +01:00'],
	['Australia/Sydney', '2024-01-14T23:00:00.000Z', "set('months',6)", '2024-07-15 10:00:00.000 +10:00'],
	['Australia/Sydney', '2024-07-15T00:00:00.000Z', "set('months',0)", '2024-01-15 10:00:00.000 +11:00'],
	['Australia/Sydney', '2024-01-30T23:00:00.000Z', "set('months',1)", '2024-02-29 10:00:00.000 +11:00'],
	['Australia/Sydney', '2024-01-14T23:00:00.000Z', "add(6,'months')", '2024-07-15 10:00:00.000 +10:00'],
	['Australia/Sydney', '2024-01-14T23:00:00.000Z', "startOf('years')", '2024-01-01 00:00:00.000 +11:00'],
	['Australia/Sydney', '2024-07-15T00:00:00.000Z', "endOf('months')", '2024-07-31 23:59:59.999 +10:00'],
	['America/Santiago', '2024-01-15T13:00:00.000Z', "set('months',6)", '2024-07-15 10:00:00.000 -04:00'],
	['America/Santiago', '2024-07-15T14:00:00.000Z', "set('months',0)", '2024-01-15 10:00:00.000 -03:00'],
	['America/Santiago', '2024-01-31T13:00:00.000Z', "set('months',1)", '2024-02-29 10:00:00.000 -03:00'],
	['America/Santiago', '2024-01-15T13:00:00.000Z', "add(6,'months')", '2024-07-15 10:00:00.000 -04:00'],
	['America/Santiago', '2024-01-15T13:00:00.000Z', "startOf('years')", '2024-01-01 00:00:00.000 -03:00'],
	['America/Santiago', '2024-07-15T14:00:00.000Z', "endOf('months')", '2024-07-31 23:59:59.999 -04:00'],
	['Europe/Istanbul', '2024-01-15T07:00:00.000Z', "set('months',6)", '2024-07-15 10:00:00.000 +03:00'],
	['Europe/Istanbul', '2024-07-15T07:00:00.000Z', "set('months',0)", '2024-01-15 10:00:00.000 +03:00'],
	['Europe/Istanbul', '2024-01-31T07:00:00.000Z', "set('months',1)", '2024-02-29 10:00:00.000 +03:00'],
	['Europe/Istanbul', '2024-01-15T07:00:00.000Z', "add(6,'months')", '2024-07-15 10:00:00.000 +03:00'],
	['Europe/Istanbul', '2024-01-15T07:00:00.000Z', "startOf('years')", '2024-01-01 00:00:00.000 +03:00'],
	['Europe/Istanbul', '2024-07-15T07:00:00.000Z', "endOf('months')", '2024-07-31 23:59:59.999 +03:00'],
];

const OPS = {
	"add(1,'days')": (d) => d.add(1, 'days'),
	"startOf('days')": (d) => d.startOf('days'),
	"endOf('days')": (d) => d.endOf('days'),
	"add(5,'hours')": (d) => d.add(5, 'hours'),
	"add(200,'minutes')": (d) => d.add(200, 'minutes'),
	"add(3600,'seconds')": (d) => d.add(3600, 'seconds'),
	"set('months',6)": (d) => d.set('months', 6),
	"set('months',0)": (d) => d.set('months', 0),
	"set('months',1)": (d) => d.set('months', 1),
	"add(6,'months')": (d) => d.add(6, 'months'),
	"startOf('years')": (d) => d.startOf('years'),
	"endOf('months')": (d) => d.endOf('months'),
};

// Local calendar date of an instant in a zone, straight from Intl (independent of kk-date).
const intlDate = (zone, ms) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const intlWall = (zone, ms) =>
	new Intl.DateTimeFormat('sv-SE', {
		timeZone: zone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	}).format(new Date(ms));

describe('DST transitions: instance timezone (.tz)', () => {
	test.each(ROWS)('%s %s %s', (zone, start, op, expected) => {
		expect(OPS[op](new kk_date(start).tz(zone)).format(F)).toBe(expected);
	});
});

describe('DST transitions: global timezone (config)', () => {
	afterAll(() => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});
	test.each(ROWS)('%s %s %s', (zone, start, op, expected) => {
		kk_date.config({ timezone: zone });
		expect(OPS[op](new kk_date(start)).format(F)).toBe(expected);
	});
});

describe('reported bug: add(n, "days") from midnight onto a DST change day', () => {
	afterAll(() => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});
	test('America/Santiago: DST ends at midnight (24:00 -> 23:00)', () => {
		kk_date.config({ timezone: 'America/Santiago' });
		expect(new kk_date('2024-04-06 00:00:00').add(1, 'days').format('YYYY-MM-DD HH:mm Z')).toBe('2024-04-07 00:00 -04:00');
		expect(new kk_date('2024-04-05 00:00:00').add(2, 'days').format('YYYY-MM-DD HH:mm Z')).toBe('2024-04-07 00:00 -04:00');
		expect(new kk_date('2024-04-07 12:00:00').startOf('days').format('YYYY-MM-DD HH:mm Z')).toBe('2024-04-07 00:00 -04:00');
	});
	test('Australia/Sydney: DST starts at 02:00 (east of UTC, previously wrong as well)', () => {
		kk_date.config({ timezone: 'Australia/Sydney' });
		expect(new kk_date('2024-10-05 00:00:00').add(1, 'days').format('YYYY-MM-DD HH:mm Z')).toBe('2024-10-06 00:00 +10:00');
		expect(new kk_date('2024-10-06 12:00:00').startOf('days').format('YYYY-MM-DD HH:mm Z')).toBe('2024-10-06 00:00 +10:00');
	});
	test('a midnight skipped by DST resolves to the first instant of the day (Africa/Cairo)', () => {
		kk_date.config({ timezone: 'Africa/Cairo' });
		expect(new kk_date('2024-04-25 00:00:00').add(1, 'days').format('YYYY-MM-DD HH:mm Z')).toBe('2024-04-26 01:00 +03:00');
	});
});

// Property checks over every day of 2024-2026 for zones whose transitions sit near midnight or east
// of UTC — the configurations that broke. Intl is the oracle.
const SCAN_ZONES = [
	'America/Santiago',
	'Africa/Cairo',
	'Asia/Beirut',
	'Australia/Sydney',
	'Pacific/Auckland',
	'Asia/Jerusalem',
	'America/Havana',
	'Europe/Berlin',
];

describe('every local midnight of 2024-2026: add(1, "days") and startOf("days")', () => {
	test.each(SCAN_ZONES)('%s', (zone) => {
		const failures = [];
		// start at the first instant of 2024-01-01 in the zone and walk day by day
		let midnight = new kk_date(Date.UTC(2023, 11, 31, 12)).tz(zone).add(1, 'days').startOf('days').getTime();
		for (let day = 0; day < 1096; day++) {
			const date = intlDate(zone, midnight);
			// the first instant of a date: one millisecond earlier is still the previous date
			if (intlDate(zone, midnight - 1) === date) {
				failures.push(`startOf(${date}) is not the first instant of the day`);
			}
			const next = new kk_date(midnight).tz(zone).add(1, 'days');
			const expectedNext = intlDate(zone, midnight + 36 * 3600000);
			const nextDate = intlDate(zone, next.getTime());
			if (
				nextDate !== expectedNext ||
				new kk_date(midnight).tz(zone).endOf('days').getTime() !== new kk_date(next.getTime()).tz(zone).startOf('days').getTime() - 1
			) {
				failures.push(`${date} + 1 day -> ${nextDate} (expected ${expectedNext})`);
			}
			midnight = next.startOf('days').getTime();
		}
		expect(failures).toEqual([]);
	});
});

describe('global-timezone parsing of every wall-clock time around DST transitions', () => {
	afterAll(() => {
		kk_date.config({ timezone: SYSTEM_TIMEZONE });
	});
	const TRANSITION_DAYS = [
		['America/New_York', '2024-03-10'],
		['America/New_York', '2024-11-03'],
		['Europe/Berlin', '2024-03-31'],
		['Europe/Berlin', '2024-10-27'],
		['Australia/Sydney', '2024-04-06'],
		['Australia/Sydney', '2024-04-07'],
		['Australia/Sydney', '2024-10-05'],
		['Australia/Sydney', '2024-10-06'],
		['America/Santiago', '2024-04-06'],
		['America/Santiago', '2024-09-08'],
		['Europe/Istanbul', '2024-03-31'],
	];
	test.each(TRANSITION_DAYS)('%s %s', (zone, day) => {
		kk_date.config({ timezone: zone });
		const failures = [];
		for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
			const wall = `${day} ${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;
			const parsed = new kk_date(wall);
			const shown = intlWall(zone, parsed.getTime());
			// existing wall times come back unchanged; times a DST gap skips move forward by the gap
			if (shown !== wall && !(shown > wall && shown.slice(0, 10) === day)) {
				failures.push(`${wall} -> ${shown}`);
			}
		}
		expect(failures).toEqual([]);
	});
});

/**
 * add() / set() results that land on a wall clock occurring twice (DST overlap) stay on the side
 * of the change the original instant was on, when that reading exists: moment-timezone and Luxon
 * agree on every row (generated from both; parsing a repeated time, which has no original instant,
 * still gives the earlier one). Each row runs through the instance path (.tz) here and through the
 * system-timezone fast path in a child process whose TZ is the zone.
 *
 * [zone, start instant, operation, expected instant]
 */
const OVERLAP_ROWS = [
	['America/New_York', '2024-11-03T06:30:00.000Z', "set('minutes', 0)", '2024-11-03T06:00:00.000Z'],
	['America/New_York', '2024-11-03T05:30:00.000Z', "set('minutes', 0)", '2024-11-03T05:00:00.000Z'],
	['America/New_York', '2024-11-04T06:30:00.000Z', "add(-1, 'days')", '2024-11-03T06:30:00.000Z'],
	['America/New_York', '2024-11-02T05:30:00.000Z', "add(1, 'days')", '2024-11-03T05:30:00.000Z'],
	['America/New_York', '2024-11-10T06:30:00.000Z', "add(-1, 'weeks')", '2024-11-03T06:30:00.000Z'],
	['America/New_York', '2024-10-27T05:30:00.000Z', "add(1, 'weeks')", '2024-11-03T05:30:00.000Z'],
	['America/New_York', '2025-11-03T06:30:00.000Z', "add(-1, 'years')", '2024-11-03T06:30:00.000Z'],
	['America/New_York', '2023-11-03T05:30:00.000Z', "add(1, 'years')", '2024-11-03T05:30:00.000Z'],
	['Europe/London', '2024-10-27T01:30:00.000Z', "set('minutes', 0)", '2024-10-27T01:00:00.000Z'],
	['Europe/London', '2024-10-27T00:30:00.000Z', "set('minutes', 0)", '2024-10-27T00:00:00.000Z'],
	['Europe/London', '2024-10-28T01:30:00.000Z', "add(-1, 'days')", '2024-10-27T01:30:00.000Z'],
	['Europe/London', '2024-10-26T00:30:00.000Z', "add(1, 'days')", '2024-10-27T00:30:00.000Z'],
	['Europe/London', '2024-11-27T01:30:00.000Z', "add(-1, 'months')", '2024-10-27T01:30:00.000Z'],
	['Europe/London', '2024-09-27T00:30:00.000Z', "add(1, 'months')", '2024-10-27T00:30:00.000Z'],
	['Australia/Lord_Howe', '2024-04-07T15:15:00.000Z', "add(-1, 'days')", '2024-04-06T15:15:00.000Z'],
	['Australia/Lord_Howe', '2024-04-05T14:45:00.000Z', "add(1, 'days')", '2024-04-06T14:45:00.000Z'],
	['Australia/Lord_Howe', '2025-04-06T15:15:00.000Z', "add(-1, 'years')", '2024-04-06T15:15:00.000Z'],
	['Pacific/Chatham', '2024-04-06T14:30:00.000Z', "set('minutes', 0)", '2024-04-06T14:15:00.000Z'],
	['Pacific/Chatham', '2024-04-06T13:30:00.000Z', "set('minutes', 0)", '2024-04-06T13:15:00.000Z'],
	['Pacific/Chatham', '2024-04-07T14:30:00.000Z', "add(-1, 'days')", '2024-04-06T14:30:00.000Z'],
	['Pacific/Chatham', '2024-04-05T13:30:00.000Z', "add(1, 'days')", '2024-04-06T13:30:00.000Z'],
	['America/Havana', '2024-11-03T05:30:00.000Z', "set('minutes', 0)", '2024-11-03T05:00:00.000Z'],
	['America/Havana', '2024-11-03T04:30:00.000Z', "set('minutes', 0)", '2024-11-03T04:00:00.000Z'],
	['America/Havana', '2024-11-04T05:30:00.000Z', "add(-1, 'days')", '2024-11-03T05:30:00.000Z'],
	['America/Havana', '2024-11-02T04:30:00.000Z', "add(1, 'days')", '2024-11-03T04:30:00.000Z'],
	['Asia/Beirut', '2024-10-26T21:30:00.000Z', "set('minutes', 0)", '2024-10-26T21:00:00.000Z'],
	['Asia/Beirut', '2024-10-26T20:30:00.000Z', "set('minutes', 0)", '2024-10-26T20:00:00.000Z'],
	['Asia/Beirut', '2024-11-26T21:30:00.000Z', "add(-1, 'months')", '2024-10-26T21:30:00.000Z'],
	['Asia/Beirut', '2024-09-26T20:30:00.000Z', "add(1, 'months')", '2024-10-26T20:30:00.000Z'],
	['America/Santiago', '2024-04-07T03:30:00.000Z', "set('minutes', 0)", '2024-04-07T03:00:00.000Z'],
	['America/Santiago', '2024-04-07T02:30:00.000Z', "set('minutes', 0)", '2024-04-07T02:00:00.000Z'],
	['America/Santiago', '2024-04-08T03:30:00.000Z', "add(-1, 'days')", '2024-04-07T03:30:00.000Z'],
	['America/Santiago', '2024-04-06T02:30:00.000Z', "add(1, 'days')", '2024-04-07T02:30:00.000Z'],
	['Australia/Sydney', '2024-04-06T16:30:00.000Z', "set('minutes', 0)", '2024-04-06T16:00:00.000Z'],
	['Australia/Sydney', '2024-04-06T15:30:00.000Z', "set('minutes', 0)", '2024-04-06T15:00:00.000Z'],
	['Australia/Sydney', '2024-04-13T16:30:00.000Z', "add(-1, 'weeks')", '2024-04-06T16:30:00.000Z'],
	['Australia/Sydney', '2024-03-30T15:30:00.000Z', "add(1, 'weeks')", '2024-04-06T15:30:00.000Z'],
];

/**
 * @param {KkDate} date
 * @param {string} operation - e.g. "add(-1, 'days')"
 * @returns {KkDate}
 */
function applyOperation(date, operation) {
	const [, method, args] = /^(\w+)\((.*)\)$/.exec(operation);
	return date[method](...JSON.parse(`[${args.replace(/'/g, '"')}]`));
}

describe('add/set onto a repeated wall clock keep the side of the original instant', () => {
	test.each(OVERLAP_ROWS)('%s %s %s (instance timezone)', (zone, start, operation, expected) => {
		expect(new Date(applyOperation(new kk_date(start).tz(zone), operation).getTime()).toISOString()).toBe(expected);
	});

	test.each([...new Set(OVERLAP_ROWS.map((row) => row[0]))])('%s (system timezone fast path)', (zone) => {
		const rows = OVERLAP_ROWS.filter((row) => row[0] === zone);
		const out = runInZone(
			zone,
			`${applyOperation.toString()}
			return ${JSON.stringify(rows)}.map(([, start, operation]) => new Date(applyOperation(new kk_date(start), operation).getTime()).toISOString());`,
		);
		expect(out).toEqual(rows.map((row) => row[3]));
	});

	test('setting a field to its current value or adding a fraction that rounds to 0 changes nothing', () => {
		// 01:30 EST, the second 01:30 of New York's fall-back night (moment: add(0.4, 'days') adds 0 days)
		const second = '2024-11-03T06:30:00.000Z';
		for (const operation of [
			"set('minutes', 30)",
			"set('hours', 1)",
			"add(0.4, 'days')",
			"add(0.3, 'months')",
			"add(0.04, 'years')",
			"add(0.05, 'weeks')",
		]) {
			expect(`${operation} ${new Date(applyOperation(new kk_date(second).tz('America/New_York'), operation).getTime()).toISOString()}`).toBe(
				`${operation} ${second}`,
			);
		}
		const out = runInZone(
			'America/New_York',
			`${applyOperation.toString()}
			return ["set('minutes', 30)", "add(0.4, 'days')", "add(0.3, 'months')"].map((operation) => new Date(applyOperation(new kk_date('${second}'), operation).getTime()).toISOString());`,
		);
		expect(out).toEqual([second, second, second]);
	});
});

describe('set() takes the integer part of months and years like the native setters and moment', () => {
	// native Date: d.setMonth(-0.5) is January (ToIntegerOrInfinity); moment: set('month', -0.5) too
	const rows = [
		["set('months', -0.5)", '2024-01-15 10:00'],
		["set('months', -1.5)", '2023-12-15 10:00'],
		["set('months', 12.5)", '2025-01-15 10:00'],
		["set('years', 2025.9)", '2025-06-15 10:00'],
	];
	test.each(rows)('%s (instance timezone)', (operation, expected) => {
		expect(applyOperation(new kk_date('2024-06-15T01:00:00Z').tz('Asia/Tokyo'), operation).format('YYYY-MM-DD HH:mm')).toBe(expected);
	});
	test('system timezone fast path', () => {
		const out = runInZone(
			'Asia/Tokyo',
			`${applyOperation.toString()}
			return ${JSON.stringify(rows.map((row) => row[0]))}.map((operation) => applyOperation(new kk_date('2024-06-15 10:00:00'), operation).format('YYYY-MM-DD HH:mm'));`,
		);
		expect(out).toEqual(rows.map((row) => row[1]));
	});
});
