# kk-date

kk-date is a fastest JavaScript library that parses, validations, manipulates, and displays dates and times. If you use Moment.js or Day.js already you can easily use kk-date.

- 🕒 Familiar Moment.js API & Day.js
- 💪 Immutable
- 🔥 Chainable
- 🚀 Native Date
- 🏁 Performance
- ✅ All browsers supported


## Install 


```bash 
npm install kk-date
```
## Performance

kk-date is significantly faster than other date libraries. Here are the performance test results (500,000 iterations):

| Test No | Input                            | Output                  | kk-date (ms) | Moment (ms) | Day.js (ms) | date-fns (ms) | Speed Improvement |
|---------|----------------------------------|------------------------|--------------|-------------|-------------|---------------|-------------------|
| Test 0  | `new Date()`                     | `2025-03-28 10:47:38`  | 395.620      | 368.116     | 894.900     | 1021.159     | 48.04%           |
| Test 1  | `23:50:55`                       | `2025-03-28 23:50:55`  | 119.236      | 1286.596    | 125.791     | 1121.534     | 85.88%           |
| Test 2  | `23:50`                          | `23:50`                | 78.916       | 778.707     | 120.369     | 485.554      | 82.90%           |
| Test 3  | `23:50:55`                       | `2025.03.28 23:50:55`  | 132.901      | 1283.166    | 126.052     | 1103.839     | 84.13%           |
| Test 4  | `2024-09-17 23:50:55`           | `23:50:55`             | 98.226       | 2143.325    | 730.120     | 552.624      | 91.40%           |
| Test 5  | `2024-09-17 23:50:55`           | `2024-09-17`           | 89.902       | 2116.001    | 770.808     | 582.038      | 92.22%           |
| Test 6  | `2024-09-17 23:50:55`           | `2024-09-17 23:50:55`  | 123.923      | 2258.874    | 923.769     | 1024.718     | 91.16%           |
| Test 7  | `2024-09-17 23:50:55`           | `17.09.2024 23:50:55`  | 128.437      | 2333.586    | 942.768     | 1022.942     | 91.04%           |
| Test 8  | `2024-09-17 23:50:55`           | `2024.09.17 23:50:55`  | 125.126      | 2287.784    | 944.433     | 1016.649     | 91.17%           |
| Test 9  | `23:50:55` isValid               | `true`                 | 34.362       | 855.607     | 114.741     | 133.274      | 90.66%           |
| Test 10 | `1723996677`                    | `18.08.2024 18:57:57`  | 155.302      | 430.004     | 795.976     | 991.946      | 78.99%           |
| Test 11 | `19843077000`                   | `18.08.1970 18:57:57`  | 275.896      | 494.029     | 1105.185    | 1039.693     | 68.64%           |
| Test 12 | `19843077000`                   | `18.08.1970 18:57:57`  | 312.204      | 494.640     | 1131.399    | 1041.889     | 64.89%           |
| Test 13 | `diff (days) 2024-01-01, 2024-01-30` | `29`           | 83.740       | 2292.784    | 479.569     | 711.931      | 92.79%           |
| Test 14 | `isBefore 2024-01-01, 2024-01-30` | `true`         | 68.580       | 2080.274    | 558.856     | 153.871      | 92.63%           |
| Test 15 | `isBetween 2024-01-01, 2024-01-30` | `true`         | 100.250      | 3222.926    | 1177.115    | 271.328      | 93.56%           |
| Test 16 | `isAfter 2024-01-01, 2024-01-30` | `true`         | 67.701       | 2067.655    | 571.015     | 193.695      | 92.83%           |
| Test 17 | `isSame 2024-01-01`             | `true`         | 67.816       | 2030.457    | 707.266     | 154.579      | 92.97%           |

Average Speed Improvement: 85.88% faster than other libraries

## API
It's easy to use kk-date to parse, validate, manipulate, and display dates and times.

### REQUIRE:

```javascript
const kk_date = require('kk-date');
```

##### Enable Caching (optional);
```javascript
kk_date.caching({ status: true, defaultTtl: 1300 });
```
Gain 300% more speed by enabling cache. default is false

##### Disable Caching;
```javascript
kk_date.caching({ status: false });
```

### Examples:

#### Basic Date Operations:
```javascript
// Create a new date
new kk_date('2024-01-01 23:00:00')

// Get native Date object
new kk_date('2024-01-01').getDate()

// Get timestamp
new kk_date('2024-01-01').getTime()

// Get value
new kk_date('2024-01-01').valueOf()

// Get local value
new kk_date('2024-01-01').valueOfLocal()
```

#### Formatting:
```javascript
// Basic format
new kk_date('2024-01-01 23:00:00').format('YYYY-MM-DD')
// 2024-01-01

// Time format
new kk_date('2024-01-01 23:00:00').format('HH:mm:ss')
// 23:00:00

// Full datetime format
new kk_date('2024-01-01 23:00:00').format('YYYY-MM-DD HH:mm:ss')
// 2024-01-01 23:00:00

// Custom format with separator
new kk_date('2024-01-01 23:00:00').format_c(' ', 'YYYY-MM-DD', 'HH:mm:ss')
// 2024-01-01 23:00:00
```

#### Date Manipulation:
```javascript
// Add time
new kk_date('2024-01-01').add(1, 'days').format('YYYY-MM-DD')
// 2024-01-02

// Subtract time
new kk_date('2024-01-05').add(-1, 'days').format('YYYY-MM-DD')
// 2024-01-04

// Set specific date part
new kk_date('2024-01-05').set(1, 'day').format('YYYY-MM-DD')
// 2024-01-01

// Set month
new kk_date('2024-01-05').set(3, 'month').format('YYYY-MM-DD')
// 2024-03-05
```

#### Date Comparison:
```javascript
// Get difference between dates
new kk_date('2024-07-19').diff('2024-09-19', 'months')
// 2

// Get range of dates
new kk_date('2024-07-19').diff_range('2024-09-19', 'months')
// [ '2024-07-19', '2024-08-18', '2024-09-18' ]

// Check if date is before
new kk_date('2024-09-19').isBefore('2024-09-20')
// true

// Check if date is after
new kk_date('2024-09-19').isAfter('2024-09-20')
// false

// Check if date is same or after
new kk_date('2024-09-19 18:00:00').isSameOrAfter('2024-09-19 18:01:00')
// false

// Check if date is same
new kk_date('2024-09-19 18:00:00').isSame('2024-09-19 18:00:00')
// true

// Check if date is between
new kk_date('2024-09-19 18:00:00').isBetween('2024-09-19 12:00:00', '2024-09-19 19:00:00')
// true

// Check if date is same or before
new kk_date('2024-09-19 18:00:00').isSameOrBefore('2024-09-19 18:01:00')
// true
```

#### Date Validation:
```javascript
// Check if date is valid
new kk_date('2024-01-01').isValid()
// true

// Check if time is valid
new kk_date('23:50:55').isValid()
// true
```

#### Timezone Support:
```javascript
// Convert to specific timezone
new kk_date('2024-01-01').tz('America/New_York')

// Configure timezone globally
kk_date.config({ timezone: 'America/New_York' })
```

#### Locale Support:
```javascript
// Configure locale globally
kk_date.config({ locale: 'tr-TR' })

// Configure locale for specific instance
new kk_date('2024-01-01').config({ locale: 'tr-TR' })
```

#### Duration:
```javascript
// Convert seconds to duration object
kk_date.duration(1234, 'minute')
// { year: 0, month: 0, week: 0, day: 0, hour: 20, minute: 34, second: 0, millisecond: 0 }

// Get duration from date
new kk_date('2024-01-01').duration(1234)
// { year: 0, month: 0, week: 0, day: 0, hour: 0, minute: 20, second: 34 }
```

### Supported Format Templates:

```javascript
YYYY-MM-DDTHH:mm:ss
YYYY-MM-DD HH:mm:ss
YYYY-MM-DD HH:mm
YYYY-MM-DD HH
YYYY-MM-DD
YYYYMMDD
DD.MM.YYYY
YYYY.MM.DD
YYYY.MM.DD HH:mm
YYYY.MM.DD HH
YYYY.MM.DD HH:mm:ss
DD.MM.YYYY HH:mm:ss
DD.MM.YYYY HH:mm
DD-MM-YYYY
DD-MM-YYYY HH:mm
DD-MM-YYYY HH:mm:ss
DD-MM-YYYY HH
dddd
HH:mm:ss
HH:mm
x (Unix timestamps in milliseconds)
X (Unix timestamps in seconds)
```

### Supported Time Units for add():

```javascript
seconds
minutes
hours
days
months
years
```

### Native Date Methods:
All native JavaScript Date methods are supported:
- `.toDateString()`
- `.toJSON()`
- `.toUTCString()`
- `.toLocaleDateString(locales, options)`
- `.toLocaleString(locales, options)`
- `.toLocaleTimeString(locales, options)`
- `.toTimeString()`
- `.valueOf()`

## Key Features
- **Simplicity at its Core**: The package is written to be as straightforward as possible, minimizing overhead and ensuring ease of use for basic date handling.
- **Direct Access to Native Date**: Seamlessly work with the native `Date` object, giving you the full power of JavaScript's built-in date functionalities.
- **Optimized for Performance**: If speed and efficiency are critical for your application, `kk-date` is the perfect fit, delivering performance without sacrificing usability.
- **Ongoing Development**: While `kk-date` is currently tailored for basic date operations, we are actively developing it to support more complex date manipulations and formats in future releases.

Whether you're building a lightweight application or need a reliable solution for high-performance date handling, `kk-date` is the package you've been looking for.

#### .format() supported templates:

```console
YYYY-MM-DDTHH:mm:ss
YYYY-MM-DD HH:mm:ss
YYYY-MM-DD HH:mm
YYYY-MM-DD HH
YYYY-MM-DD
YYYYMMDD
DD.MM.YYYY
YYYY.MM.DD
YYYY.MM.DD HH:mm
YYYY.MM.DD HH
YYYY.MM.DD HH:mm:ss
DD.MM.YYYY HH:mm:ss
DD.MM.YYYY HH:mm
DD-MM-YYYY
DD-MM-YYYY HH:mm
DD-MM-YYYY HH:mm:ss
DD-MM-YYYY HH
dddd
HH:mm:ss
HH:mm
x (Unix timestamps in milliseconds),
X (Unix timestamps in seconds)
```

#### .add() supported types:

```console
seconds
minutes
hours
days
months
years
```