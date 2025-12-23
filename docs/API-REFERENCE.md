# kk-date API Reference

Complete reference for all kk-date methods, properties, and configuration options.

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
- `date_format` (string, optional) - Format to use for parsing ('YYYY-MM-DD' or 'YYYY-DD-MM')

**Supported Input Formats:**
```javascript
// ISO 8601 strings
new kk_date('2024-08-23T10:30:00.000Z')
new kk_date('2024-08-23T10:30:00+03:00')

// Date strings
new kk_date('2024-08-23 10:30:00')
new kk_date('23.08.2024 10:30:00')
new kk_date('08/23/2024 10:30:00')

// Compact formats
new kk_date('20240823')           // YYYYMMDD
new kk_date('20240823103000')     // YYYYMMDDHHmmss

// Date objects
new kk_date(new Date())

// kk_date objects
new kk_date(existingKkDate)

// Timestamps (Unix seconds or milliseconds)
new kk_date(1724407200)    // Unix timestamp (seconds)
new kk_date(1724407200000) // JavaScript timestamp (milliseconds)

// With explicit format
new kk_date('2024-23-08', 'YYYY-DD-MM')
new kk_date('2024-08-23', 'YYYY-MM-DD')
```

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

Formats the date according to the specified template.

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
```

**Available Templates:**

**Basic Templates:**
- `YYYY` - 4-digit year
- `MM` - 2-digit month
- `DD` - 2-digit day
- `HH` - 2-digit hour (24-hour)
- `mm` - 2-digit minute
- `ss` - 2-digit second
- `SSS` - 3-digit millisecond
- `MMMM` - Full month name
- `MMM` - Short month name
- `dddd` - Full weekday name
- `ddd` - Short weekday name

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
console.log(date.toString()); // 'Fri Aug 23 2024 10:30:00 GMT+0300 (GMT+03:00)'
```

#### `toISOString()`

Returns ISO 8601 string representation.

**Returns:** (string) - ISO 8601 string

```javascript
const date = new kk_date('2024-08-23 10:30:00');
console.log(date.toISOString()); // '2024-08-23T07:30:00.000Z' (adjusted to UTC)
```

### Manipulation Methods

#### `add(amount, unit)`

Adds the specified amount of time to the date.

**Parameters:**
- `amount` (number) - Amount to add
- `unit` (string) - Time unit ('years', 'months', 'days', 'hours', 'minutes', 'seconds')

**Returns:** (KkDate) - Modified date instance

**Examples:**
```javascript
// Each operation creates a new modified instance
const date = new kk_date('2024-08-23 10:30:00');

date.add(1, 'days');                   // Add 1 day: 2024-08-24 10:30:00

const date2 = new kk_date('2024-08-23 10:30:00');
date2.add(2, 'hours');                 // Add 2 hours: 2024-08-23 12:30:00

const date3 = new kk_date('2024-08-23 10:30:00');
date3.add(3, 'months');                // Add 3 months: 2024-11-23 10:30:00

// Negative values for subtraction
const date4 = new kk_date('2024-08-23 10:30:00');
date4.add(-1, 'days');                 // Subtract 1 day: 2024-08-22 10:30:00
```


#### `set(unit, value)`

Sets a specific unit of time to the given value.

**Parameters:**
- `unit` (string) - Time unit ('years', 'months', 'days', 'hours', 'minutes', 'seconds')
- `value` (number) - Value to set

**Returns:** (KkDate) - Modified date instance

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
```

**Examples:**
```javascript
// Subtraction using negative amounts - each operation on separate instances
const date1 = new kk_date('2024-08-23 10:30:00');
date1.add(-1, 'days');                 // Subtract 1 day: 2024-08-22 10:30:00

const date2 = new kk_date('2024-08-23 10:30:00');
date2.add(-2, 'hours');                // Subtract 2 hours: 2024-08-23 08:30:00

const date3 = new kk_date('2024-08-23 10:30:00');
date3.add(-1, 'weeks');                // Subtract 1 week: 2024-08-16 10:30:00
```

#### `startOf(unit)`

Sets the date to the start of the specified unit.

**Parameters:**
- `unit` (string) - Time unit ('years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds')

**Returns:** (KkDate) - Modified date instance

**Examples:**
```javascript
// Each startOf operation modifies the instance sequentially
const date1 = new kk_date('2024-08-23 10:30:45');
date1.startOf('years');                // 2024-01-01 00:00:00

const date2 = new kk_date('2024-08-23 10:30:45');
date2.startOf('months');               // 2024-08-01 00:00:00

const date3 = new kk_date('2024-08-23 10:30:45');
date3.startOf('weeks');                // 2024-08-19 00:00:00 (Monday)

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

**Examples:**
```javascript
// Each endOf operation modifies the instance sequentially
const date1 = new kk_date('2024-08-23 10:30:45');
date1.endOf('years');                  // 2024-12-31 23:59:59.999

const date2 = new kk_date('2024-08-23 10:30:45');
date2.endOf('months');                 // 2024-08-31 23:59:59.999

const date3 = new kk_date('2024-08-23 10:30:45');
date3.endOf('weeks');                  // 2024-08-25 23:59:59.999 (Sunday)

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

Checks if the date is between two other dates.

**Parameters:**
- `start` (KkDate|Date|string) - Start date
- `end` (KkDate|Date|string) - End date
- `unit` (string, optional) - Unit for comparison

**Returns:** (boolean) - True if between

**Examples:**
```javascript
const date = new kk_date('2024-08-23');
const start = new kk_date('2024-08-20');
const end = new kk_date('2024-08-25');

date.isBetween(start, end);            // true
date.isBetween(start, end, 'days');    // true
```

#### `diff(date, unit, asFloat?)`

Returns the difference between two dates.

**Parameters:**
- `date` (KkDate|Date|string) - Date to compare with
- `unit` (string) - Unit for difference
- `asFloat` (boolean, optional) - Return as float (default: false)

**Returns:** (number) - Difference in specified unit

**Examples:**
```javascript
const date1 = new kk_date('2024-08-23');
const date2 = new kk_date('2024-08-25');

date1.diff(date2, 'days');             // -2
date2.diff(date1, 'days');             // 2
date1.diff(date2, 'hours');            // -48
date1.diff(date2, 'days', true);       // -2.0
```

### Timezone Methods

#### `tz(timezone)`

Converts the date to the specified timezone.

**Parameters:**
- `timezone` (string) - IANA timezone identifier

**Returns:** (KkDate) - Date in specified timezone

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

**Returns:** (object) - Timezone information

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

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:00:00');

date.isDST('America/New_York');        // true (EDT)
date.isDST('Europe/London');           // true (BST)
date.isDST('Asia/Tokyo');              // false (no DST)
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
date.getTimezoneAbbreviation('Europe/London');    // 'BST'
date.getTimezoneAbbreviation('Asia/Tokyo');       // 'JST'
```

### Utility Methods

#### `isValid()`

Checks if the date is valid.

**Returns:** (boolean) - True if valid

**Examples:**
```javascript
const validDate = new kk_date('2024-08-23');
const invalidDate = new kk_date('invalid');

validDate.isValid();                   // true
invalidDate.isValid();                 // false
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

#### `format_c(separator, ...templates)`

Advanced formatting method that allows multiple templates with custom separator.

**Parameters:**
- `separator` (string, optional) - Separator between formatted parts (default: ' ')
- `...templates` (string[]) - Format templates to apply

**Returns:** (string) - Formatted string

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format_c(' ', 'YYYY-MM-DD', 'HH:mm:ss'); // '2024-08-23 10:30:45'
date.format_c('T', 'YYYY-MM-DD', 'HH:mm:ss');  // '2024-08-23T10:30:45'
date.format_c('-', 'DD', 'MM', 'YYYY');        // '23-08-2024'
```

#### `diff_range(startDate, endDate, unit?)`

Calculates the difference between a date range.

**Parameters:**
- `startDate` (kk_date|Date|string) - Start date
- `endDate` (kk_date|Date|string) - End date  
- `unit` (string, optional) - Unit for difference calculation

**Returns:** (number|object) - Range difference

**Examples:**
```javascript
const date = new kk_date('2024-08-23');
const start = new kk_date('2024-08-20');
const end = new kk_date('2024-08-25');

date.diff_range(start, end, 'days'); // Range difference calculation
```

#### `valueOfLocal()`

Returns the local timestamp value.

**Returns:** (number) - Local timestamp

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:00:00');
console.log(date.valueOfLocal()); // Local timestamp
```

#### `duration(input?)`

Creates or returns duration information.

**Parameters:**
- `input` (any, optional) - Duration input

**Returns:** (object) - Duration object

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:00:00');
const duration = date.duration(); // Duration information
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

const currentTimezone = kk_date.getTimezone();
console.log(currentTimezone); // 'UTC'
```

#### `setUserTimezone(timezone)`

Sets the user's preferred timezone.

**Note:** This is a module-level export, not a class static method.

**Parameters:**
- `timezone` (string) - IANA timezone identifier

**Examples:**
```javascript
const kk_date = require('kk-date');

kk_date.setUserTimezone('America/New_York');
```

#### `getUserTimezone()`

Gets the user's preferred timezone.

**Note:** This is a module-level export, not a class static method.

**Returns:** (string) - User timezone

**Examples:**
```javascript
const kk_date = require('kk-date');

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

#### `isValid(input, format?)`

Checks if a date input is valid.

**Note:** This is a module-level export, not a class static method.

**Parameters:**
- `input` (any) - Input to validate
- `format` (string, optional) - Format to validate against ('YYYY-MM-DD', 'YYYY-DD-MM', etc.)

**Returns:** (boolean) - True if valid

**Examples:**
```javascript
const kk_date = require('kk-date');

kk_date.isValid('2024-08-23');        // true
kk_date.isValid('invalid');            // false
kk_date.isValid(new Date());           // true
kk_date.isValid('2024-23-08', 'YYYY-DD-MM'); // true
kk_date.isValid('2024-23-08', 'YYYY-MM-DD'); // false
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

**Returns:** (string[]) - Array of timezone identifiers

**Examples:**
```javascript
const kk_date = require('kk-date');

const timezones = kk_date.getAvailableTimezones();
console.log(timezones);
// ['UTC', 'Europe/London', 'America/New_York', ...]
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
    console.log(error.message); // 'Invalid date format'
}

try {
    date.tz('Invalid/Timezone');
} catch (error) {
    console.log(error.message); // 'Invalid timezone: Invalid/Timezone'
}
```

## Performance Considerations

- **Caching**: The library caches timezone calculations for better performance
- **Object Pooling**: Reuses objects where possible to reduce garbage collection
- **Lazy Loading**: Loads timezone data only when needed
- **Memory Management**: Automatically cleans up cached data

## Browser Compatibility

The library works in all modern browsers and Node.js environments. For older browsers, consider using polyfills for:

- `Intl.DateTimeFormat` (IE 11+)
- `Intl.DateTimeFormat.prototype.formatToParts`
- `Array.prototype.find`

**Browser Support Levels:**

**Basic Functionality (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+, IE 11+):**
- Date construction and parsing
- Basic formatting
- Timezone conversions
- Date manipulation
- Comparison operations

**Advanced Features:**
- **Locale Configuration:** Chrome 74+, Firefox 75+, Safari 14.1+, Edge 79+ (requires `Intl.Locale`)
- **Relative Time Formatting:** Chrome 71+, Firefox 65+, Safari 14.1+, Edge 79+ (requires `Intl.RelativeTimeFormat`, has fallback)

**Graceful Degradation:**
- Without `Intl.Locale`: Locale configuration fails, but basic functionality works
- Without `Intl.RelativeTimeFormat`: Relative time uses fallback mechanism

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
