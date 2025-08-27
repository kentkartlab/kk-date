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

### `new kk_date(input, options?)`

Creates a new kk-date instance.

**Parameters:**
- `input` (string|Date|number) - Date input to parse
- `options` (object, optional) - Configuration options

**Supported Input Formats:**
```javascript
// ISO 8601 strings
new kk_date('2024-08-23T10:30:00.000Z')
new kk_date('2024-08-23T10:30:00+03:00')

// Date strings
new kk_date('2024-08-23 10:30:00')
new kk_date('23.08.2024 10:30:00')
new kk_date('08/23/2024 10:30:00')

// Date objects
new kk_date(new Date())

// Timestamps
new kk_date(1724407200000)
```

**Options:**
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

date.format('YYYY-MM-DD HH:mm:ss');     // '2024-08-23 10:30:45'
date.format('DD.MM.YYYY');              // '23.08.2024'
date.format('DD MMMM YYYY');            // '23 August 2024'
date.format('HH:mm');                   // '10:30'
date.format('YYYY-MM-DDTHH:mm:ss');     // '2024-08-23T10:30:45'
```

**Available Templates:**
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
console.log(date.toISOString()); // '2024-08-23T10:30:00.000Z'
```

### Manipulation Methods

#### `add(amount, unit)`

Adds the specified amount of time to the date.

**Parameters:**
- `amount` (number) - Amount to add
- `unit` (string) - Time unit ('years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds')

**Returns:** (KkDate) - Modified date instance

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:30:00');

date.add(1, 'days');                   // Add 1 day
date.add(2, 'hours');                  // Add 2 hours
date.add(3, 'months');                 // Add 3 months
date.add(30, 'minutes');               // Add 30 minutes
```

**Note:** The `subtract()` method is not directly available. Use `add()` with negative values instead.

#### `set(unit, value)`

Sets a specific unit of time to the given value.

**Parameters:**
- `unit` (string) - Time unit ('years', 'months', 'days', 'hours', 'minutes', 'seconds')
- `value` (number) - Value to set

**Returns:** (KkDate) - Modified date instance

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.set('years', 2025);               // Set year to 2025
date.set('months', 0);                 // Set month to January (0-based)
date.set('days', 1);                   // Set day to 1st
date.set('hours', 0);                  // Set hour to 00
date.set('minutes', 0);                // Set minutes to 00
date.set('seconds', 0);                // Set seconds to 00
```

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:30:00');

// Use negative amount with add() method
date.add(-1, 'days');                  // Subtract 1 day
date.add(-2, 'hours');                 // Subtract 2 hours
date.add(-1, 'weeks');                 // Subtract 1 week
```

#### `startOf(unit)`

Sets the date to the start of the specified unit.

**Parameters:**
- `unit` (string) - Time unit ('years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds')

**Returns:** (KkDate) - Modified date instance

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.startOf('years');                 // 2024-01-01 00:00:00
date.startOf('months');                // 2024-08-01 00:00:00
date.startOf('weeks');                 // 2024-08-19 00:00:00 (Monday)
date.startOf('days');                  // 2024-08-23 00:00:00
date.startOf('hours');                 // 2024-08-23 10:00:00
```

#### `endOf(unit)`

Sets the date to the end of the specified unit.

**Parameters:**
- `unit` (string) - Time unit

**Returns:** (KkDate) - Modified date instance

**Examples:**
```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.endOf('years');                   // 2024-12-31 23:59:59.999
date.endOf('months');                  // 2024-08-31 23:59:59.999
date.endOf('weeks');                   // 2024-08-25 23:59:59.999 (Sunday)
date.endOf('days');                    // 2024-08-23 23:59:59.999
date.endOf('hours');                   // 2024-08-23 10:59:59.999
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
const date = new kk_date('2024-08-23 10:00:00');

const nyTime = date.tz('America/New_York');
const tokyoTime = date.tz('Asia/Tokyo');
const londonTime = date.tz('Europe/London');

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

**Note:** The `clone()` method is not directly available. Create a new instance with the original date instead.

**Examples:**
```javascript
const original = new kk_date('2024-08-23 10:00:00');
const copy = new kk_date(original.getDate());

original.add(1, 'days');
console.log(copy.format('YYYY-MM-DD')); // '2024-08-23' (unchanged)
```

## Static Methods

### Configuration Methods

#### `kk_date.setTimezone(timezone)`

Sets the global default timezone.

**Parameters:**
- `timezone` (string) - IANA timezone identifier

**Examples:**
```javascript
kk_date.setTimezone('UTC');
kk_date.setTimezone('America/New_York');
kk_date.setTimezone('Europe/London');
```

#### `kk_date.getTimezone()`

Gets the global default timezone.

**Returns:** (string) - Current timezone

**Examples:**
```javascript
const currentTimezone = kk_date.getTimezone();
console.log(currentTimezone); // 'UTC'
```

#### `kk_date.setUserTimezone(timezone)`

Sets the user's preferred timezone.

**Parameters:**
- `timezone` (string) - IANA timezone identifier

**Examples:**
```javascript
kk_date.setUserTimezone('America/New_York');
```

#### `kk_date.getUserTimezone()`

Gets the user's preferred timezone.

**Returns:** (string) - User timezone

**Examples:**
```javascript
const userTimezone = kk_date.getUserTimezone();
console.log(userTimezone); // 'America/New_York'
```

#### `kk_date.config(options)`

Sets global configuration including locale, timezone, and week start day.

**Parameters:**
- `options` (object) - Configuration options
  - `locale` (string) - Locale identifier
  - `timezone` (string) - IANA timezone identifier
  - `weekStartDay` (number) - Week start day (0 = Sunday, 1 = Monday, etc.)

**Examples:**
```javascript
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

#### `kk_date.isValid(input)`

Checks if a date input is valid.

**Parameters:**
- `input` (any) - Input to validate

**Returns:** (boolean) - True if valid

**Examples:**
```javascript
kk_date.isValid('2024-08-23');        // true
kk_date.isValid('invalid');            // false
kk_date.isValid(new Date());           // true
```

#### `kk_date.getTimezoneOffset(timezone, date?)`

Gets the timezone offset in milliseconds.

**Parameters:**
- `timezone` (string) - IANA timezone identifier
- `date` (Date, optional) - Date to get offset for (defaults to current date)

**Returns:** (number) - Offset in milliseconds

**Examples:**
```javascript
const offset = kk_date.getTimezoneOffset('America/New_York');
console.log(offset / (60 * 60 * 1000)); // -4 (EDT)
```

#### `kk_date.getAvailableTimezones()`

Gets all available timezones.

**Returns:** (string[]) - Array of timezone identifiers

**Examples:**
```javascript
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
// Access global config
console.log(kk_date.global_config);

// Global config properties
{
    timezone: 'UTC',           // Default timezone
    userTimezone: 'UTC',       // User timezone
    locale: 'en',              // Default locale
    weekStartDay: 0            // Week start day (0 = Sunday)
}
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
