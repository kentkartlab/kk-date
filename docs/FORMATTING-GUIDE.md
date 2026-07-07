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
| `YY` | 2-digit year | `24` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYY'); // '2024'
date.format('YY');   // '24'
```

### Month Templates

| Template | Description | Example |
|----------|-------------|---------|
| `MM` | 2-digit month (01-12) | `08` |
| `M` | Month, no padding (1-12) | `8` |
| `Mo` | Month with ordinal | `8th` |
| `MMMM` | Full month name | `August` |
| `MMM` | Short month name | `Aug` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('MM');    // '08'
date.format('M');     // '8'
date.format('Mo');    // '8th'
date.format('MMMM');  // 'August'
date.format('MMM');   // 'Aug'
```

### Quarter Templates

| Template | Description | Example |
|----------|-------------|---------|
| `Q` | Quarter of year (1-4) | `3` |
| `Qo` | Quarter with ordinal | `3rd` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('[Q]Q [of] YYYY'); // 'Q3 of 2024'
date.format('Qo');             // '3rd'
```

### Day Templates

| Template | Description | Example |
|----------|-------------|---------|
| `DD` | 2-digit day (01-31) | `23` |
| `D` | Day, no padding (1-31) | `23` |
| `Do` | Day with ordinal | `23rd` |
| `DDD` | Day of year, no padding (1-366) | `236` |
| `DDDo` | Day of year with ordinal | `236th` |
| `DDDD` | Day of year, 3-digit | `236` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('DD');   // '23'
date.format('D');    // '23'
date.format('Do');   // '23rd'
date.format('DDD');  // '236'
```

### Hour Templates

| Template | Description | Example |
|----------|-------------|---------|
| `HH` | 2-digit hour (00-23) | `22` |
| `H` | Hour, no padding (0-23) | `22` |
| `hh` | 2-digit hour, 12-hour clock (01-12) | `10` |
| `h` | Hour, 12-hour clock, no padding (1-12) | `10` |
| `kk` | 2-digit hour, 1-24 clock (01-24) | `22` |
| `k` | Hour, 1-24 clock, no padding (1-24) | `22` |

```javascript
const date = new kk_date('2024-08-23 22:30:45');

date.format('HH');    // '22'
date.format('H');     // '22'
// 12-hour tokens without an explicit A/a append an AM/PM suffix:
date.format('hh:mm'); // '10:30 PM'
date.format('h:mm A'); // '10:30 PM'
// 1-24 clock renders midnight as 24:
new kk_date('2024-08-23 00:15:00').format('k'); // '24'
```

### Minute Templates

| Template | Description | Example |
|----------|-------------|---------|
| `mm` | 2-digit minute (00-59) | `30` |
| `m` | Minute, no padding (0-59) | `30` |

```javascript
const date = new kk_date('2024-08-23 10:05:45');

date.format('mm'); // '05'
date.format('m');  // '5'
```

### Second Templates

| Template | Description | Example |
|----------|-------------|---------|
| `ss` | 2-digit second (00-59) | `45` |
| `s` | Second, no padding (0-59) | `45` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('ss'); // '45'
date.format('s');  // '45'
```

### Fractional Second Templates

| Template | Description | Example |
|----------|-------------|---------|
| `S` | Tenths of a second | `1` |
| `SS` | Hundredths of a second | `12` |
| `SSS` | 3-digit millisecond (000-999) | `123` |
| `SSSS`..`SSSSSSSSS` | Milliseconds right-padded with zeros | `1230` |

```javascript
const date = new kk_date('2024-08-23 10:30:45.123');

date.format('HH:mm:ss.SSS'); // '10:30:45.123'
date.format('SSS');          // '123'
date.format('S');            // '1'
date.format('SSSSSS');       // '123000'
```

### Weekday Templates

| Template | Description | Example |
|----------|-------------|---------|
| `dddd` | Full weekday name | `Friday` |
| `ddd` | Short weekday name | `Fri` |
| `dd` | Two-character weekday name | `Fr` |
| `d` | Day of week (0=Sunday .. 6=Saturday) | `5` |
| `do` | Day of week with ordinal | `5th` |
| `e` | Day of week relative to `weekStartDay` (0-6) | `5` |
| `E` | ISO day of week (1=Monday .. 7=Sunday) | `5` |

```javascript
const date = new kk_date('2024-08-23 10:30:45'); // Friday

date.format('dddd'); // 'Friday'
date.format('ddd');  // 'Fri'
date.format('dd');   // 'Fr'
date.format('d');    // '5'
date.format('E');    // '5'
```

### Week of Year Templates

Locale weeks start on the configured `weekStartDay` (default `0` = Sunday) and week 1 is
the week containing January 1. ISO weeks start on Monday and week 1 is the week containing
the first Thursday of the year. The week-year (`gggg`/`GGGG`) can differ from the calendar
year at year boundaries.

| Template | Description | Example |
|----------|-------------|---------|
| `w` | Week of year, no padding | `34` |
| `wo` | Week of year with ordinal | `34th` |
| `ww` | Week of year, 2-digit | `34` |
| `gggg` | Week-year (4-digit) | `2024` |
| `gg` | Week-year (2-digit) | `24` |
| `W` | ISO week of year, no padding | `34` |
| `Wo` | ISO week of year with ordinal | `34th` |
| `WW` | ISO week of year, 2-digit | `34` |
| `GGGG` | ISO week-year (4-digit) | `2024` |
| `GG` | ISO week-year (2-digit) | `24` |

```javascript
new kk_date('2024-08-23').format('[Week] w [of] gggg'); // 'Week 34 of 2024'
new kk_date('2021-01-01').format('GGGG-[W]WW');         // '2020-W53' (ISO week-year)
new kk_date('2024-12-31').format('w gggg');             // '1 2025'   (week 1 of the next week-year)
```

### Timezone Templates

| Template | Description | Example |
|----------|-------------|---------|
| `Z` | UTC offset with colon | `+03:00` |
| `ZZ` | UTC offset without colon | `+0300` |
| `z` / `zz` | Timezone abbreviation | `EST`, `GMT+3` |
| `zzz` | Long timezone name | `Eastern Standard Time` |

`z`, `zz` and `zzz` come from Intl/ICU data, so the exact spelling can vary by
environment (`GMT+3`-style output is possible for zones without a conventional
abbreviation).

```javascript
kk_date.config({ timezone: 'Europe/Istanbul' });
new kk_date('2024-08-23 10:30:45').format('YYYY-MM-DDTHH:mm:ssZ'); // '2024-08-23T10:30:45+03:00'
new kk_date('2024-08-23 10:30:45').format('ZZ');                   // '+0300'
```

### Unix Timestamp Templates

| Template | Description | Example |
|----------|-------------|---------|
| `X` | Unix timestamp (seconds) | `1724409045` |
| `x` | Unix timestamp (milliseconds) | `1724409045000` |

As whole templates `X` and `x` return **numbers**; inside a larger template they
render as digit strings.

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('X');      // 1724409045 (number)
date.format('[ts] X'); // 'ts 1724409045' (string)
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
| `hh:mm:ss` | 12-hour time with seconds (AM/PM suffix) | `10:30:45 AM` |
| `hh:mm` | 12-hour time without seconds (AM/PM suffix) | `10:30 AM` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('HH:mm:ss'); // '10:30:45'
date.format('HH:mm');    // '10:30'
date.format('hh:mm:ss'); // '10:30:45 AM'
date.format('hh:mm');    // '10:30 AM'
```

### Time with Milliseconds

| Template | Description | Example |
|----------|-------------|---------|
| `HH:mm:ss.SSS` | 24-hour time with milliseconds | `10:30:45.123` |
| `hh:mm:ss.SSS` | 12-hour time with milliseconds (AM/PM suffix) | `10:30:45.123 AM` |

```javascript
const date = new kk_date('2024-08-23 10:30:45.123');

date.format('HH:mm:ss.SSS'); // '10:30:45.123'
date.format('hh:mm:ss.SSS'); // '10:30:45.123 AM'
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
| `YYYY.MM.DD HH:mm:ss` | Dotted datetime format | `2024.08.23 10:30:45` |
| `YYYY.MM.DD HH:mm` | Dotted datetime without seconds | `2024.08.23 10:30` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYY-MM-DD HH:mm:ss'); // '2024-08-23 10:30:45'
date.format('YYYY-MM-DD HH:mm');    // '2024-08-23 10:30'
date.format('DD.MM.YYYY HH:mm:ss'); // '23.08.2024 10:30:45'
date.format('DD.MM.YYYY HH:mm');    // '23.08.2024 10:30'
date.format('DD-MM-YYYY HH:mm:ss'); // '23-08-2024 10:30:45'
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
| `DD MMMM dddd, YYYY` | Date with weekday and comma | `23 August Friday, 2024` |
| `YYYY MMM DD` | Year-month-day format | `2024 Aug 23` |
| `YYYY MMMM DD` | Year-fullmonth-day format | `2024 August 23` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('DD MMMM dddd, YYYY');   // '23 August Friday, 2024'
date.format('YYYY MMM DD');          // '2024 Aug 23'
date.format('YYYY MMMM DD');         // '2024 August 23'
```

### Compact Formats

| Template | Description | Example |
|----------|-------------|---------|
| `YYYY-MM-DD HH:mm` | Compact datetime | `2024-08-23 10:30` |
| `DD.MM.YYYY HH:mm` | European compact | `23.08.2024 10:30` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYY-MM-DD HH:mm'); // '2024-08-23 10:30'
date.format('DD.MM.YYYY HH:mm'); // '23.08.2024 10:30'
```

## Custom Formatting

`format()` compiles the template dynamically: any combination of the supported tokens works, in any
order, with any separators. Templates are compiled once and cached, so custom templates are just as
fast as the predefined ones.

### Supported Tokens

The full moment/dayjs display-token vocabulary is supported (era tokens and the
localized `LT`/`L`/`LL` macros are not).

| Group | Token | Output | Example |
|-------|-------|--------|---------|
| Year | `YYYY` | 4-digit year | `2024` |
| | `YY` | 2-digit year | `24` |
| Month | `MMMM` / `MMM` | Full / short month name (locale-aware) | `August` / `Aug` |
| | `MM` | Month, zero-padded | `08` |
| | `Mo` | Month with ordinal | `8th` |
| | `M` | Month, no padding | `8` |
| Quarter | `Q` / `Qo` | Quarter / with ordinal | `3` / `3rd` |
| Day of month | `DD` | Day, zero-padded | `05` |
| | `Do` | Day with ordinal | `5th` |
| | `D` | Day, no padding | `5` |
| Day of year | `DDDD` | Day of year, 3-digit | `005` |
| | `DDDo` | Day of year with ordinal | `5th` |
| | `DDD` | Day of year, no padding | `5` |
| Weekday | `dddd` / `ddd` / `dd` | Full / short / 2-char weekday name (locale-aware) | `Friday` / `Fri` / `Fr` |
| | `d` / `do` | Day of week (0=Sun..6=Sat) / with ordinal | `5` / `5th` |
| | `e` | Day of week relative to `weekStartDay` | `5` |
| | `E` | ISO day of week (1=Mon..7=Sun) | `5` |
| Week of year | `ww` / `wo` / `w` | Locale week, padded / ordinal / plain | `03` / `3rd` / `3` |
| | `gggg` / `gg` | Locale week-year, 4/2-digit | `2024` / `24` |
| ISO week | `WW` / `Wo` / `W` | ISO week, padded / ordinal / plain | `03` / `3rd` / `3` |
| | `GGGG` / `GG` | ISO week-year, 4/2-digit | `2024` / `24` |
| Hour | `HH` / `H` | Hour (24h), padded / plain | `09` / `9` |
| | `hh` / `h` | Hour (12h), padded / plain | `09` / `9` |
| | `kk` / `k` | Hour (1-24 clock), padded / plain | `09` / `9` |
| Minute | `mm` / `m` | Minute, padded / plain | `07` / `7` |
| Second | `ss` / `s` | Second, padded / plain | `03` / `3` |
| Fractional | `S` / `SS` / `SSS` | Tenths / hundredths / milliseconds | `0` / `04` / `045` |
| | `SSSS`..`SSSSSSSSS` | Milliseconds right-padded with zeros | `045000` |
| Meridiem | `A` / `a` | Meridiem | `PM` / `pm` |
| Timezone | `Z` / `ZZ` | UTC offset, with / without colon | `+03:00` / `+0300` |
| | `z` / `zz` / `zzz` | Abbreviation / abbreviation / long name | `EST` / `EST` / `Eastern Standard Time` |
| Unix | `X` / `x` | Seconds / milliseconds | `1724409045` / `1724409045000` |

```javascript
const date = new kk_date('2024-08-23 10:30:45');

date.format('YYYYMM');              // '202408'
date.format('HHmm');                // '1030'
date.format('YYYY/MM/DD HH:mm');    // '2024/08/23 10:30'
date.format('Do MMMM, YYYY');       // '23rd August, 2024'
date.format('hh:mm A');             // '10:30 AM'
date.format('[Week] w [of] gggg');  // 'Week 34 of 2024'
date.format('GGGG-[W]WW-E');        // '2024-W34-5'
date.format('YYYY-MM-DDTHH:mm:ssZ');// '2024-08-23T10:30:45+00:00' (UTC config)
```

Rules:

- **Literal text** goes in square brackets: `date.format('[Today is] dddd')` → `'Today is Friday'`.
  Unbracketed characters that are not tokens (separators like `-`, `/`, `:`, `T`) pass through as-is.
  With the full token vocabulary nearly every Latin letter is significant
  (`M Q d e E h k m s S w W x X z Z` alone, plus the multi-letter tokens above) —
  **always bracket literal words**: `'[Week] w'`, not `'Week w'`.
- **12-hour behavior:** when a template uses `hh` or `h` without an explicit `A`/`a`, ` AM`/` PM` is
  appended to the end of the output (`'hh:mm'` → `'10:30 AM'`). With an explicit `A`/`a`, the meridiem
  is placed exactly where the token appears. (moment/dayjs do not append — kk-date keeps its legacy
  behavior for backward compatibility.)
- **Week tokens** (`w`, `ww`, `wo`, `gg`, `gggg`, `e`) depend on the configured `weekStartDay`
  (global `kk_date.config({ weekStartDay })` or per-instance `.config({ weekStartDay })`).
  ISO week tokens (`W`, `WW`, `Wo`, `GG`, `GGGG`, `E`) always use the ISO-8601 rules.
- **`dd`** is the first two characters of the Intl short weekday name. It matches moment's "min"
  names for most locales but can differ where CLDR data differs (e.g. Turkish).
- **`z` / `zz` / `zzz`** come from Intl/ICU data; zones without a conventional abbreviation render
  `GMT+3`-style. On engines without long-name support, `zzz` degrades to the abbreviation.
- A template must contain **at least one token**; strings without any token (e.g. `'...'` or
  `'[hello]'`) throw `Error: template is not right`. Note that letter-only words are usually
  *not* token-free: `'hello'` contains `h` and `e` and therefore formats.
- Ordinals (`Do`, `Mo`, `Qo`, `do`, `wo`, `Wo`, `DDDo`) use English suffixes (st/nd/rd/th).
- Dynamic templates apply to **formatting only**. The constructor's `date_format` argument and
  `kk_date.isValid()` still accept only the predefined patterns listed above.

### Breaking change in v5: more letters are tokens

v5 expands the tokenizer to the full moment/dayjs vocabulary. Templates that previously relied on
unbracketed letters passing through literally can change output silently — exactly as they would in
moment/dayjs. Newly significant: `YY M Mo Q Qo DDD DDDo DDDD d dd do e E w wo ww W Wo WW gg gggg
GG GGGG H h k kk m s S..SSSSSSSSS X x z zz zzz Z ZZ`. Letters that remain literal:
`B C F G I J K L N O P R T U V Y b c f g i j l n o p q r t u v y`. Audit your templates and bracket
every literal word (`'[saat] HH:mm'`). Templates made only of letters (e.g. `'hello'`) no longer
throw — they format.

### Migrating from `format_c()` (removed in v5.0.0)

`format_c()` was removed in v5.0.0: dynamic templates cover every use case in a single `format()` call.
Join the old template arguments with the separator; bracket the separator if it could be read
as a token:

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// before: date.format_c(' ', 'YYYY-MM-DD', 'HH:mm:ss')
date.format('YYYY-MM-DD HH:mm:ss');                      // '2024-08-23 10:30:45'

// before: date.format_c('T', 'YYYY-MM-DD', 'HH:mm:ss')
date.format('YYYY-MM-DDTHH:mm:ss');                      // '2024-08-23T10:30:45'

// before: date.format_c('-', 'DD', 'MM', 'YYYY')
date.format('DD-MM-YYYY');                               // '23-08-2024'
```

### Building Strings with Surrounding Text

For labels or sentences, concatenate formatted parts in plain JavaScript:

```javascript
const date = new kk_date('2024-08-23 10:30:45');

`Date: ${date.format('YYYY-MM-DD')}`;        // 'Date: 2024-08-23'
`Time: ${date.format('HH:mm:ss')}`;          // 'Time: 10:30:45'
`Created on ${date.format('DD/MM/YYYY')}`;   // 'Created on 23/08/2024'
```

### Conditional Formatting

Branch in JavaScript, then format the pieces you need:

```javascript
const date = new kk_date('2024-08-23 10:30:45');

// Different greetings for different times
const hour = parseInt(date.format('HH'), 10);
const time = date.format('HH:mm');
let greeting;
if (hour < 12) {
    greeting = `Good morning! It's ${time}`;   // "Good morning! It's 10:30"
} else if (hour < 18) {
    greeting = `Good afternoon! It's ${time}`;
} else {
    greeting = `Good evening! It's ${time}`;
}
console.log(greeting);
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
date.format('dddd, DD MMMM YYYY'); // 'Cuma, 23 Ağustos 2024'
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

// Output (weekday/month names come from Intl; fr/es return them lowercased):
// en: Friday, 23 August 2024
// tr: Cuma, 23 Ağustos 2024
// de: Freitag, 23 August 2024
// fr: vendredi, 23 août 2024
// es: viernes, 23 agosto 2024
```


## Examples

### Common Use Cases

#### 1. File Naming

```javascript
const date = new kk_date('2024-08-23 14:30:45'); // use new kk_date() for the current time

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
// 'at' is arbitrary text, so build the combined string in JS (format() has no token interpolation):
const displayDateTime = `${date.format('dddd, DD MMMM YYYY')} at ${date.format('HH:mm')}`;

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
    timestamp: date.getTime() // input parsed as UTC (see timezone note); system-timezone-dependent
};

console.log(JSON.stringify(apiResponse, null, 2));
// {
//   "id": 123,
//   "title": "Sample Event",
//   "created_at": "2024-08-23T10:30:45",
//   "display_date": "23 August 2024",
//   "display_time": "10:30",
//   "timestamp": 1724409045000
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
const date = new kk_date('2024-08-23 14:30:45.123'); // use new kk_date() for the current time

// Log formats — dynamic templates handle any combination directly
const logTimestamp = date.format('YYYY-MM-DD HH:mm:ss.SSS');
const logDate = date.format('DD/MM/YYYY');
const logTime = date.format('HH:mm:ss');

console.log(`[${logTimestamp}] INFO: Application started`);
// [2024-08-23 14:30:45.123] INFO: Application started

// Filenames work the same way
console.log(`Log file: ${date.format('YYYYMMDD[_]HHmmss')}.log`);
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

The `format()` method **throws** when the template contains no recognizable token at all
(`Error: template is not right`), so wrap untrusted templates in a try/catch. Note that with
the full token vocabulary most letter sequences DO contain tokens (`'hello world'` contains
`h`, `e`, `w`, `do`, …), so only genuinely token-free templates throw:

```javascript
const date = new kk_date('2024-08-23 10:30:45');

try {
    // No tokens in the template -> throws
    const result = date.format('---');
    console.log(result);
} catch (error) {
    console.log('Format error:', error.message); // 'template is not right'
    // Fallback to a supported template
    console.log(date.format('YYYY-MM-DD HH:mm:ss'));
}

// Fully bracketed templates are token-free too and also throw:
// date.format('[hello]') -> Error: template is not right
// Unbracketed words format instead of throwing — bracket literal text:
date.format('[hello] YYYY'); // 'hello 2024'
```
