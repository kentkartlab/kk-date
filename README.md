
# kk-date

kk-date is a fastest JavaScript library that parses, validations, manipulates, and displays dates and times. If you use Moment.js or Day.js already you can easily use kk-date.

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
DD.MM.YYYY
YYYY.MM.DD
YYYY.MM.DD HH:mm
YYYY.MM.DD HH
YYYY.MM.DD HH:mm:ss
DD.MM.YYYY HH:mm:ss
DD.MM.YYYY HH:mm
dddd
HH:mm:ss
HH:mm
x (Unix timestamps in seconds),
X (Unix timestamps in milliseconds)
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