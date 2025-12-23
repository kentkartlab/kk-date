# Formatting Guide

Complete guide to date and time formatting in kk-date, including all supported templates and examples.

## Table of Contents

- [Introduction](#introduction)
- [Basic Format Templates](#basic-format-templates)
- [Date Format Templates](#date-format-templates)
- [Time Format Templates](#time-format-templates)
- [DateTime Format Templates](#datetime-format-templates)
- [Custom Formatting](#custom-formatting)
- [Locale Support](#locale-support)
- [Examples](#examples)

## Introduction

kk-date provides comprehensive date and time formatting capabilities with support for 50+ predefined formats and custom templates. The `format()` method allows you to convert dates into human-readable strings using various templates.

### Basic Usage

```javascript
const kk_date = require('kk-date');

const date = new kk_date('2024-08-23 10:30:45');

// Format using templates
const formatted = date.format('YYYY-MM-DD HH:mm:ss');
console.log(formatted); // '2024-08-23 10:30:45'
```

## Basic Format Templates

### Year Templates

| Template | Description | Example |
|----------|-------------|---------|
| `YYYY` | 4-digit year | `2024` |

**Note:** `YY` (2-digit year) template is not available in this implementation.

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYY'); // '2024'
```

### Month Templates

| Template | Description | Example |
|----------|-------------|---------|
| `MM` | 2-digit month (01-12) | `08` |
| `MMMM` | Full month name | `August` |
| `MMM` | Short month name | `Aug` |

**Note:** `M` (single digit month) template is not available in this implementation.

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('MM');    // '08'
date.format('MMMM');  // 'August'
date.format('MMM');   // 'Aug'
```

### Day Templates

| Template | Description | Example |
|----------|-------------|---------|
| `DD` | 2-digit day (01-31) | `23` |

**Note:** `D` (single digit day) template is not available in this implementation.

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('DD'); // '23'
```

### Hour Templates

| Template | Description | Example |
|----------|-------------|---------|
| `HH` | 2-digit hour (00-23) | `10` |

**Note:** `H` (single digit hour), `hh`, and `h` (12-hour format) templates are not available as standalone templates. However, `hh` is available in time format combinations like `'hh:mm'` and `'hh:mm:ss'`.

```javascript
const date = new kk_date('2024-08-23 22:30:45');

date.format('HH'); // '22'
// For 12-hour format, use combined formats:
date.format('hh:mm'); // '10:30' (12-hour format with AM/PM)
```

### Minute Templates

| Template | Description | Example |
|----------|-------------|---------|
| `mm` | 2-digit minute (00-59) | `30` |

**Note:** `m` (single digit minute) template is not available as a standalone template.

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('mm'); // '30'
```

### Second Templates

| Template | Description | Example |
|----------|-------------|---------|
| `ss` | 2-digit second (00-59) | `45` |

**Note:** `s` (single digit second) template is not available as a standalone template.

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('ss'); // '45'
```

### Millisecond Templates

| Template | Description | Example |
|----------|-------------|---------|
| `SSS` | 3-digit millisecond (000-999) | `123` |

**Note:** `SSS` is only available in time format combinations like `'HH:mm:ss.SSS'`.

```javascript
const date = new kk_date('2024-08-23 10:30:45.123');

// SSS is not available as standalone, use in combinations:
date.format('HH:mm:ss.SSS'); // '10:30:45.123'
```

### Weekday Templates

| Template | Description | Example |
|----------|-------------|---------|
| `dddd` | Full weekday name | `Friday` |
| `ddd` | Short weekday name | `Fri` |

```javascript
const date = new kk_date('2024-08-23 10:30:45'); // Friday

date.format('dddd'); // 'Friday'
date.format('ddd');  // 'Fri'
```

## Date Format Templates

### Standard Date Formats

| Template | Description | Example |
|----------|-------------|---------|
| `YYYY-MM-DD` | ISO date format | `2024-08-23` |
| `DD.MM.YYYY` | European date format | `23.08.2024` |
| `DD-MM-YYYY` | European date format with dashes | `23-08-2024` |
| `MM/DD/YYYY` | US date format | `08/23/2024` |
| `DD/MM/YYYY` | UK date format | `23/08/2024` |
| `YYYYMMDD` | Compact date format | `20240823` |
| `YYYYMMDDHHmmss` | Compact datetime format | `20240823103045` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYY-MM-DD'); // '2024-08-23'
date.format('DD.MM.YYYY'); // '23.08.2024'
date.format('DD-MM-YYYY'); // '23-08-2024'
date.format('MM/DD/YYYY'); // '08/23/2024'
date.format('DD/MM/YYYY'); // '23/08/2024'
date.format('YYYYMMDD');   // '20240823'
date.format('YYYYMMDDHHmmss'); // '20240823103045'
```

### Named Date Formats

| Template | Description | Example |
|----------|-------------|---------|
| `DD MMMM YYYY` | Day with full month name | `23 August 2024` |
| `DD MMM YYYY` | Day with short month name | `23 Aug 2024` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('DD MMMM YYYY'); // '23 August 2024'
date.format('DD MMM YYYY');  // '23 Aug 2024'
```

### Weekday Date Formats

| Template | Description | Example |
|----------|-------------|---------|
| `dddd, DD MMMM YYYY` | Full weekday with date | `Friday, 23 August 2024` |
| `DD MMMM YYYY dddd` | Date with full weekday | `23 August 2024 Friday` |
| `DD MMMM dddd YYYY` | Date with weekday and year | `23 August Friday 2024` |

```javascript
const date = new kk_date('2024-08-23 10:30:45'); // Friday

date.format('dddd, DD MMMM YYYY'); // 'Friday, 23 August 2024'
date.format('DD MMMM YYYY dddd');  // '23 August 2024 Friday'
date.format('DD MMMM dddd YYYY');  // '23 August Friday 2024'
```

### Month-Year Formats

| Template | Description | Example |
|----------|-------------|---------|
| `MMMM YYYY` | Full month and year | `August 2024` |
| `MMM YYYY` | Short month and year | `Aug 2024` |
| `YYYY MMM DD` | Year, short month, day | `2024 Aug 23` |
| `YYYY MMMM DD` | Year, full month, day | `2024 August 23` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('MMMM YYYY');   // 'August 2024'
date.format('MMM YYYY');    // 'Aug 2024'
date.format('YYYY MMM DD'); // '2024 Aug 23'
date.format('YYYY MMMM DD'); // '2024 August 23'
```

## Time Format Templates

### Standard Time Formats

| Template | Description | Example |
|----------|-------------|---------|
| `HH:mm:ss` | 24-hour time with seconds | `10:30:45` |
| `HH:mm` | 24-hour time without seconds | `10:30` |
| `hh:mm:ss` | 12-hour time with seconds | `10:30:45` |
| `hh:mm` | 12-hour time without seconds | `10:30` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('HH:mm:ss'); // '10:30:45'
date.format('HH:mm');    // '10:30'
date.format('hh:mm:ss'); // '10:30:45'
date.format('hh:mm');    // '10:30'
```

### Time with Milliseconds

| Template | Description | Example |
|----------|-------------|---------|
| `HH:mm:ss.SSS` | 24-hour time with milliseconds | `10:30:45.123` |
| `hh:mm:ss.SSS` | 12-hour time with milliseconds | `10:30:45.123` |

```javascript
const date = new kk_date('2024-08-23 10:30:45.123');

date.format('HH:mm:ss.SSS'); // '10:30:45.123'
date.format('hh:mm:ss.SSS'); // '10:30:45.123'
```

### Individual Time Components

| Template | Description | Example |
|----------|-------------|---------|
| `HH` | Hour only (24-hour) | `10` |
| `mm` | Minute only | `30` |
| `ss` | Second only | `45` |

**Note:** Individual time components are available as standalone templates except for `SSS` which requires combined formats.

```javascript
const date = new kk_date('2024-08-23 10:30:45.123');

date.format('HH');  // '10'
date.format('mm');  // '30'
date.format('ss');  // '45'
// For milliseconds, use combined format:
date.format('HH:mm:ss.SSS'); // '10:30:45.123'
```

## DateTime Format Templates

### Standard DateTime Formats

| Template | Description | Example |
|----------|-------------|---------|
| `YYYY-MM-DD HH:mm:ss` | ISO datetime format | `2024-08-23 10:30:45` |
| `YYYY-MM-DD HH:mm` | ISO datetime without seconds | `2024-08-23 10:30` |
| `DD.MM.YYYY HH:mm:ss` | European datetime format | `23.08.2024 10:30:45` |
| `DD.MM.YYYY HH:mm` | European datetime without seconds | `23.08.2024 10:30` |
| `DD-MM-YYYY HH:mm:ss` | European datetime with dashes | `23-08-2024 10:30:45` |
| `MM/DD/YYYY HH:mm:ss` | US datetime format | `08/23/2024 10:30:45` |
| `YYYY.MM.DD HH:mm:ss` | Dotted datetime format | `2024.08.23 10:30:45` |
| `YYYY.MM.DD HH:mm` | Dotted datetime without seconds | `2024.08.23 10:30` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYY-MM-DD HH:mm:ss'); // '2024-08-23 10:30:45'
date.format('YYYY-MM-DD HH:mm');    // '2024-08-23 10:30'
date.format('DD.MM.YYYY HH:mm:ss'); // '23.08.2024 10:30:45'
date.format('DD.MM.YYYY HH:mm');    // '23.08.2024 10:30'
date.format('DD-MM-YYYY HH:mm:ss'); // '23-08-2024 10:30:45'
date.format('MM/DD/YYYY HH:mm:ss'); // '08/23/2024 10:30:45'
date.format('YYYY.MM.DD HH:mm:ss'); // '2024.08.23 10:30:45'
date.format('YYYY.MM.DD HH:mm');    // '2024.08.23 10:30'
```

### ISO 8601 Format

| Template | Description | Example |
|----------|-------------|---------|
| `YYYY-MM-DDTHH:mm:ss` | ISO 8601 format | `2024-08-23T10:30:45` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYY-MM-DDTHH:mm:ss'); // '2024-08-23T10:30:45'
```

### Named DateTime Formats

| Template | Description | Example |
|----------|-------------|---------|
| `DD MMMM YYYY HH:mm` | Date with full month and time | `23 August 2024 10:30` |
| `DD MMMM dddd, YYYY` | Date with weekday and comma | `23 August Friday, 2024` |
| `YYYY MMM DD` | Year-month-day format | `2024 Aug 23` |
| `YYYY MMMM DD` | Year-fullmonth-day format | `2024 August 23` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('DD MMMM YYYY HH:mm');   // '23 August 2024 10:30'
date.format('DD MMMM dddd, YYYY');   // '23 August Friday, 2024'
date.format('YYYY MMM DD');          // '2024 Aug 23'
date.format('YYYY MMMM DD');         // '2024 August 23'
```

### Compact Formats

| Template | Description | Example |
|----------|-------------|---------|
| `YYYY-MM-DD HH:mm` | Compact datetime | `2024-08-23 10:30` |
| `DD.MM.YYYY HH:mm` | European compact | `23.08.2024 10:30` |
| `MM/DD/YYYY HH:mm` | US compact | `08/23/2024 10:30` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYY-MM-DD HH:mm'); // '2024-08-23 10:30'
date.format('DD.MM.YYYY HH:mm'); // '23.08.2024 10:30'
date.format('MM/DD/YYYY HH:mm'); // '08/23/2024 10:30'
```

## Custom Formatting

### Combining Templates

You can combine any templates to create custom formats:

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// Custom formats
date.format('YYYY/MM/DD at HH:mm');     // '2024/08/23 at 10:30'
date.format('Today is dddd');           // 'Today is Friday'
date.format('Time: HH:mm:ss on DD MMM'); // 'Time: 10:30:45 on 23 Aug'
```

### Special Characters

You can include any characters in your format string:

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('Date: YYYY-MM-DD');        // 'Date: 2024-08-23'
date.format('Time: HH:mm:ss');          // 'Time: 10:30:45'
date.format('Created on DD/MM/YYYY');   // 'Created on 23/08/2024'
```

### Conditional Formatting

You can create conditional formats based on date properties:

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// Different formats for different times
const hour = parseInt(date.format('HH'), 10);
if (hour < 12) {
    console.log(date.format('Good morning! It\'s HH:mm')); // 'Good morning! It's 10:30'
} else if (hour < 18) {
    console.log(date.format('Good afternoon! It\'s HH:mm')); // 'Good afternoon! It's 10:30'
} else {
    console.log(date.format('Good evening! It\'s HH:mm')); // 'Good evening! It's 10:30'
}
```

## Locale Support

### Setting Locale

kk-date supports different locales for month and weekday names:

```javascript
const kk_date = require('kk-date');

// Set global locale
kk_date.config({ locale: 'tr' });

const date = new kk_date('2024-08-23 10:30:45');

// Turkish month and weekday names
date.format('DD MMMM YYYY'); // '23 Ağustos 2024'
date.format('dddd, DD MMMM'); // 'Cuma, 23 Ağustos'
```

### Available Locales

The library supports various locales including:

- `en` - English (default)
- `tr` - Turkish
- `de` - German
- `fr` - French
- `es` - Spanish
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `ja` - Japanese
- `ko` - Korean
- `zh` - Chinese
- `ar` - Arabic
- `hi` - Hindi

### Locale Examples

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// Different locales
const locales = ['en', 'tr', 'de', 'fr', 'es'];

locales.forEach(locale => {
    kk_date.config({ locale: locale });
    console.log(`${locale}: ${date.format('dddd, DD MMMM YYYY')}`);
});

// Output:
// en: Friday, 23 August 2024
// tr: Cuma, 23 Ağustos 2024
// de: Freitag, 23 August 2024
// fr: Vendredi, 23 août 2024
// es: Viernes, 23 agosto 2024
```


## Examples

### Common Use Cases

#### 1. File Naming

```javascript
const date = new kk_date();

// Create timestamped filenames
const dateStr = date.format('YYYYMMDD');
const timeStr = date.format('HH:mm:ss').replace(/:/g, '');
const filename = `backup_${dateStr}_${timeStr}.zip`;
console.log(filename); // 'backup_20240823_143045.zip'

const logFile = `app_${date.format('YYYY-MM-DD')}.log`;
console.log(logFile); // 'app_2024-08-23.log'
```

#### 2. Database Queries

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// SQL date format
const sqlDate = date.format('YYYY-MM-DD');
console.log(`SELECT * FROM events WHERE date = '${sqlDate}'`);
// SELECT * FROM events WHERE date = '2024-08-23'

// SQL datetime format
const sqlDateTime = date.format('YYYY-MM-DD HH:mm:ss');
console.log(`INSERT INTO logs (timestamp) VALUES ('${sqlDateTime}')`);
// INSERT INTO logs (timestamp) VALUES ('2024-08-23 10:30:45')
```

#### 3. User Interface

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// Display formats
const displayDate = date.format('DD MMMM YYYY');
const displayTime = date.format('HH:mm');
const displayDateTime = date.format('dddd, DD MMMM YYYY at HH:mm');

console.log(`Date: ${displayDate}`);           // Date: 23 August 2024
console.log(`Time: ${displayTime}`);           // Time: 10:30
console.log(`Full: ${displayDateTime}`);       // Full: Friday, 23 August 2024 at 10:30
```

#### 4. API Responses

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// API response formats
const apiResponse = {
    id: 123,
    title: 'Sample Event',
    created_at: date.format('YYYY-MM-DDTHH:mm:ss'),
    display_date: date.format('DD MMMM YYYY'),
    display_time: date.format('HH:mm'),
    timestamp: date.getTime()
};

console.log(JSON.stringify(apiResponse, null, 2));
// {
//   "id": 123,
//   "title": "Sample Event",
//   "created_at": "2024-08-23T10:30:45",
//   "display_date": "23 August 2024",
//   "display_time": "10:30",
//   "timestamp": 1724407200000
// }
```

#### 5. Calendar Applications

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// Calendar display formats
const calendarDate = date.format('DD');
const calendarMonth = date.format('MMM');
const calendarYear = date.format('YYYY');
const eventTime = date.format('HH:mm');

console.log(`Calendar: ${calendarDate} ${calendarMonth} ${calendarYear}`); // Calendar: 23 Aug 2024
console.log(`Event time: ${eventTime}`); // Event time: 10:30
```

#### 6. Logging

```javascript
const date = new kk_date();

// Log formats
const logTimestamp = date.format('YYYY-MM-DD HH:mm:ss.SSS');
const logDate = date.format('DD/MM/YYYY');
const logTime = date.format('HH:mm:ss');

console.log(`[${logTimestamp}] INFO: Application started`);
// [2024-08-23 14:30:45.123] INFO: Application started

// For filename, combine separate format calls
const logDateFile = date.format('YYYYMMDD');
const logTimeFile = date.format('HH:mm:ss').replace(/:/g, '');
console.log(`Log file: ${logDateFile}_${logTimeFile}.log`);
// Log file: 20240823_143045.log
```

### Performance Tips

1. **Reuse Format Strings**: Define format strings as constants to avoid repeated string creation
2. **Use Appropriate Templates**: Choose the most specific template for your needs
3. **Avoid Complex Custom Formats**: Simple templates are faster than complex combinations

```javascript
// Good: Reuse format strings
const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm:ss';
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const date = new kk_date();
console.log(date.format(DATE_FORMAT));
console.log(date.format(TIME_FORMAT));
console.log(date.format(DATETIME_FORMAT));
```

### Error Handling

The `format()` method handles invalid templates gracefully:

```javascript
const date = new kk_date('2024-08-23 10:30:45');

try {
    // Invalid template
    const result = date.format('INVALID_TEMPLATE');
    console.log(result);
} catch (error) {
    console.log('Format error:', error.message);
    // Fallback to default format
    console.log(date.format('YYYY-MM-DD HH:mm:ss'));
}
```
