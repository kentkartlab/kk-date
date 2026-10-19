# Configuration Guide

Complete guide to configuring kk-date, including global settings, instance options, and best practices.

## Table of Contents

- [Introduction](#introduction)
- [Global Configuration](#global-configuration)
- [Instance Configuration](#instance-configuration)
- [Configuration Priority](#configuration-priority)
- [Timezone Configuration](#timezone-configuration)
- [Locale Configuration](#locale-configuration)
- [Week Start Day Configuration](#week-start-day-configuration)
- [Performance Configuration](#performance-configuration)
- [Best Practices](#best-practices)

## Introduction

kk-date provides flexible configuration options at both global and instance levels. This allows you to set default behaviors for your entire application while still having the flexibility to override settings for specific use cases.

> **How to read the examples below:**
> - Outputs assume the **global/process timezone is UTC** (set via `kk_date.setTimezone('UTC')`, or run with `TZ=UTC`).
> - Instance `config({ timezone })` and `.tz()` change only the **display** timezone — they do **not** reinterpret the input string. A naive string is always parsed in the global/system timezone.
> - `.tz()` **mutates** the instance and returns it, so use a **fresh instance per conversion** (do not read the original after calling `.tz()` on it).

### Configuration Levels

1. **Global Configuration**: Affects all new instances
2. **Instance Configuration**: Overrides global settings for specific instances
3. **Default Values**: Fallback when no configuration is provided

## Global Configuration

### Setting Global Timezone

```javascript
const kk_date = require('kk-date');

// Set global default timezone (the most recent call wins)
kk_date.setTimezone('UTC');
kk_date.setTimezone('America/New_York');
kk_date.setTimezone('Europe/London');

// Get current global timezone
const currentTimezone = kk_date.getTimezone();
console.log(currentTimezone); // 'Europe/London' (the last value set)
```

### Setting User Timezone

`setUserTimezone()` stores one value: the default **source** zone of
`kk_date.convertToTimezone(date, targetTimezone, sourceTimezone)` when its third argument is
omitted (it defaults to the system timezone). Nothing else reads it — parsing, `format()`, `.tz()`
and `toLocale*()` are not affected. To display dates in a user's zone, pass the zone to `.tz()` (or
an instance `.config({ timezone })`); to parse naive strings in a zone, use `setTimezone()`.

```javascript
// Set the default source zone of convertToTimezone() (validated: an invalid zone throws)
kk_date.setUserTimezone('America/New_York');

// Get it back
const userTimezone = kk_date.getUserTimezone();
console.log(userTimezone); // 'America/New_York'

// convertToTimezone() shifts a Date by (target offset − source offset) — here Tokyo minus New York, +13 h
const shifted = kk_date.convertToTimezone(new Date('2024-08-23T15:00:00Z'), 'Asia/Tokyo');
console.log(shifted.toISOString()); // '2024-08-24T04:00:00.000Z'

// format() is unaffected by the user timezone (global timezone UTC here)
console.log(new kk_date('2024-08-23 15:00:00').format('HH:mm')); // '15:00'
```

### Setting Global Locale

```javascript
// Set global locale
kk_date.config({ locale: 'en' });
kk_date.config({ locale: 'tr' });
kk_date.config({ locale: 'de' });

// Note: Direct access to global_config is not available
// Use specific methods to check current configuration
```

### Setting Week Start Day

```javascript
// Set week start day: any integer 0-6 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
kk_date.config({ weekStartDay: 0 }); // Sunday (default)
kk_date.config({ weekStartDay: 1 }); // Monday
kk_date.config({ weekStartDay: 6 }); // Saturday

// Out-of-range or non-integer numbers throw ('weekStartDay must be between 0 and 6',
// 'weekStartDay must be an integer'); non-number values are ignored.

// Note: Direct access to global_config is not available
// Use configuration methods to check current settings
```

### Complete Global Configuration Example

```javascript
const kk_date = require('kk-date');

// Configure global settings
kk_date.setTimezone('UTC');
kk_date.config({ locale: 'en', weekStartDay: 1 }); // Monday

// All new instances will use these settings
const date1 = new kk_date('2024-08-23 10:00:00');
const date2 = new kk_date('2024-08-23 15:00:00');

console.log(date1.format('HH:mm')); // '10:00' (UTC)
console.log(date2.format('HH:mm')); // '15:00' (UTC)
```

### Validation and Atomic Updates

`kk_date.config()` validates every option (`locale`, `timezone`, `weekStartDay`) before applying
any of them. If one is invalid the call throws, and the global configuration — and every cached
format — stays exactly as it was. Instance `.config()` works the same way.

```javascript
kk_date.config({ locale: 'en', timezone: 'UTC' });

try {
    kk_date.config({ locale: 'de', timezone: 'Invalid/Zone' }); // valid locale, invalid timezone
} catch (error) {
    console.log(error.message); // 'Invalid timezone: Invalid/Zone'
}

console.log(kk_date.getTimezone());                              // 'UTC'
console.log(new kk_date('2024-08-23 10:00:00').format('MMMM')); // 'August' (the locale was not applied either)
```

## Instance Configuration

### Instance Configuration

You can configure individual instances after creation using the `config()` method:

```javascript
const date = new kk_date('2024-08-23 10:00:00');
date.config({
    timezone: 'America/New_York',
    locale: 'tr',
    weekStartDay: 0
});
```

### Available Instance Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `timezone` | string | IANA timezone identifier | Global timezone |
| `locale` | string | Locale for formatting | Global locale |
| `weekStartDay` | number | Week start day: integer 0-6 (0 = Sunday, 1 = Monday, …, 6 = Saturday) | Global week start day |

### Instance Configuration Examples

#### Timezone Configuration

```javascript
// Create instance, then display it in a specific timezone (global timezone = UTC)
const nyDate = new kk_date('2024-08-23 10:00:00');
nyDate.config({ timezone: 'America/New_York' });

// config({ timezone }) only changes the DISPLAY zone; the 10:00 input (parsed as UTC) shows as NY local:
console.log(nyDate.format('HH:mm')); // '06:00'
```

#### Locale Configuration

```javascript
// Create instance with Turkish locale
const trDate = new kk_date('2024-08-23 10:00:00');
trDate.config({ locale: 'tr' });

console.log(trDate.format('DD MMMM YYYY')); // '23 Ağustos 2024'
```

#### Multiple Options

```javascript
// Create instance with multiple options
const customDate = new kk_date('2024-08-23 10:00:00');
customDate.config({
    timezone: 'Europe/London',
    locale: 'de',
    weekStartDay: 1
});

console.log(customDate.format('dddd, DD MMMM YYYY')); // 'Freitag, 23 August 2024'
```

## Configuration Priority

Configuration options follow a specific priority order:

1. **Instance Configuration** (highest priority)
2. **Global Configuration**
3. **Default Values** (lowest priority)

### Priority Examples

```javascript
// Global: UTC
kk_date.setTimezone('UTC');

// Instance: display in New York (overrides the global display zone)
const nyDate = new kk_date('2024-08-23 10:00:00');
nyDate.config({ timezone: 'America/New_York' });

// Result: 10:00 UTC displayed in New York
console.log(nyDate.format('HH:mm')); // '06:00' (NY display)

// Instance: No timezone specified (uses global)
const utcDate = new kk_date('2024-08-23 10:00:00');

// Result: Uses UTC timezone (global setting)
console.log(utcDate.format('HH:mm')); // '10:00' (UTC time)
```

### Checking Configuration

You can check the current configuration at any time:

```javascript
// Check global configuration
console.log('Global timezone:', kk_date.getTimezone());
console.log('User timezone:', kk_date.getUserTimezone()); // convertToTimezone()'s default source zone only
// Note: Direct access to locale and weekStartDay is not available

// Check instance configuration
const date = new kk_date('2024-08-23 10:00:00');
date.config({ timezone: 'America/New_York' });

console.log('Instance timezone:', date.temp_config.timezone);
```

## Timezone Configuration

### Setting Default Timezone

```javascript
// Set application default timezone
kk_date.setTimezone('UTC');

// All new dates will use UTC unless overridden
const date1 = new kk_date('2024-08-23 10:00:00');
const date2 = new kk_date('2024-08-23 15:00:00');

console.log(date1.format('HH:mm')); // '10:00' (UTC)
console.log(date2.format('HH:mm')); // '15:00' (UTC)
```

### User Timezone Preferences

Keep each user's timezone in your own user/session state and pass it to `.tz()` — the global
setters are process-wide, and `setUserTimezone()` does not affect display (see
[Setting User Timezone](#setting-user-timezone)).

```javascript
kk_date.setTimezone('UTC'); // server works in UTC

// The user's preference, e.g. loaded from their profile
const userTimezone = 'America/New_York';

// Convert a fresh instance to the user's timezone for display
const userTime = new kk_date('2024-08-23 15:00:00').tz(userTimezone);
console.log('Time for user:', userTime.format('HH:mm')); // '11:00'
```

### Timezone Validation

The library validates timezone identifiers:

```javascript
try {
    kk_date.setTimezone('Invalid/Timezone');
} catch (error) {
    console.log('Invalid timezone:', error.message);
    // Fallback to UTC
    kk_date.setTimezone('UTC');
}
```

### Common Timezone Scenarios

#### 1. Server Application

```javascript
// Server always uses UTC
kk_date.setTimezone('UTC');

// Convert to user timezone for display.
// Use a fresh instance for the conversion — .tz() mutates the instance it is called on.
const serverTime = new kk_date('2024-08-23 15:00:00');
const userTimezone = 'America/New_York';
const userTime = new kk_date('2024-08-23 15:00:00').tz(userTimezone);

console.log('Server time:', serverTime.format('HH:mm')); // '15:00'
console.log('User time:', userTime.format('HH:mm'));     // '11:00'
```

#### 2. Client-Side Application

```javascript
// In the browser the system timezone already is the user's timezone, and it is the default
// global timezone: with no configuration, naive strings are parsed and displayed in it.
const localTime = new kk_date('2024-08-23 10:00:00');
console.log(localTime.format('HH:mm')); // '10:00' (user's local time)

// To make the choice explicit (or to use a zone from the user's settings instead):
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
kk_date.setTimezone(userTimezone); // drives parsing AND display — setUserTimezone() would not
```

#### 3. Multi-Tenant Application

```javascript
// Different timezones for different tenants
const tenantConfigs = {
    'tenant1': { timezone: 'America/New_York' },
    'tenant2': { timezone: 'Europe/London' },
    'tenant3': { timezone: 'Asia/Tokyo' }
};

function createTenantDate(dateString, tenantId) {
    const config = tenantConfigs[tenantId];
    const date = new kk_date(dateString);
    date.config({timezone: config.timezone});
    return date;
}

const tenant1Date = createTenantDate('2024-08-23 10:00:00', 'tenant1');
const tenant2Date = createTenantDate('2024-08-23 10:00:00', 'tenant2');

// 10:00 UTC displayed in each tenant's timezone (config({ timezone }) is display-only):
console.log(tenant1Date.format('HH:mm')); // '06:00' (New York)
console.log(tenant2Date.format('HH:mm')); // '11:00' (London)
```

## Locale Configuration

### Setting Default Locale

```javascript
// Set application default locale
kk_date.config({ locale: 'en' });

// All new dates will use English formatting
const date = new kk_date('2024-08-23 10:00:00');
console.log(date.format('DD MMMM YYYY')); // '23 August 2024'
```

### Instance-Specific Locale

```javascript
// Create instance with specific locale
const trDate = new kk_date('2024-08-23 10:00:00');
trDate.config({locale: 'tr'});

console.log(trDate.format('DD MMMM YYYY')); // '23 Ağustos 2024'
```

### Locale Examples

```javascript
const date = new kk_date('2024-08-23 10:00:00');

// Different locales
const locales = ['en', 'tr', 'de', 'fr', 'es'];

locales.forEach(locale => {
    kk_date.config({ locale: locale });
    console.log(`${locale}: ${date.format('dddd, DD MMMM YYYY')}`);
});

// Output (fr/es weekday & month names are lowercased by Intl):
// en: Friday, 23 August 2024
// tr: Cuma, 23 Ağustos 2024
// de: Freitag, 23 August 2024
// fr: vendredi, 23 août 2024
// es: viernes, 23 agosto 2024
```

### Supported Locales

`locale` accepts any BCP 47 language tag the runtime's `Intl` supports (`'en'`, `'tr'`, `'de'`,
`'pt-BR'`, `'zh-Hans'`, …): month and weekday names (`MMMM`, `MMM`, `dddd`, `ddd`, `dd`) come from
`Intl.DateTimeFormat`. A tag that `Intl` rejects throws (and, `config()` being atomic, changes
nothing). Commonly used:

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

When parsing text dates (`'15 Ocak 2024'`), month and weekday names are recognized in many
languages; if the same word names different months in different languages, the configured
locale's language wins — `'15 listopad 2024'` is November 15 by default (Polish/Czech) and
October 15 after `kk_date.config({ locale: 'hr' })` (Croatian).

### Locale and Timezone of `toLocaleDateString()` / `toLocaleString()` / `toLocaleTimeString()`

These methods call the native `Date` methods with a locale and a `timeZone` chosen by kk-date:

- **Locale**: the instance locale (`.config({ locale })`), else the global locale **once**
  `kk_date.config({ locale })` has been called (from then on, for the rest of the process), else
  the runtime's default locale.
- **Timezone**: the instance timezone (`.tz()` / `.config({ timezone })`), else the global
  timezone — unless you pass `options.timeZone`, which always wins.

```javascript
kk_date.setTimezone('UTC');

// Before any config({ locale }) call: the runtime's default locale
new kk_date('2024-08-23 10:00:00').toLocaleDateString(); // '8/23/2024' with an en-US runtime

kk_date.config({ locale: 'tr' });
new kk_date('2024-08-23 10:00:00').toLocaleDateString();                          // '23.08.2024' (global locale)
new kk_date('2024-08-23 10:00:00').config({ locale: 'de' }).toLocaleDateString(); // '23.8.2024' (instance locale wins)

// Timezone: the instance/global zone, unless options.timeZone is given
new kk_date('2024-08-23 10:00:00').tz('America/New_York').toLocaleTimeString();                          // '06:00:00'
new kk_date('2024-08-23 10:00:00').tz('America/New_York').toLocaleTimeString({ timeZone: 'Asia/Tokyo' }); // '19:00:00'
```

## Week Start Day Configuration

### Setting Week Start Day

```javascript
// Set week to start on Monday (1)
kk_date.config({ weekStartDay: 1 });

// Set week to start on Sunday (0)
kk_date.config({ weekStartDay: 0 });

// Any integer 0-6 is valid, e.g. Saturday (6)
kk_date.config({ weekStartDay: 6 });
```

### Week Start Day Examples

```javascript
// Use a fresh instance for each call — startOf() mutates the instance it is called on.

// Week starts on Sunday (default)
kk_date.config({ weekStartDay: 0 });
console.log(new kk_date('2024-08-23 10:00:00').startOf('weeks').format('YYYY-MM-DD')); // '2024-08-18' (Sunday)

// Week starts on Monday
kk_date.config({ weekStartDay: 1 });
console.log(new kk_date('2024-08-23 10:00:00').startOf('weeks').format('YYYY-MM-DD')); // '2024-08-19' (Monday)
```

### Instance-Specific Week Start Day

```javascript
// Create instance with specific week start day
const mondayWeek = new kk_date('2024-08-23 10:00:00');
mondayWeek.config({ weekStartDay: 1 });

console.log(mondayWeek.startOf('weeks').format('YYYY-MM-DD')); // '2024-08-19' (Monday)
```

## Performance Configuration

### Caching Configuration

Timezone offsets, compiled format templates and format results are cached automatically — there is
nothing to configure. `kk_date.caching()` controls an additional, opt-in layer that memoizes
constructor parses of repeated input strings and locale name tokens:

```javascript
// Enable the opt-in layer; defaultTtl is in seconds (default 1300)
kk_date.caching({ status: true, defaultTtl: 3600 });

// Statistics of the opt-in layer: hit rate = totalHits / (totalHits + totalMisses)
const stats = kk_date.caching_status();
console.log(stats.status, stats.totalHits, stats.totalMisses, stats.cacheSize, stats.maxCacheSize);

// Empty the opt-in layer (hit/miss counters are kept)
kk_date.caching_flush();

// Disable it again (this also resets the counters)
kk_date.caching({ status: false });
```

Each new conversion should use a fresh instance — `.tz()` mutates the instance it is called on
and returns it, so `const a = date.tz('America/New_York'); const b = date.tz('Asia/Tokyo');`
leaves `a` and `b` pointing to the same object (displayed in Tokyo).

### Memory Management

No manual cleanup is required: every cache is bounded. The internal caches (format results,
date components and timezone offsets: 10,000 entries; compiled templates: 1,000; `Intl` formatter
caches keyed by timezone/locale: 500 each) are cleared wholesale when they reach their limit, and
the opt-in layer expires entries after `defaultTtl` and evicts the least recently used 20% once it
holds more than 10,000 entries.

## Best Practices

### 1. Set Global Defaults Early

```javascript
// Set global configuration at application startup
const kk_date = require('kk-date');

// Configure defaults
kk_date.setTimezone('UTC');
kk_date.config({ locale: 'en', weekStartDay: 1 });

// All subsequent instances will use these defaults
```

### 2. Use Instance Configuration for Overrides

```javascript
// Use global defaults for most cases
const defaultDate = new kk_date('2024-08-23 10:00:00');

// Override only when needed
const customDate = new kk_date('2024-08-23 10:00:00');
customDate.config({ 
    timezone: 'America/New_York',
    locale: 'tr'
});
```

### 3. Validate Configuration

```javascript
// Validate timezone before setting
function setValidTimezone(timezone) {
    try {
        kk_date.setTimezone(timezone);
        return true;
    } catch (error) {
        console.log('Invalid timezone:', error.message);
        return false;
    }
}

// Usage
if (!setValidTimezone('Invalid/Timezone')) {
    kk_date.setTimezone('UTC'); // Fallback
}
```

### 4. Store Configuration in Environment Variables

```javascript
// Load configuration from environment
const config = {
    timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
    locale: process.env.DEFAULT_LOCALE || 'en',
    weekStartDay: parseInt(process.env.WEEK_START_DAY, 10) || 0
};

// Apply configuration
kk_date.setTimezone(config.timezone);
kk_date.config({ locale: config.locale, weekStartDay: config.weekStartDay });
```

### 5. Handle User Preferences

```javascript
// Store user preferences
const userPreferences = {
    timezone: 'America/New_York',
    locale: 'tr',
    weekStartDay: 1
};

// Apply user preferences per instance (instance config is display-only: the input string is
// still parsed in the global timezone)
const userDate = new kk_date('2024-08-23 10:00:00');
userDate.config({
    timezone: userPreferences.timezone,
    locale: userPreferences.locale,
    weekStartDay: userPreferences.weekStartDay
});

console.log(userDate.format('dddd HH:mm'));                           // 'Cuma 06:00' (global timezone UTC)
console.log(userDate.startOf('weeks').format('YYYY-MM-DD dddd'));     // '2024-08-19 Pazartesi' (Monday)
```

### 6. Configuration Validation

```javascript
// config() validates every option before applying any of them, so a rejected
// configuration leaves the previous one untouched — no partial state to clean up
function applyConfiguration(options) {
    try {
        kk_date.config(options);
        return [];
    } catch (error) {
        return [error.message];
    }
}

// Usage
const errors = applyConfiguration({ timezone: 'Europe/Berlin', locale: 'de', weekStartDay: 9 });
if (errors.length > 0) {
    console.log('Configuration errors:', errors); // [ 'weekStartDay must be between 0 and 6' ]
    // Nothing was applied (not even the valid locale and timezone); fall back explicitly
    kk_date.config({ timezone: 'UTC', locale: 'en', weekStartDay: 0 });
}

// A timezone alone can be checked without applying it:
kk_date.checkTimezone('Europe/Berlin'); // true (throws 'Invalid timezone: ...' for an invalid zone)
```

### 7. Configuration Documentation

```javascript
// Document your configuration
const configuration = {
    timezone: {
        global: 'UTC',
        description: 'Server parses and stores in UTC; each response is displayed with .tz(<user timezone>)'
    },
    locale: {
        global: 'en',
        description: 'Default locale for the application'
    },
    weekStartDay: {
        global: 1,
        description: 'Week starts on Monday (1) instead of Sunday (0)'
    }
};

console.log('Current configuration:', configuration);
```

## Troubleshooting

### Common Configuration Issues

#### 1. Timezone Not Applied

**Problem**: Timezone configuration not taking effect.

**Solution**: Check configuration priority and ensure proper setup.

```javascript
// Check current configuration
console.log('Global timezone:', kk_date.getTimezone()); // parsing of naive strings + default display zone
// (getUserTimezone() is only the default source zone of convertToTimezone() — it never affects display)

// Verify instance configuration (set by .tz() / .config({ timezone }); display only)
const date = new kk_date('2024-08-23 10:00:00');
console.log('Instance timezone:', date.temp_config.timezone); // undefined until set on the instance
```

#### 2. Locale Not Working

**Problem**: Locale changes not reflected in formatting.

**Solution**: Ensure locale is supported and properly set.

```javascript
// Note: Direct locale access is not available
// Locale can only be checked through formatting operations

// Test locale formatting
const date = new kk_date('2024-08-23 10:00:00');
console.log(date.format('DD MMMM YYYY'));
```

#### 3. Week Start Day Issues

**Problem**: Week calculations not working as expected.

**Solution**: Verify week start day configuration.

```javascript
// Note: Direct week start day access is not available
// Week start day can only be checked through startOf operations

// Test week calculations
const date = new kk_date('2024-08-23 10:00:00');
console.log('Start of week:', date.startOf('weeks').format('YYYY-MM-DD'));
```

### Configuration Reset

```javascript
// Reset to the library defaults: system timezone, locale 'en', weekStartDay 0
function resetConfiguration() {
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    kk_date.config({ timezone: systemTimezone, locale: 'en', weekStartDay: 0 });
    kk_date.setUserTimezone(systemTimezone);
}

// Usage
resetConfiguration();
console.log('Configuration reset to defaults');
// Note: once config({ locale }) has been called, toLocale*() keep using the global locale
// ('en' here) instead of the runtime default for the rest of the process.
```
