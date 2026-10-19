# kk-date API Reference

Complete reference for all kk-date methods, properties, and configuration options.

> **Timezone note for examples:** A naive date string like `'2024-08-23 10:00:00'` is parsed in the
> **process's local timezone**. The outputs shown below assume the process timezone is **UTC** (run with
> `TZ=UTC`, or call `kk_date.setTimezone('UTC')`). Pass an absolute instant (ISO-8601 with `Z`) when you need
> the same result on every machine. Some values (`toString()`, timezone abbreviations) also depend on the
> runtime's ICU data and may differ across Node versions/platforms.

## Table of Contents

- [Constructor](#constructor)
- [Instance Methods](#instance-methods)
  - [Formatting Methods](#formatting-methods)
  - [Manipulation Methods](#manipulation-methods)
  - [Comparison Methods](#comparison-methods)
  - [Timezone Methods](#timezone-methods)
  - [Utility Methods](#utility-methods)
- [Static Methods](#static-methods)
- [Properties](#properties)
- [Configuration](#configuration)

## Constructor

### `new kk_date(date?, date_format?)`

Creates a new kk-date instance.

**Parameters:**
- `date` (string|Date|kk_date|number, optional) - Date input to parse. If omitted, uses current date
- `date_format` (string, optional) - A predefined template the input must match (any key of
  `format_types` in constants.js, e.g. `'DD/MM/YYYY'`, `'YYYY-MM-DD HH:mm'`, `'DD MMMM YYYY'`,
  `'hh:mm'`, `'MMMM'`). The template's fields define the date and missing fields follow moment:
  - no date field at all (`'HH:mm'`, `'mm:ss'`) → today;
  - a missing year → the current year;
  - a missing month → the current month when a day is given (`'DD'`), otherwise January (`'YYYY'`, `'MMMM YYYY'` → the 1st);
  - a missing day → the 1st;
  - a bare weekday name (`'dddd'`, `'ddd'`) → that day of the current week;
  - missing time fields → 0;
  - a 2-digit year in a `YYYY` field → 2000-2068 for `00`-`68`, 1969-1999 for `69`-`99` (moment):
    `new kk_date('12-11-10', 'DD-MM-YYYY')` is 2010-11-12.

  "Today" is the date in the global timezone. An unsupported template throws
  `Unsupported Format! … !`, an input that does not match it `Invalid format ! … !`.

**Supported Input Formats:**
```javascript
// ISO 8601 strings
new kk_date('2024-08-23T10:30:00.000Z')
new kk_date('2024-08-23T10:30:00+03:00')

// Date strings
new kk_date('2024-08-23 10:30:00')
new kk_date('23.08.2024 10:30:00')
new kk_date('08/23/2024 10:30:00')   // auto-detected slash dates use the engine's (US) order

// Compact formats
new kk_date('20240823')           // YYYYMMDD
new kk_date('20240823103000')     // YYYYMMDDHHmmss

// Text dates (month names in ~90 languages; the configured locale's language wins on clashes)
new kk_date('23 August 2024')
new kk_date('Friday, 23 August 2024 14:30')   // a trailing time is kept
new kk_date('Pazartesi, 15 Ocak 2024 14:30')  // also in other languages
new kk_date('Fri, 23 Aug 2024 10:30:00 GMT')  // RFC 2822 / HTTP date

// Other forms the JavaScript engine itself parses ('08/23/2024 10:30', 'Aug 23, 2024 10:30 PM');
// an ES5 date-only form such as '2024' or '+002024-08-23' is a date (midnight in the global
// timezone), not the engine's UTC midnight

// Date objects
new kk_date(new Date())

// kk_date objects
new kk_date(existingKkDate)

// Timestamps: up to 10 digits (sign included) are Unix seconds, longer values milliseconds;
// fractional values follow the same rule on their integer part
new kk_date(1724407200)      // Unix timestamp (seconds)
new kk_date(1724407200000)   // JavaScript timestamp (milliseconds)
new kk_date(1724407200.5)    // 1724407200500 ms

// With an explicit template (applied for every predefined template)
new kk_date('2024-23-08', 'YYYY-DD-MM')
new kk_date('23/08/2024', 'DD/MM/YYYY')   // day first
new kk_date('2024-08-23 14', 'YYYY-MM-DD HH')
new kk_date('August', 'MMMM')            // August 1 of the current year
```

**Absolute vs naive inputs:** strings that carry their own offset or zone (`Z`, `+03:00`,
`+0300`, `+3`, `GMT`, `UTC`, `GMT+0300`, US zone names such as `EST`, `Date#toString()` output) are
absolute instants and are never reinterpreted in the global timezone (`detected_format` is
`'ISO8601'` or `'RFC2822'`); whether a string has a zone is decided exactly as the engine's own date
parser decides it. All other strings are naive wall-clock times read in the global timezone (see
[Timezone Guide](TIMEZONE-GUIDE.md)).

**Invalid input** throws `Error('Invalid Date')` — including text with trailing junk such as
`'1st Jan 2024 foo'`.

**Configuration (after creation):**
```javascript
const date = new kk_date('2024-08-23');
date.config({
    timezone: 'America/New_York',  // Instance timezone
    locale: 'tr',                  // Instance locale
    weekStartDay: 1                // Instance week start day
});
```

**Examples:**
```javascript
// Basic usage
const date = new kk_date('2024-08-23 10:30:00');

// With timezone
const nyDate = new kk_date('2024-08-23 10:30:00');
nyDate.config({ timezone: 'America/New_York' });

// Current date
const now = new kk_date();

// With format specification
const formatted = new kk_date('2024-23-08', 'YYYY-DD-MM');

// ISO string
const utcDate = new kk_date('2024-08-23T10:30:00.000Z');
```

## Instance Methods

### Formatting Methods

#### `format(template)`

Formats the date according to the specified template. Templates are compiled dynamically:
any combination of the tokens below works, in any order, with any separator characters
(literal words go in `[square brackets]`). Compiled templates are cached, so custom
combinations are as fast as the predefined ones.

**Parameters:**
- `template` (string) - Format template

**Returns:** (string) - Formatted date string

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:30:45');

console.log(date.format('YYYY-MM-DD HH:mm:ss'));     // '2024-08-23 10:30:45'
console.log(date.format('DD.MM.YYYY'));              // '23.08.2024'
console.log(date.format('DD MMMM YYYY'));            // '23 August 2024'
console.log(date.format('HH:mm'));                   // '10:30'
console.log(date.format('YYYY-MM-DDTHH:mm:ss'));     // '2024-08-23T10:30:45'

// Custom token combinations
console.log(date.format('YYYYMM'));                  // '202408'
console.log(date.format('YYYYHH'));                  // '202410'
console.log(date.format('hh:mm A'));                 // '10:30 AM'
console.log(date.format('[Today is] dddd'));         // 'Today is Friday'
```

> **Removed in v5.0.0:** `format_c(separator, ...templates)` — use a single dynamic template instead
> (see [Migrating from format_c](FORMATTING-GUIDE.md#migrating-from-format_c-removed-in-v500)).

**Tokens:**
- `YYYY` - 4-digit year (years below 1000 zero-padded: `0050`)
- `MM` - 2-digit month
- `DD` - 2-digit day
- `D` - day without padding
- `Do` - ordinal day (1st, 2nd, ...)
- `HH` - 2-digit hour (24-hour)
- `hh` - 2-digit hour (12-hour)
- `mm` - 2-digit minute
- `ss` - 2-digit second
- `SSS` - 3-digit millisecond
- `MMMM` - Full month name
- `MMM` - Short month name
- `dddd` - Full weekday name
- `ddd` - Short weekday name
- `A` / `a` - Meridiem (`PM` / `pm`)

**Date Format Templates:**
- `YYYY-MM-DD` - ISO date format
- `YYYY-MM-DD HH:mm:ss` - ISO datetime format
- `YYYY-MM-DD HH:mm` - ISO datetime without seconds
- `DD.MM.YYYY HH:mm:ss` - European datetime format
- `DD.MM.YYYY HH:mm` - European datetime without seconds
- `DD-MM-YYYY HH:mm:ss` - European datetime with dashes
- `YYYY.MM.DD HH:mm:ss` - Dotted datetime format
- `YYYY.MM.DD HH:mm` - Dotted datetime without seconds
- `YYYY-MM-DDTHH:mm:ss` - ISO 8601 format
- `YYYYMMDD` - Compact date format
- `YYYYMMDDHHmmss` - Compact datetime format

**Named Format Templates:**
- `DD MMMM YYYY` - Date with full month
- `DD MMMM dddd, YYYY` - Date with weekday and comma
- `YYYY MMM DD` - Year-month-day format
- `YYYY MMMM DD` - Year-fullmonth-day format

**Time Format Templates:**
- `HH:mm:ss` - 24-hour time with seconds
- `HH:mm` - 24-hour time without seconds
- `mm:ss` - Minutes and seconds (e.g. durations/delays; parsed onto today's date)
- `hh:mm:ss` - 12-hour time with seconds
- `hh:mm` - 12-hour time without seconds
- `HH:mm:ss.SSS` - 24-hour time with milliseconds
- `hh:mm:ss.SSS` - 12-hour time with milliseconds

For a complete list of 50+ available templates, see the [Formatting Guide](FORMATTING-GUIDE.md).

#### `toString()`

Returns a string representation of the date.

**Returns:** (string) - Date string

```javascript
const date = new kk_date('2024-08-23 10:30:00');
// Output depends on the process timezone and the runtime's ICU data, e.g. under UTC:
console.log(date.toString()); // 'Fri Aug 23 2024 10:30:00 GMT+0000 (Coordinated Universal Time)'
```

#### `toISOString()`

Returns ISO 8601 string representation.

**Returns:** (string) - ISO 8601 string

```javascript
const date = new kk_date('2024-08-23 10:30:00');
console.log(date.toISOString()); // '2024-08-23T10:30:00.000Z' (input parsed as UTC, see note above)
```

### Manipulation Methods

#### `add(amount, unit)`

Adds the specified amount of time to the date.

**Parameters:**
- `amount` (number | DurationObject) - Amount to add, or a duration created with `kk_date.duration()`
- `unit` (string) - Time unit ('years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'); ignored when a duration object is passed

**Returns:** (KkDate) - The same instance (`this`)

> **Mutation semantics:** `add()` mutates the instance in place and returns `this` for chaining.
> Clone first (`new kk_date(date)`) if you need to keep the original value.

**Unit semantics** (same as moment):
- `milliseconds`, `seconds`, `minutes`, `hours` are elapsed time: `add(1, 'hours')` is always
  3,600,000 ms, also across a DST change, and fractions are exact (`add(1.5, 'hours')` = 90 minutes).
- `days`, `weeks`, `months`, `years` move the **calendar** in the instance's timezone (instance
  timezone, else the global one): the wall-clock time is kept, so a day that is 23 or 25 hours long
  because of a DST change still counts as one day. Fractional amounts are rounded
  (`add(1.5, 'days')` adds 2 days); a week is 7 days and a year is 12 months.
- Month/year additions clamp at the end of the month: `2024-01-31` + 1 month = `2024-02-29`,
  `2024-02-29` + 1 year = `2025-02-28` (same as adding 12 months).
- When the resulting wall-clock time does not exist (it falls into a DST gap) it moves forward by
  the length of the gap. When it exists twice (DST overlap) the result stays on the side of the
  change the original instant was on, if that reading exists (moment-timezone and Luxon do the
  same): `2024-11-04 01:30 EST` − 1 day in New York is `2024-11-03 01:30 EST`, not EDT.

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:30:00');

date.add(1, 'days');                   // Add 1 day: 2024-08-24 10:30:00

const date2 = new kk_date('2024-08-23 10:30:00');
date2.add(2, 'hours');                 // Add 2 hours: 2024-08-23 12:30:00

const date3 = new kk_date('2024-08-23 10:30:00');
date3.add(3, 'months');                // Add 3 months: 2024-11-23 10:30:00

// Negative values for subtraction
const date4 = new kk_date('2024-08-23 10:30:00');
date4.add(-1, 'days');                 // Subtract 1 day: 2024-08-22 10:30:00

// Duration objects are accepted directly
const date5 = new kk_date('2024-08-23 10:30:00');
date5.add(kk_date.duration(90, 'minutes')); // 2024-08-23 12:00:00

// Subtraction using negative amounts - each operation on separate instances
new kk_date('2024-08-23 10:30:00').add(-2, 'hours');   // 2024-08-23 08:30:00
new kk_date('2024-08-23 10:30:00').add(-1, 'weeks');   // 2024-08-16 10:30:00

// Fractions: exact for elapsed units, rounded for calendar units
new kk_date('2024-08-23 10:30:00').add(1.5, 'hours');  // 2024-08-23 12:00:00
new kk_date('2024-08-23 10:30:00').add(1.5, 'days');   // 2024-08-25 10:30:00

// Month-end clamp
new kk_date('2024-01-31').add(1, 'months');            // 2024-02-29 00:00:00
```


#### `set(unit, value)`

Sets a specific unit of time to the given value.

**Parameters:**
- `unit` (string) - Time unit ('years', 'months', 'days', 'hours', 'minutes', 'seconds')
- `value` (number) - Value to set. Months are 0-based (`0` = January); `'days'` is the day of the month

**Returns:** (KkDate) - The same instance (`this`)

The wall clock in the instance's timezone (instance timezone, else the global one) is edited and
the other fields are kept. Like moment, setting `months`/`years` clamps the day to the target
month (`2024-01-31` → `set('months', 1)` → `2024-02-29`); out-of-range values for the other units
roll over like the native `Date` setters. DST gaps and overlaps resolve as in `add()`.

**Examples:**
```javascript
// Each set operation modifies the instance
const date = new kk_date('2024-08-23 10:30:45');

date.set('years', 2025);               // Set year to 2025: 2025-08-23 10:30:45
date.set('months', 0);                 // Set month to January: 2025-01-23 10:30:45
date.set('days', 1);                   // Set day to 1st: 2025-01-01 10:30:45
date.set('hours', 0);                  // Set hour to 00: 2025-01-01 00:30:45
date.set('minutes', 0);                // Set minutes to 00: 2025-01-01 00:00:45
date.set('seconds', 0);                // Set seconds to 00: 2025-01-01 00:00:00

new kk_date('2024-02-29').set('years', 2025); // 2025-02-28 00:00:00 (day clamped)
```

#### `get(unit)`

Returns one field of the wall clock in the instance's timezone (instance timezone, else the
global one).

**Parameters:**
- `unit` (string) - 'years', 'months' (0-based), 'days' (day of the month), 'hours', 'minutes', 'seconds'

**Returns:** (number)

```javascript
const date = new kk_date('2024-08-23 10:30:45');
date.get('months');                    // 7 (August)
date.get('days');                      // 23
```

#### `startOf(unit)`

Sets the date to the start of the specified unit.

**Parameters:**
- `unit` (string) - Time unit ('years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds')

**Returns:** (KkDate) - Modified date instance

Periods are calendar periods in the instance's timezone (instance timezone, else the global one);
weeks start on `weekStartDay` (default Sunday). When the start of the period does not exist on the
wall clock — e.g. a DST change at midnight skips `00:00` (America/Santiago, Asia/Beirut,
America/Havana) — the first existing instant of the period is returned (`01:00`). An hour never
spans a change of the UTC offset: in the repeated hour of a DST overlap, `startOf('hours')` stays
on the same side of the change.

**Examples:**
```javascript
// Each startOf operation modifies the instance sequentially
const date1 = new kk_date('2024-08-23 10:30:45');
date1.startOf('years');                // 2024-01-01 00:00:00

const date2 = new kk_date('2024-08-23 10:30:45');
date2.startOf('months');               // 2024-08-01 00:00:00

const date3 = new kk_date('2024-08-23 10:30:45');
date3.startOf('weeks');                // 2024-08-18 00:00:00 (Sunday — the default week start)
// For a Monday-based week, set weekStartDay first:
//   kk_date.config({ weekStartDay: 1 });  ->  startOf('weeks') === 2024-08-19 00:00:00 (Monday)

const date4 = new kk_date('2024-08-23 10:30:45');
date4.startOf('days');                 // 2024-08-23 00:00:00

const date5 = new kk_date('2024-08-23 10:30:45');
date5.startOf('hours');                // 2024-08-23 10:00:00
```

#### `endOf(unit)`

Sets the date to the end of the specified unit.

**Parameters:**
- `unit` (string) - Time unit

**Returns:** (KkDate) - Modified date instance

The end of a period is the start of the next period minus 1 ms, so it stays correct when the
period is shorter or longer than usual (a 23- or 25-hour day, a day whose midnight is skipped).

**Examples:**
```javascript
// Each endOf operation modifies the instance sequentially
const date1 = new kk_date('2024-08-23 10:30:45');
date1.endOf('years');                  // 2024-12-31 23:59:59.999

const date2 = new kk_date('2024-08-23 10:30:45');
date2.endOf('months');                 // 2024-08-31 23:59:59.999

const date3 = new kk_date('2024-08-23 10:30:45');
date3.endOf('weeks');                  // 2024-08-24 23:59:59.999 (Saturday — with the default Sunday week start)

const date4 = new kk_date('2024-08-23 10:30:45');
date4.endOf('days');                   // 2024-08-23 23:59:59.999

const date5 = new kk_date('2024-08-23 10:30:45');
date5.endOf('hours');                  // 2024-08-23 10:59:59.999
```

### Comparison Methods

#### `isBefore(date)`

Checks if the date is before another date.

**Parameters:**
- `date` (KkDate|Date|string) - Date to compare with

**Returns:** (boolean) - True if before

**Examples:**
```javascript
const date1 = new kk_date('2024-08-23');
const date2 = new kk_date('2024-08-25');

date1.isBefore(date2);                 // true
date1.isBefore('2024-08-25');          // true
```

#### `isAfter(date)`

Checks if the date is after another date.

**Parameters:**
- `date` (KkDate|Date|string) - Date to compare with

**Returns:** (boolean) - True if after

**Examples:**
```javascript
const date1 = new kk_date('2024-08-25');
const date2 = new kk_date('2024-08-23');

date1.isAfter(date2);                  // true
date1.isAfter('2024-08-23');           // true
```

#### `isSame(date)`

Checks if the date is the same as another date.

**Parameters:**
- `date` (KkDate|Date|string) - Date to compare with

**Returns:** (boolean) - True if same

**Examples:**
```javascript
const date1 = new kk_date('2024-08-23 10:30:00');
const date2 = new kk_date('2024-08-23 15:45:00');

date1.isSame(date2);                   // false
// Note: isSame() only accepts one parameter (the date to compare)
// For granular comparison, use format() to compare specific parts
```

#### `isBetween(start, end, unit?)`

Checks if the date is between two other dates. Both bounds are inclusive.

**Parameters:**
- `start` (KkDate|Date|string) - Start date
- `end` (KkDate|Date|string) - End date
- `unit` (string, optional) - 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months' or 'years'.
  Without it the instants are compared to the millisecond. With it, whole calendar periods in this
  instance's timezone are compared (moment's `isBetween(start, end, unit, '[]')`): the period
  containing the date must lie between the periods containing `start` and `end`.

**Returns:** (boolean) - True if between

**Examples:**
```javascript
const date = new kk_date('2024-08-23');
const start = new kk_date('2024-08-20');
const end = new kk_date('2024-08-25');

date.isBetween(start, end);            // true
date.isBetween(start, end, 'days');    // true

const evening = new kk_date('2024-08-25 15:00');
evening.isBetween(start, end);         // false (after 2024-08-25 00:00:00.000)
evening.isBetween(start, end, 'days'); // true  (same day as end)
```

#### `diff(date, unit, is_decimal?)`

Returns the difference between two dates.

**Parameters:**
- `date` (KkDate|Date|string) - Date to compare with
- `unit` (string) - Unit for difference
- `is_decimal` (boolean, optional) - Return a fractional value instead of flooring toward zero (default: false)

**Returns:** (number) - Difference in specified unit

The difference is measured as `(date - this)`, i.e. the argument minus the receiver. So when the argument is
**later** than the receiver the result is **positive**; when it is earlier the result is negative.

**Unit semantics** (same as moment):
- `milliseconds` / `seconds` / `minutes` / `hours` are exact elapsed time.
- `days` / `weeks` count whole days between the two wall-clock times in this instance's timezone
  (a week is 7 days), like moment: a 23- or 25-hour DST day counts as one day, so
  `2024-03-09 12:00 → 2024-03-11 12:00` in New York is `2` days but `47` hours. The time of day
  counts too (`2024-01-01 10:00 → 2024-01-03 09:00` is `1` day). On a day whose midnight is skipped
  by DST (America/Santiago `2024-09-08`, Asia/Beirut `2024-03-31`) the day starts at `01:00`, so
  `'2024-09-08' → '2024-09-10'` there is `1` day (47 hours; Luxon and Temporal say the same).
  For date-only values, `Math.round(a.diff(b, 'days', true))` is the number of calendar days
  between them in every timezone; `diff_range(end, 'days')` lists the dates.
- `months` / `years` are **calendar-aware** (moment-compatible anchor arithmetic): a full calendar year is `1` year,
  `Jan 1 → Mar 1` is `2` months, and month-end edges clamp (`Jan 31 → Feb 29` is `1` month). With `is_decimal` the
  fraction interpolates between month anchors.
- Without `is_decimal` the value is truncated toward zero.
- Note: `duration()` uses fixed approximations (31-day months, 365-day years) because a duration has no anchor date.

**Examples:**
```javascript
const date1 = new kk_date('2024-08-23');
const date2 = new kk_date('2024-08-25');

date1.diff(date2, 'days');             // 2   (date2 is 2 days after date1)
date2.diff(date1, 'days');             // -2  (date1 is 2 days before date2)
date1.diff(date2, 'hours');            // 48
date1.diff(date2, 'days', true);       // 2   (is_decimal returns a fractional value when not a whole number)

new kk_date('2024-08-01').diff('2024-08-23', 'weeks');       // 3
new kk_date('2024-08-01').diff('2024-08-23', 'weeks', true); // 3.142857142857143
new kk_date('2023-01-01').diff('2024-01-01', 'years');   // 1 (calendar-aware)
new kk_date('2024-01-31').diff('2024-02-29', 'months');  // 1 (month-end clamp)
```

### Timezone Methods

#### `tz(timezone)`

Sets the timezone the instance is displayed and manipulated in. The represented instant does not
change (`getTime()` is the same before and after); `format()`, `get()`, `add()` with calendar
units, `startOf()`/`endOf()` and `diff()` in days/weeks/months/years then work on this zone's wall
clock. Mutates the instance and returns `this`.

**Parameters:**
- `timezone` (string) - IANA timezone identifier

**Returns:** (KkDate) - The same instance (`this`)

**Examples:**
```javascript
// Each timezone conversion should use a separate instance
const nyTime = new kk_date('2024-08-23 10:00:00').tz('America/New_York');
const tokyoTime = new kk_date('2024-08-23 10:00:00').tz('Asia/Tokyo');
const londonTime = new kk_date('2024-08-23 10:00:00').tz('Europe/London');

console.log(nyTime.format('HH:mm'));    // '06:00' (EDT)
console.log(tokyoTime.format('HH:mm')); // '19:00' (JST)
console.log(londonTime.format('HH:mm')); // '11:00' (BST)
```

#### `getTimezoneInfo(timezone?)`

Gets timezone information for the date.

**Parameters:**
- `timezone` (string, optional) - Timezone to get info for (defaults to current timezone)

**Returns:** (object) - Timezone information:
- `offset` - UTC offset at this date, in milliseconds
- `isDST` - same as `isDST()` below
- `abbreviation` - short zone name from the runtime's ICU data (e.g. `'EDT'`, or `'GMT+10'` where ICU has no abbreviation)
- `standardOffset` / `daylightOffset` - the smaller / larger of the offsets on January 1 and July 1 of the date's year (equal for zones without DST)

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:00:00');

const info = date.getTimezoneInfo('America/New_York');
console.log(info);
// {
//   timezone: 'America/New_York',
//   offset: -14400000,
//   isDST: true,
//   abbreviation: 'EDT',
//   standardOffset: -18000000,
//   daylightOffset: -14400000
// }
```

#### `isDST(timezone?)`

Checks if the date is in Daylight Saving Time.

**Parameters:**
- `timezone` (string, optional) - Timezone to check (defaults to current timezone)

**Returns:** (boolean) - True if in DST

Uses moment's definition: the offset at this date is larger than the offset at the same day and
time in January or in June of the same year. It works in both hemispheres (Sydney is in DST in
January, not in August).

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:00:00');

date.isDST('America/New_York');        // true (EDT)
date.isDST('Europe/London');           // true (BST)
date.isDST('Asia/Tokyo');              // false (no DST)
date.isDST('Australia/Sydney');        // false (southern-hemisphere winter)
```

#### `getTimezoneAbbreviation(timezone?)`

Gets the timezone abbreviation.

**Parameters:**
- `timezone` (string, optional) - Timezone to get abbreviation for

**Returns:** (string) - Timezone abbreviation

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:00:00');

date.getTimezoneAbbreviation('America/New_York'); // 'EDT'
// Note: the exact abbreviation comes from the runtime's ICU data. Some Node.js/ICU builds return an
// offset-style label instead of a short name, e.g. 'GMT+1' for Europe/London and 'GMT+9' for Asia/Tokyo.
date.getTimezoneAbbreviation('Europe/London');    // 'BST' or 'GMT+1' (runtime-dependent)
date.getTimezoneAbbreviation('Asia/Tokyo');       // 'JST' or 'GMT+9' (runtime-dependent)
```

### Utility Methods

#### `isValid()`

Checks if the date is valid.

**Returns:** (boolean) - True if valid

**Examples:**
```javascript
const validDate = new kk_date('2024-08-23');
validDate.isValid();                   // true

// Note: the constructor is fail-fast — `new kk_date('invalid')` THROWS immediately, so you cannot
// reach `.isValid() === false` through it. To test a raw string without throwing, use the static
// `kk_date.isValid(input, format)` instead (see Static Methods below).
```

#### `getTime()`

Returns the timestamp in milliseconds.

**Returns:** (number) - Timestamp

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:00:00');
console.log(date.getTime()); // 1724407200000
```

#### `valueOf()`

Returns the timestamp for comparison operations.

**Returns:** (number) - Timestamp

```javascript
const date = new kk_date('2024-08-23 10:00:00');
console.log(date.valueOf()); // 1724407200000
```

#### `diff_range(end, unit, template?)`

Lists the dates from this date up to `end`, one per `unit`, as formatted strings.

**Parameters:**
- `end` (KkDate|Date|string|number) - Last date of the range
- `unit` (string) - Step: 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months' or 'years'
- `template` (string, optional, default `'YYYY-MM-DD'`) - Format of the returned strings

**Returns:** (string[]) - This date first, then this date + 1 unit, + 2 units, … Every entry is
computed from this date with `add()`, so month ends clamp without drifting (`Jan 31 → Feb 29 → Mar 31`)
and every entry keeps this date's time of day.

- `days`, `weeks`, `months`, `years`: every step whose **date** is on or before `end`'s date in this
  instance's timezone. The time of day does not matter (`2024-01-01 10:00 → 2024-01-03 09:00` lists
  three dates); a step that would land after `end`'s date is left out (monthly from `Jan 31` up to
  `Mar 15` stops at `Feb 29`).
- Each step stays on its own date: when this date's time of day falls in a DST gap on it and `add()`
  would move it into the next date (America/Nuuk skips `23:00–24:00` on `2024-03-30`), the entry is
  moved back by the gap instead (`22:30`). A date the timezone skipped entirely is not listed by
  `days` (Pacific/Apia has no `2011-12-30`); a `weeks`/`months`/`years` step on it keeps `add()`'s
  next date (`2011-12-31`), so that period is still listed.
- `hours`, `minutes`, `seconds`: every step up to the `end` instant.
- An `end` before this date returns only this date.

**Examples:**
```javascript
new kk_date('2024-08-20').diff_range('2024-08-23', 'days');
// ['2024-08-20', '2024-08-21', '2024-08-22', '2024-08-23']

new kk_date('2024-01-01 10:00').diff_range('2024-01-03 09:00', 'days');
// ['2024-01-01', '2024-01-02', '2024-01-03']

new kk_date('2024-01-31').diff_range('2024-04-30', 'months');
// ['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']

new kk_date('2024-08-23 10:00').diff_range('2024-08-23 13:00', 'hours', 'HH:mm');
// ['10:00', '11:00', '12:00', '13:00']
```

#### `valueOfLocal()`

Legacy helper: `valueOf()` shifted by the difference between the system timezone and the global
timezone, i.e. the instant at which the global timezone's wall clock shows what the system
timezone's wall clock shows at this date. Both offsets are taken at this date (DST-safe, and the
result does not depend on when it is called). Equals `valueOf()` when no global timezone other
than the system one is configured.

**Returns:** (number) - Timestamp in milliseconds

**Examples:**
```javascript
// process timezone UTC, global timezone America/New_York
kk_date.setTimezone('America/New_York');
const date = new kk_date('2024-08-23 10:00:00'); // 10:00 New York = 14:00 UTC
date.valueOf();      // 1724421600000 (2024-08-23T14:00:00Z)
date.valueOfLocal(); // 1724436000000 (2024-08-23T18:00:00Z = 14:00 in New York)
```

#### `duration(time)`

Breaks a time span down into calendar-ish parts. The instance method interprets its argument as **seconds**;
the static `kk_date.duration(time, type)` scales by the given unit.

**Parameters:**
- `time` (number, required) - A **positive integer**; `0`, negative values and non-integers throw `Invalid time`

**Returns:** (object) - Duration object (`years/months/weeks/days/hours/minutes/seconds/milliseconds` plus `asSeconds()`, `asDays()`, … helpers). The result can be passed directly to `add()`.

> **Approximation note:** durations have no anchor date, so they use fixed unit sizes: 31-day months and 365-day years.
> For calendar-accurate month/year differences between two dates use `diff()` instead.

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:00:00');
date.duration(90);                     // { minutes: 1, seconds: 30, ... } (argument = seconds)

kk_date.duration(2, 'weeks');          // { weeks: 2, ... }, asDays() === 14
kk_date.duration(90, 'minutes');       // { hours: 1, minutes: 30, ... }
```

**Note:** The `clone()` method is not directly available. Create a new instance with the original date instead.

**Examples:**
```javascript
const original = new kk_date('2024-08-23 10:00:00');
const copy = new kk_date(original.date);

original.add(1, 'days');
console.log(copy.format('YYYY-MM-DD')); // '2024-08-23' (unchanged)
```

## Static Methods

### Configuration Methods

#### `setTimezone(timezone)`

Sets the global default timezone.

**Note:** This is a module-level export, not a class static method.

**Parameters:**
- `timezone` (string) - IANA timezone identifier

**Examples:**
```javascript
const kk_date = require('kk-date');

kk_date.setTimezone('UTC');
kk_date.setTimezone('America/New_York');
kk_date.setTimezone('Europe/London');
```

#### `getTimezone()`

Gets the global default timezone.

**Note:** This is a module-level export, not a class static method.

**Returns:** (string) - Current timezone

**Examples:**
```javascript
const kk_date = require('kk-date');

// Defaults to the system timezone until you call setTimezone()/config({ timezone }).
kk_date.setTimezone('UTC');
const currentTimezone = kk_date.getTimezone();
console.log(currentTimezone); // 'UTC'
```

#### `setUserTimezone(timezone)`

Stores a "user" timezone. kk-date uses it only as the default source zone of
`convertToTimezone()`; it does not affect parsing or display (use `setTimezone()` / `tz()` for that).

**Note:** This is a module-level export, not a class static method.

**Parameters:**
- `timezone` (string) - IANA timezone identifier

**Examples:**
```javascript
const kk_date = require('kk-date');

kk_date.setUserTimezone('America/New_York');
```

#### `getUserTimezone()`

Returns the timezone stored with `setUserTimezone()` (the system timezone until it is called).

**Note:** This is a module-level export, not a class static method.

**Returns:** (string) - User timezone

**Examples:**
```javascript
const kk_date = require('kk-date');

// Defaults to the system timezone until you call setUserTimezone().
kk_date.setUserTimezone('America/New_York');
const userTimezone = kk_date.getUserTimezone();
console.log(userTimezone); // 'America/New_York'
```

#### `config(options)`

Sets global configuration including locale, timezone, and week start day.

**Note:** This is a module-level export, not a class static method.

**Parameters:**
- `options` (object) - Configuration options
  - `locale` (string) - Locale identifier
  - `timezone` (string) - IANA timezone identifier
  - `weekStartDay` (number) - Week start day (0 = Sunday, 1 = Monday, etc.)

**Examples:**
```javascript
const kk_date = require('kk-date');

// Set locale
kk_date.config({ locale: 'en' });
kk_date.config({ locale: 'tr' });
kk_date.config({ locale: 'de' });

// Set timezone
kk_date.config({ timezone: 'UTC' });
kk_date.config({ timezone: 'America/New_York' });

// Set week start day
kk_date.config({ weekStartDay: 1 }); // Monday
kk_date.config({ weekStartDay: 0 }); // Sunday

// Set multiple options
kk_date.config({ 
  locale: 'en', 
  timezone: 'UTC', 
  weekStartDay: 1 
});
```

**Note:** Individual getter/setter methods for locale and week start day are not available. Use the global configuration object to access current settings.

### Utility Methods

#### `isValid(input, format, is_strict?)`

Checks whether a date string matches a given format template.

**Note:** This is a module-level export, not a class static method.

**Parameters:**
- `input` (string) - Date string to validate
- `format` (string, **required**) - Format to validate against. Accepts every predefined template ('YYYY-MM-DD', 'HH:mm:ss', 'mm:ss', etc.) **plus any display-token template** the formatter understands (e.g. 'DD/MM/YYYY HH:mm'), compiled on first use. Omitting it, or passing a template with no recognizable token, throws `Error: Invalid template !`.
- `is_strict` (boolean, optional, default `false`) - Layers moment's strict-parsing rules on top of the shape check: real calendar days including leap years, hours 00-23 plus exactly `24:00[:00]`, no `:ss` tail on `HH:mm`, plus kk-date's 4-digit year range (1700-2199). Strict always accepts a subset of the default mode.

**Returns:** (boolean) - True if valid

**Default mode is a pure shape check** and deliberately keeps kk-date's leniencies for backward compatibility: hours 24-29 are accepted on the `HH`-based templates (they feed the constructor's day-overflow feature, e.g. `'25:00:00'` → next day 01:00), `HH:mm` tolerates an optional `:ss` tail, and impossible calendar days like `'2021-02-30'` pass the shape check. Pass `is_strict = true` to reject all of these.

**Scope notes:**
- Strict mode applies to every template — numeric, name-based (`'DD MMMM YYYY'`, `'dddd, DD MMMM YYYY'`, …) and dynamically compiled. Besides the calendar/hour rules above it requires, like moment strict:
  - month and weekday names of the template's form: `MMMM` full names, `MMM` short names, `dddd` / `ddd` / `dd` likewise (names in any language kk-date knows);
  - a weekday name that matches the date (`'Monday, 23 August 2024'` is rejected — it was a Friday);
  - no leading zero on unpadded tokens (`D`, `M`, `H`, `h`, `m`, `s`, …);
  - week numbers that exist in their week-year (`W`/`WW`, `w`/`ww`) and UTC offsets within ±14:00.
- A template accepted by `isValid` is not necessarily parseable by the constructor: `new kk_date(input, format)` still supports only the predefined formats.

**Examples:**
```javascript
const kk_date = require('kk-date');

// A format template is REQUIRED. Calling isValid() with only one argument throws
// `Error: Invalid template !`, and passing a non-string (e.g. a Date) returns false.
kk_date.isValid('2024-08-23', 'YYYY-MM-DD');  // true
kk_date.isValid('invalid', 'YYYY-MM-DD');     // false
kk_date.isValid('2024-23-08', 'YYYY-DD-MM');  // true
kk_date.isValid('2024-23-08', 'YYYY-MM-DD');  // false

// Any display-token template works (compiled & memoized on first use)
kk_date.isValid('31/12/2024 23:59', 'DD/MM/YYYY HH:mm'); // true
kk_date.isValid('03:45', 'mm:ss');                       // true
kk_date.isValid('1st Jan 2024', 'Do MMM YYYY');          // true

// Strict mode (moment strict parity)
kk_date.isValid('2021-02-30', 'YYYY-MM-DD', true); // false - not a real calendar day
kk_date.isValid('2024-02-29', 'YYYY-MM-DD', true); // true  - leap year
kk_date.isValid('25:00:00', 'HH:mm:ss', true);     // false - wall-clock hours only
kk_date.isValid('24:00:00', 'HH:mm:ss', true);     // true  - end-of-day midnight
kk_date.isValid('05-12-31', 'YYYY-MM-DD', true);   // false - 2-digit years rejected
kk_date.isValid('31 February 2024', 'DD MMMM YYYY');        // true  - shape only
kk_date.isValid('31 February 2024', 'DD MMMM YYYY', true);  // false - not a real calendar day
kk_date.isValid('23 Aug 2024', 'DD MMMM YYYY', true);       // false - MMMM needs the full month name
kk_date.isValid('Monday, 23 August 2024', 'dddd, DD MMMM YYYY', true); // false - 2024-08-23 is a Friday
```

#### `getTimezoneOffset(timezone, date?)`

Gets the timezone offset in milliseconds.

**Note:** This is a module-level export, not a class static method.

**Parameters:**
- `timezone` (string) - IANA timezone identifier
- `date` (Date, optional) - Date to get offset for (defaults to current date)

**Returns:** (number) - Offset in milliseconds

**Examples:**
```javascript
const kk_date = require('kk-date');

const offset = kk_date.getTimezoneOffset('America/New_York');
console.log(offset / (60 * 60 * 1000)); // -4 (EDT)
```

#### `getAvailableTimezones()`

Gets all available timezones.

**Note:** This is a module-level export, not a class static method.

**Returns:** (string[]) - Every IANA timezone the runtime supports (`Intl.supportedValuesOf('timeZone')`, about 420 zones on Node.js 22), plus `'UTC'`, which is prepended when the engine's list omits it. Runtimes without `Intl.supportedValuesOf` (e.g. older Hermes) get a built-in list of common zones that they support.

**Examples:**
```javascript
const kk_date = require('kk-date');

const timezones = kk_date.getAvailableTimezones();
console.log(timezones);
// ['UTC', 'Africa/Abidjan', 'Africa/Accra', ...]
```

## Properties

### Instance Properties

#### `date`

The underlying JavaScript Date object.

**Type:** Date

**Examples:**
```javascript
const kkDate = new kk_date('2024-08-23 10:00:00');
console.log(kkDate.date); // Date object
```

#### `temp_config`

Temporary configuration for the instance.

**Type:** object

**Properties:**
- `timezone` (string) - Instance timezone
- `locale` (string) - Instance locale
- `weekStartDay` (number) - Instance week start day

#### `detected_format`

The detected format of the input date.

**Type:** string

**Examples:**
```javascript
const date = new kk_date('2024-08-23T10:00:00.000Z');
console.log(date.detected_format); // 'ISO8601'
```

## Configuration

### Global Configuration

The library uses a global configuration object that can be modified:

```javascript
// Note: global_config is not directly accessible as a property.
// Use the configuration methods to set and get values:

const kk_date = require('kk-date');

kk_date.config({ 
    timezone: 'UTC',           // Default timezone
    locale: 'en',              // Default locale
    weekStartDay: 0            // Week start day (0 = Sunday)
});

// Get specific values:
const timezone = kk_date.getTimezone();
const userTimezone = kk_date.getUserTimezone();
```

### Instance Configuration

Each instance can have its own configuration:

```javascript
const date = new kk_date('2024-08-23');
date.config({
    timezone: 'America/New_York',
    locale: 'tr',
    weekStartDay: 1
});
```

### Configuration Priority

1. Instance configuration (highest priority)
2. Global configuration
3. Default values (lowest priority)

## Error Handling

The library throws descriptive errors for invalid operations:

```javascript
try {
    const date = new kk_date('invalid');
} catch (error) {
    console.log(error.message); // 'Invalid Date'
}

try {
    new kk_date('2024-08-23').tz('Invalid/Timezone');
} catch (error) {
    console.log(error.message); // 'Invalid timezone: Invalid/Timezone'
}

try {
    kk_date.config({ locale: 'tr', timezone: 'Invalid/Timezone' });
} catch (error) {
    // config() validates every option first: on error nothing is applied (locale is unchanged)
    console.log(error.message); // 'Invalid timezone: Invalid/Timezone'
}
```

## Performance Considerations

- **Caching**: The library caches timezone offsets, compiled format templates, format results and `Intl` formatters
- **Lazy Loading**: Month/weekday name tables and `Intl` formatters are built on first use
- **Memory Management**: Every cache is bounded (oldest entries are evicted or the cache is cleared when full)

## Browser Compatibility

The library is shipped as untranspiled ES2020 (optional chaining, nullish coalescing, Unicode
property escapes in regular expressions) and needs `Intl.DateTimeFormat` with time zone support and
`formatToParts`:

- **Chrome / Edge 80+, Firefox 78+, Safari 14+, Node.js 22+** (the `engines` range; CI runs 22, 24 and 26)
- Internet Explorer is not supported
- `fromNow()` requires `Intl.RelativeTimeFormat` and throws a descriptive error without it
- `Intl.Locale` is used to validate locales when available; without it locales are validated by creating the formatters
- `Intl.supportedValuesOf` (Chrome 99+, Firefox 93+, Safari 15.4+) is optional; without it `getAvailableTimezones()` returns a built-in list
- React Native / Hermes: timezone offsets fall back to `formatToParts` field arithmetic when `longOffset` names are unavailable

## Migration from Other Libraries

### From Moment.js

```javascript
// Moment.js
const moment = require('moment');
const date = moment('2024-08-23').format('YYYY-MM-DD');

// kk-date
const kk_date = require('kk-date');
const date = new kk_date('2024-08-23').format('YYYY-MM-DD');
```

### From Day.js

```javascript
// Day.js
const dayjs = require('dayjs');
const date = dayjs('2024-08-23').format('YYYY-MM-DD');

// kk-date
const kk_date = require('kk-date');
const date = new kk_date('2024-08-23').format('YYYY-MM-DD');
```
