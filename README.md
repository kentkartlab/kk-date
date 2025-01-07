
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

#### if the same function is called 400k times.

```console
date: '23:50:55' expected format: YYYY-MM-DD HH:mm:ss
```

| Package | ms   |
| :-------- | :------------------------- |
| kk-date | 446.264ms | WIN!
| moment | 933.953ms |
| day.js | 1267ms |

```console
date: '2024-09-17 23:50:55' expected format: HH:mm:ss
```

| Package | ms   |
| :-------- | :------------------------- |
| kk-date | 111.182ms | WIN!
| day.js | 588.194ms |
| moment | 1760ms |

```console
diff 2024-01-01 - 2024-01-30
```

| Package | ms   |
| :-------- | :------------------------- |
| kk-date | 127.343ms | WIN!
| day.js | 313.93ms |
| moment | 1806ms |



## API
It's easy to use kk-date to parse, validate, manipulate, and display dates and times.

### REQUIRE:

```javascript
  const kk_date = require('kk-date');
```
##### Enable Caching (optional);
```javascript
  kk_date.caching({ status: true, isMemoryStatsEnabled: false, defaultTtl: 1300 });
```
Gain 300% more speed by enabling cache. default is false

##### Disable Caching;
```javascript
  kk_date.caching({ status: false });
```

### Examples:
#### format:
```javascript
new kk_date('2024-01-01 23:00:00').format('YYYY-MM-DD')
// 2024-01-01
```
#### format:
```javascript
new kk_date('2024-01-01 23:00:00').format('HH:mm:ss')
// 23:00:00
```
#### format:
```javascript
new kk_date('2024-01-01 23:00:00').format('YYYY-MM-DD HH:mm:ss')
// 2024-01-01 23:00:00
```
#### add:
```javascript
new kk_date('2024-01-01').add(1, 'days').format('YYYY-MM-DD')
// 2024-01-02
```
#### add (subtract):
```javascript
new kk_date('2024-01-05').add(-1, 'days').format('YYYY-MM-DD')
// 2024-01-04
```
#### set (day):
```javascript
new kk_date('2024-01-05').set(1, 'day').format('YYYY-MM-DD')
// 2024-01-01
```
#### set (month):
```javascript
new kk_date('2024-01-05').set(3, 'month').format('YYYY-MM-DD')
// 2024-03-05
```
#### diff:
```javascript
new kk_date('2024-07-19').diff('2024-09-19', 'months')
// 2
```
#### diff_range:
```javascript
new kk_date('2024-07-19').diff_range('2024-09-19', 'months')
// [ '2024-07-19', '2024-08-18', '2024-09-18' ]
```
#### isBefore:
```javascript
new kk_date('2024-09-19').isBefore('2024-09-20')
// true
```
#### isAfter:
```javascript
new kk_date('2024-09-19').isAfter('2024-09-20')
// false
```
#### isSameOrAfter:
```javascript
new kk_date('2024-09-19 18:00:00').isSameOrAfter('2024-09-19 18:01:00')
// false
```
#### isSame:
```javascript
new kk_date('2024-09-19 18:00:00').isSame('2024-09-19 18:00:00')
// true
```
#### isBetween:
```javascript
new kk_date('2024-09-19 18:00:00').isBetween('2024-09-19 12:00:00', '2024-09-19 19:00:00')
// true
```

#### Others:
[.toDateString();](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toDateString)

[.toJSON();](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON)

[.toUTCString();](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toUTCString)

[.toLocaleDateString(locales, options);](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString)

[.toLocaleString(locales, options);](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString)

[.toLocaleTimeString(locales, options);](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString)

[.toTimeString();](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toTimeString)

[.valueOf();](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/valueOf)


### Notes:
The `kk-date` package is designed with simplicity and performance in mind, offering a streamlined way to handle date objects in JavaScript. When you instantiate the class, you can effortlessly access the native JavaScript `Date` object via the `date` key, making it intuitive for those familiar with the standard `Date` API.

## Key Features
- **Simplicity at its Core**: The package is written to be as straightforward as possible, minimizing overhead and ensuring ease of use for basic date handling.
- **Direct Access to Native Date**: Seamlessly work with the native `Date` object, giving you the full power of JavaScript's built-in date functionalities.
- **Optimized for Performance**: If speed and efficiency are critical for your application, `kk-date` is the perfect fit, delivering performance without sacrificing usability.
- **Ongoing Development**: While `kk-date` is currently tailored for basic date operations, we are actively developing it to support more complex date manipulations and formats in future releases.

Whether you're building a lightweight application or need a reliable solution for high-performance date handling, `kk-date` is the package you’ve been looking for.

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
#### Performance Tests (cache enabled):
| Test No | input                            | Output                  | kk-date  | Moment  | Day.js | date-fns  |
|---------|----------------------------------|------------------------|----------------|---------------|---------------|-----------------|
| Test 0  | `new Date`                       | `2024-09-04 15:30:00`  | 163.529ms      | 374.127ms     | N/A           | 799.957ms       |
| Test 1  | `23:50:55`                       | `2024-09-04 23:50:55`  | 125.225ms      | 954.643ms     | 1.202s        | 807.904ms       |
| Test 2  | `23:50`                          | `23:50`                | 173.597ms      | 591.453ms     | 796.459ms     | 331.762ms       |
| Test 3  | `23:50:55`                       | `2024.09.04 23:50:55`  | 123.571ms      | 952.301ms     | 1.183s        | 798.924ms       |
| Test 4  | `2024-09-17 23:50:55`            | `23:50:55`             | 123.55ms       | 1.635s        | 569.191ms     | N/A             |
| Test 5  | `2024-09-17 23:50:55`            | `2024-09-17`           | 119.81ms       | 1.620s        | 571.845ms     | N/A             |
| Test 6  | `2024-09-17 23:50:55`            | `2024-09-17 23:50:55`  | 248.857ms      | 1.769s        | 721.491ms     | N/A             |
| Test 7  | `2024-09-17 23:50:55`            | `17.09.2024 23:50:55`  | 158.367ms      | 1.787s        | 740.896ms     | N/A             |
| Test 8  | `2024-09-17 23:50:55`            | `2024.09.17 23:50:55`  | 165.413ms      | 1.789s        | 738.167ms     | N/A             |
| Test 9  | `23:50:55` isValid                      | `Boolean`                | 64.785ms      | 671.449ms     | N/A           | N/A             |
| Test 10 | `1723996677`                     | `27.08.2024 05:51:17`  | 173.895ms      | 416.96ms      | 797.691ms     | N/A             |
| Test 11 | `19843077000`                    | `27.08.2056 05:55:00`  | 172.668ms      | 414.394ms     | 757.555ms     | N/A             |
| Test 12 | `19843077000`                    | `27.08.2056 05:55:00`  | 169.85ms       | 416.481ms     | 753.213ms     | N/A             |
| Test 13 | `diff (days) 2024-01-01, 2024-01-30` | `29`               | 126.738ms      | 1.662s        | 312.043ms     | N/A             |
| Test 14 | `isBefore 2024-01-01, 2024-01-30` | `true`               | 126.651ms      | 1.617s        | 345.618ms     | N/A             |
| Test 15 | `isBetween 2024-01-01, 2024-01-30` | `true`               | 185.48ms       | 2.357s        | 717.21ms      | N/A             |
| Test 16 | `isAfter 2024-01-01, 2024-01-30` | `true`                 | 122.112ms      | 1.565s        | 335.345ms     | N/A             |
| Test 17 | `isSame 2024-01-01`              | `true`                 | 123.669ms      | 1.576s        | 456.979ms     | N/A             |
