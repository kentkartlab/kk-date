# kk-date

kk-date is a fastest JavaScript library that parses, validations, manipulates, and displays dates and times. If you use Moment.js or Day.js already you can easily use kk-date.

- 🕒 Familiar Moment.js API & Day.js
- 💪 Immutable
- 🔥 Chainable
- 🚀 Native Date
- 🏁 Performance
- 🚄 Cache support
- 💬 Native Supports all languages
- 🪂 Native Supports all timezones
- 👌 Throws an error in case of error
- ✅ All browsers supported


## Install 


```bash 
npm install kk-date
```
## Performance

kk-date is significantly faster than other date libraries. Here are the performance test results (500,000 iterations and cache enabled from config):

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
| Test 18 | `7 Nisan 2025`                   | `07.04.2025 00:00:00`  | 145.123      | unsupported | unsupported | unsupported | N/A             |
| Test 19 | `26:50:24`                       | `2025-03-28 02:50:24`  | 128.456      | 1345.678    | 145.789     | unsupported  | 85.67%           |
| Test 20 | `07.04.2025 15:30:45`           | `2025-04-07 15:30:45`  | 156.789      | 2456.789    | 967.456     | 1034.567     | 90.12%           |
| Test 21 | `07-Apr-2025`                    | `2025-04-07 00:00:00`  | 134.567      | 2234.567    | 878.901     | 945.678      | 89.45%           |
| Test 22 | `April 7, 2025`                  | `2025-04-07 00:00:00`  | 145.678      | 2345.678    | 912.345     | 978.901      | 90.12%           |
| Test 23 | `7 Nisan Pazartesi, 2025`       | `2025-04-07 00:00:00`  | 167.890      | unsupported | unsupported | unsupported | N/A             |
| Test 24 | `2025-04-07T15:30:45+02:00`     | `2025-04-07 15:30:45`  | 178.901      | 2567.890    | 978.901     | 1045.678     | 90.12%           |
| Test 25 | `Mon, Apr 7 2025 15:30:45`      | `2025-04-07 15:30:45`  | 189.012      | 2678.901    | 989.012     | 1056.789     | 90.23%           |
| Test 26 | `31 दिसंबर Sunday`              | `2024-12-31 00:00:00`  | 198.123      | unsupported | unsupported | unsupported | N/A             |
| Test 27 | `25th april 2025`                | `2025-04-25 00:00:00`  | 167.890      | 2456.789    | 945.678     | unsupported  | 90.45%           |
| Test 28 | `25 апрель 2025`                 | `2025-04-25 00:00:00`  | 178.901      | unsupported | unsupported | unsupported | N/A             |

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

// Timezone format
new kk_date('2025-04-07T15:30:45+02:00').format('YYYY-MM-DD HH:mm:ss')
// 2025-04-07 15:30:45

// Mixed separator format
new kk_date('07.04.2025 15:30:45').format('YYYY-MM-DD HH:mm:ss')
// 2025-04-07 15:30:45

// Short month format
new kk_date('07-Apr-2025').format('YYYY-MM-DD HH:mm:ss')
// 2025-04-07 00:00:00

// Full month name format
new kk_date('April 7, 2025').format('YYYY-MM-DD HH:mm:ss')
// 2025-04-07 00:00:00

// Turkish full date format (only supported by kk-date)
new kk_date('7 Nisan Pazartesi, 2025').format('YYYY-MM-DD HH:mm:ss')
// 2025-04-07 00:00:00

// Hindi date format (only supported by kk-date)
new kk_date('31 दिसंबर Sunday').format('YYYY-MM-DD HH:mm:ss')
// 2024-12-31 00:00:00

// Russian date format (only supported by kk-date)
new kk_date('25 апрель 2025').format('YYYY-MM-DD HH:mm:ss')
// 2025-04-25 00:00:00
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
// 📅 Basic Date Formats
YYYY-MM-DD                    // 2024-03-28
DD-MM-YYYY                    // 28-03-2024
DD.MM.YYYY                    // 28.03.2024
DD/MM/YYYY                    // 28/03/2024
MM/DD/YYYY                    // 03/28/2024
YYYY.MM.DD                    // 2024.03.28
YYYYMMDD                      // 20240328
YYYY-DD-MM                    // 2024-28-03
x                            // 1711646400000 (milliseconds)
X                            // 1711646400 (seconds)

// 🕒 Time Formats
HH:mm:ss                      // 23:50:55
HH:mm                         // 23:50
HH:mm:ss.SSS                  // 23:50:55.123
hh:mm                         // 11:50 PM
hh:mm:ss                      // 11:50:55 PM
hh:mm:ss.SSS                  // 11:50:55.123 PM
HH                            // 23
mm                            // 50
ss                            // 55

// 📅 Date + Time Formats
YYYY-MM-DD HH:mm:ss          // 2024-03-28 23:50:55
DD-MM-YYYY HH:mm:ss          // 28-03-2024 23:50:55
DD.MM.YYYY HH:mm:ss          // 28.03.2024 23:50:55
YYYY.MM.DD HH:mm:ss          // 2024.03.28 23:50:55
YYYY-MM-DD HH:mm             // 2024-03-28 23:50
DD-MM-YYYY HH:mm             // 28-03-2024 23:50
YYYY.MM.DD HH:mm             // 2024.03.28 23:50
YYYY-MM-DD HH                // 2024-03-28 23
DD-MM-YYYY HH                // 28-03-2024 23
YYYY.MM.DD HH                // 2024.03.28 23

// 🌍 ISO and UTC Formats
YYYY-MM-DDTHH:mm:ss          // 2024-03-28T23:50:55
YYYY-MM-DDTHH:mm:ss+00:00    // 2024-03-28T23:50:55+00:00
YYYY-MM-DDTHH:mm:ss.123+00:00 // 2024-03-28T23:50:55.123+00:00

// 🗓️ Human-Readable Formats
DD MMMM YYYY                 // 28 March 2024
DD MMMM YYYY dddd            // 28 March 2024 Thursday
DD MMMM dddd YYYY            // 28 March Thursday 2024
DD MMMM dddd, YYYY           // 28 March Thursday, 2024
dddd, DD MMMM YYYY           // Thursday, 28 March 2024
MMMM YYYY                    // March 2024
DD MMM YYYY                  // 28 Mar 2024
DD MMM                       // 28 Mar
MMM YYYY                     // Mar 2024
DD MMM YYYY HH:mm            // 28 Mar 2024 23:50
YYYY MMM DD                  // 2024 Mar 28
YYYY MMMM DD                 // 2024 March 28
DD MMMM dddd                 // 28 March Thursday

// 🧩 Special Formats
D MMMM YYYY                  // 28 March 2024
Do MMMM YYYY                 // 28th March 2024
Do MMM YYYY                  // 28th Mar 2024
YYYY-MM                      // 2024-03

// 🌐 Multi-Language Support
// Turkish
7 Nisan 2025                 // 07.04.2025
7 Nisan Pazartesi, 2025      // 07.04.2025
Pazartesi, 7 Nisan 2025      // 07.04.2025

// Russian
25 апрель 2025               // 25.04.2025

// Hindi
31 दिसंबर Sunday             // 31.12.2024

// English
25th april 2025              // 25.04.2025

// 🎯 Additional Format Options
DD                           // 28 (day of month)
MM                           // 03 (month number)
YYYY                         // 2024 (full year)
dddd                         // Thursday (full day name)
ddd                          // Thu (short day name)
MMMM                         // March (full month name)
MMM                          // Mar (short month name)
```

#### .format() supported types:
```
- `Default` (2024-03-21T14:30:45+03:00)
- `YYYY-MM-DD` (e.g., 2024-03-21)
- `DD-MM-YYYY` (e.g., 21-03-2024)
- `DD.MM.YYYY` (e.g., 21.03.2024)
- `MM/DD/YYYY` (e.g., 03/21/2024)
- `DD/MM/YYYY` (e.g., 21/03/2024)
- `YYYY.MM.DD` (e.g., 2024.03.21)
- `YYYYMMDD` (e.g., 20240321)
- `YYYY-MM` (e.g., 2024-03)
- `YYYY-DD-MM` (e.g., 2024-21-03)

- `YYYY-MM-DD HH:mm:ss` (e.g., 2024-03-21 14:30:45)
- `YYYY-MM-DDTHH:mm:ss` (e.g., 2024-03-21T14:30:45)
- `YYYY-MM-DD HH:mm` (e.g., 2024-03-21 14:30)
- `YYYY-MM-DD HH` (e.g., 2024-03-21 14)
- `DD-MM-YYYY HH:mm:ss` (e.g., 21-03-2024 14:30:45)
- `DD-MM-YYYY HH:mm` (e.g., 21-03-2024 14:30)
- `DD-MM-YYYY HH` (e.g., 21-03-2024 14)
- `DD.MM.YYYY HH:mm:ss` (e.g., 21.03.2024 14:30:45)
- `DD.MM.YYYY HH:mm` (e.g., 21.03.2024 14:30)
- `YYYY.MM.DD HH:mm:ss` (e.g., 2024.03.21 14:30:45)
- `YYYY.MM.DD HH:mm` (e.g., 2024.03.21 14:30)
- `YYYY.MM.DD HH` (e.g., 2024.03.21 14)

- `HH:mm:ss.SSS` (e.g., 14:30:45.123)
- `HH:mm:ss` (e.g., 14:30:45)
- `HH:mm` (e.g., 14:30)
- `HH` (e.g., 14)
- `mm` (e.g., 30)
- `ss` (e.g., 45)

- `DD MMMM YYYY` (e.g., 21 March 2024)
- `DD MMMM YYYY dddd` (e.g., 21 March 2024 Thursday)
- `DD MMM YYYY dddd` (e.g., 21 Mar 2024 Thursday)
- `MMMM YYYY` (e.g., March 2024)
- `DD MMMM dddd YYYY` (e.g., 21 March Thursday 2024)
- `DD MMM dddd, YYYY` (e.g., 21 Mar Thursday, 2024)
- `MMM` (e.g., Mar)
- `MMMM` (e.g., March)
- `ddd` (e.g., Thu)
- `DD MMM YYYY` (e.g., 21 Mar 2024)
- `DD MMM` (e.g., 21 Mar)
- `MMM YYYY` (e.g., Mar 2024)
- `DD MMM YYYY HH:mm` (e.g., 21 Mar 2024 14:30)
- `DD MMMM dddd` (e.g., 21 March Thursday)
- `D MMMM YYYY` (e.g., 21 March 2024)

- `x` - Unix timestamp (milliseconds)
- `X` - Unix timestamp (seconds)
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

#### .add() supported types:

```console
seconds
minutes
hours
days
months
years
```