# kk-date

kk-date is a fastest JavaScript library that parses, validations, manipulates, and displays dates and times. If you use Moment.js or Day.js already you can easily use kk-date.

- 🕒 Familiar Moment.js API & Day.js
- 💪 Immutable
- 🔥 Chainable
- 🚀 Native Date
- 🏁 Performance
- 🚄 Cache support (built-in)
- 💬 Native Supports all languages
- 🪂 Native Supports all timezones
- 👌 Throws an error in case of error
- ✅ All browsers supported

## Key Features
- **Simplicity at its Core**: The package is written to be as straightforward as possible, minimizing overhead and ensuring ease of use for basic date handling.
- **Direct Access to Native Date**: Seamlessly work with the native `Date` object, giving you the full power of JavaScript's built-in date functionalities.
- **Optimized for Performance**: If speed and efficiency are critical for your application, `kk-date` is the perfect fit, delivering performance without sacrificing usability.
- **Ongoing Development**: While `kk-date` is currently tailored for basic date operations, we are actively developing it to support more complex date manipulations and formats in future releases.

- Average Speed Improvement: 63.36% faster than other libraries (Cache disabled)
- Average Speed Improvement: 89.05% faster than other libraries (Cache activated)

Whether you're building a lightweight application or need a reliable solution for high-performance date handling, `kk-date` is the package you've been looking for.

## Install 


```bash 
npm install kk-date
```

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

#### .add() supported types:

```console
seconds
minutes
hours
days
months
years
```

## Performance

kk-date is significantly faster than other date libraries. Here are the performance test results (100,000 iterations and cache disabled):

| Test No | Input                            | Test                                | kk-date (ms) | Moment (ms)   | Day.js (ms)   | Speed Improvement |
|---------|----------------------------------|-------------------------------------|--------------|---------------|---------------|-------------------|
| Test 0  | `new Date()`                     | Test 0: Conv. YYYY-MM-DD HH:mm:ss  | 40.911       | 83.405        | 172.908       | 68.08%           |
| Test 1  | `23:50:55`                       | Test 1: Conv. YYYY-MM-DD HH:mm:ss  | 70.695       | 246.388       | unsupported   | 71.31%           |
| Test 2  | `23:50`                          | Test 2: HH:mm                       | 56.632       | 148.467       | unsupported   | 61.86%           |
| Test 3  | `23:50:55`                       | Test 3: Conv. YYYY.MM.DD HH:mm:ss  | 57.242       | 242.548       | unsupported   | 76.40%           |
| Test 4  | `2024-09-17 23:50:55`           | Test 4: Conv. HH:mm:ss             | 115.634      | 410.603       | 150.550       | 58.79%           |
| Test 5  | `2024-09-17 23:50:55`           | Test 5: Conv. YYYY-MM-DD           | 99.838       | 406.091       | 147.972       | 63.96%           |
| Test 6  | `2024-09-17 23:50:55`           | Test 6: Conv. YYYY-MM-DD HH:mm:ss  | 106.713      | 445.424       | 192.036       | 66.52%           |
| Test 7  | `2024-09-17 23:50:55`           | Test 7: Conv. DD.MM.YYYY HH:mm:ss  | 108.853      | 443.083       | 189.553       | 65.59%           |
| Test 8  | `2024-09-17 23:50:55`           | Test 8: Conv. YYYY.MM.DD HH:mm:ss  | 105.644      | 437.514       | 189.436       | 66.30%           |
| Test 9  | `23:50:55`                       | Test 9: isValid                     | 36.273       | 167.665       | 21.565        | 61.66%           |
| Test 10 | `1723996677`                    | Test 10: 1723996677                | 40.318       | 87.270        | 160.296       | 67.43%           |
| Test 11 | `19843077000`                   | Test 11: 19843077000               | 54.189       | 99.046        | 220.117       | 66.04%           |
| Test 12 | `19843077000`                   | Test 12: 19843077000               | 54.061       | 98.737        | 221.504       | 66.24%           |
| Test 13 | `2024-01-01, 2024-01-30`       | Test 13: diff (days)               | 220.089      | 453.381       | 98.016        | 20.17%           |
| Test 14 | `2024-01-01, 2024-01-30`       | Test 14: isBefore                  | 211.467      | 397.626       | 109.471       | 16.60%           |
| Test 15 | `2024-01-01, 2024-01-30`       | Test 15: isBetween                 | 320.828      | 612.430       | 227.452       | 23.60%           |
| Test 16 | `2024-01-01, 2024-01-30`       | Test 16: isAfter                   | 210.050      | 392.652       | 109.189       | 16.29%           |
| Test 17 | `2024-01-01`                    | Test 17: isSame                    | 207.476      | 394.303       | 135.907       | 21.74%           |
| Test 18 | `7 Nisan 2025`                  | Test 18: Turkish Date Format       | 124.890      | unsupported   | unsupported   | 100%            |
| Test 19 | `26:50:24`                      | Test 19: Time Only Format          | 68.346       | unsupported   | unsupported   | 100%            |
| Test 20 | `07.04.2025 15:30:45`          | Test 20: Mixed Separator Format    | 107.377      | 404.128       | 179.378       | 63.20%           |
| Test 21 | `07-Apr-2025`                   | Test 21: Short Month Format        | 158.575      | 506.149       | 192.765       | 54.62%           |
| Test 22 | `April 7, 2025`                 | Test 22: Full Month Name Format    | 153.728      | 510.554       | 194.307       | 56.38%           |
| Test 23 | `7 Nisan Pazartesi, 2025`      | Test 23: Turkish Full Date Format  | 173.122      | unsupported   | unsupported   | 100%            |
| Test 24 | `2025-04-07T15:30:45+02:00`    | Test 24: Timezone Format           | 161.486      | 513.607       | 301.796       | 60.39%           |
| Test 25 | `Mon, Apr 7 2025 15:30:45`     | Test 25: Mixed Date Time Format    | 161.027      | 1057.945      | 189.820       | 74.19%           |
| Test 26 | `31 दिसंबर Sunday`             | Test 26: Hindi Date Format         | 184.544      | unsupported   | unsupported   | 100%            |
| Test 27 | `25th april 2025`               | Test 27: Ordinal Date Format       | 162.376      | 543.175       | unsupported   | 70.11%           |
| Test 28 | `25 апрель 2025`                | Test 28: Russian Date Format       | 140.046      | unsupported   | unsupported   | 100%            |


kk-date is significantly faster than other date libraries. Here are the performance test results (100,000 iterations and cache activated):

| Test No | Input                            | Test                                | kk-date (ms) | Moment (ms)   | Day.js (ms)   | Speed Improvement |
|---------|----------------------------------|-------------------------------------|--------------|---------------|---------------|-------------------|
| Test 0  | `new Date()`                     | Test 0: Conv. YYYY-MM-DD HH:mm:ss  | 41.662       | 82.060        | 179.969       | 68.20%           |
| Test 1  | `23:50:55`                       | Test 1: Conv. YYYY-MM-DD HH:mm:ss  | 40.252       | 254.128       | unsupported   | 84.16%           |
| Test 2  | `23:50`                          | Test 2: HH:mm                       | 37.174       | 157.242       | unsupported   | 76.36%           |
| Test 3  | `23:50:55`                       | Test 3: Conv. YYYY.MM.DD HH:mm:ss  | 26.065       | 252.318       | unsupported   | 89.67%           |
| Test 4  | `2024-09-17 23:50:55`           | Test 4: Conv. HH:mm:ss             | 36.952       | 426.029       | 153.743       | 87.25%           |
| Test 5  | `2024-09-17 23:50:55`           | Test 5: Conv. YYYY-MM-DD           | 18.518       | 421.792       | 146.688       | 93.49%           |
| Test 6  | `2024-09-17 23:50:55`           | Test 6: Conv. YYYY-MM-DD HH:mm:ss  | 22.675       | 442.775       | 194.525       | 92.88%           |
| Test 7  | `2024-09-17 23:50:55`           | Test 7: Conv. DD.MM.YYYY HH:mm:ss  | 24.798       | 442.822       | 184.213       | 92.09%           |
| Test 8  | `2024-09-17 23:50:55`           | Test 8: Conv. YYYY.MM.DD HH:mm:ss  | 22.039       | 439.848       | 189.442       | 93.00%           |
| Test 9  | `23:50:55`                       | Test 9: isValid                     | 7.248        | 168.031       | 22.690        | 92.40%           |
| Test 10 | `1723996677`                    | Test 10: 1723996677                | 47.440       | 89.993        | 161.926       | 62.34%           |
| Test 11 | `19843077000`                   | Test 11: 19843077000               | 54.437       | 99.007        | 225.522       | 66.45%           |
| Test 12 | `19843077000`                   | Test 12: 19843077000               | 55.000       | 99.767        | 221.378       | 65.75%           |
| Test 13 | `2024-01-01, 2024-01-30`       | Test 13: diff (days)               | 38.882       | 449.379       | 102.178       | 85.90%           |
| Test 14 | `2024-01-01, 2024-01-30`       | Test 14: isBefore                  | 15.014       | 391.726       | 110.909       | 94.03%           |
| Test 15 | `2024-01-01, 2024-01-30`       | Test 15: isBetween                 | 20.930       | 605.225       | 227.715       | 94.97%           |
| Test 16 | `2024-01-01, 2024-01-30`       | Test 16: isAfter                   | 14.039       | 395.206       | 113.069       | 94.48%           |
| Test 17 | `2024-01-01`                    | Test 17: isSame                    | 14.491       | 395.093       | 139.329       | 94.58%           |
| Test 18 | `7 Nisan 2025`                  | Test 18: Turkish Date Format       | 40.390       | unsupported   | unsupported   | 100%            |
| Test 19 | `26:50:24`                      | Test 19: Time Only Format          | 41.942       | unsupported   | unsupported   | 100%            |
| Test 20 | `07.04.2025 15:30:45`          | Test 20: Mixed Separator Format    | 23.572       | 418.040       | 186.847       | 92.21%           |
| Test 21 | `07-Apr-2025`                   | Test 21: Short Month Format        | 45.503       | 547.027       | 198.469       | 87.79%           |
| Test 22 | `April 7, 2025`                 | Test 22: Full Month Name Format    | 25.965       | 543.438       | 197.612       | 92.99%           |
| Test 23 | `7 Nisan Pazartesi, 2025`      | Test 23: Turkish Full Date Format  | 44.334       | unsupported   | unsupported   | 100%            |
| Test 24 | `2025-04-07T15:30:45+02:00`    | Test 24: Timezone Format           | 28.377       | 520.586       | 305.216       | 93.13%           |
| Test 25 | `Mon, Apr 7 2025 15:30:45`     | Test 25: Mixed Date Time Format    | 23.364       | 1072.659      | 190.546       | 96.30%           |
| Test 26 | `31 दिसंबर Sunday`             | Test 26: Hindi Date Format         | 46.174       | unsupported   | unsupported   | 100%            |
| Test 27 | `25th april 2025`               | Test 27: Ordinal Date Format       | 44.867       | 555.759       | unsupported   | 91.93%           |
| Test 28 | `25 апрель 2025`                | Test 28: Russian Date Format       | 23.975       | unsupported   | unsupported   | 100%            |

Average Speed Improvement: 89.05% faster than other libraries