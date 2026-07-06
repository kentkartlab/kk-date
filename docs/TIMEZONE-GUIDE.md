# Timezone Guide

Comprehensive guide to timezone handling in kk-date, including DST support, conversion examples, and best practices.

## Table of Contents

- [Introduction](#introduction)
- [Basic Timezone Operations](#basic-timezone-operations)
- [DST (Daylight Saving Time)](#dst-daylight-saving-time)
- [Timezone Conversion Examples](#timezone-conversion-examples)
- [Global vs Instance Configuration](#global-vs-instance-configuration)
- [Common Timezone Scenarios](#common-timezone-scenarios)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Introduction

kk-date provides comprehensive timezone support using the IANA timezone database. This ensures accurate timezone conversions, automatic DST handling, and cross-platform consistency.

> **How to read the examples in this guide:**
> - A **naive** string like `'2024-08-23 10:00:00'` is parsed in the **global/process timezone**. Examples that use naive inputs assume that timezone is **UTC** (`kk_date.setTimezone('UTC')` or `TZ=UTC`).
> - `.tz()` and instance `config({ timezone })` change only the **display** timezone — they do **not** reinterpret the input string. To represent a specific zone's wall-clock time unambiguously, pass an **absolute instant** (ISO-8601 with `Z`/offset). Many examples below do exactly that (e.g. 2 PM New York = `2024-08-23T18:00:00.000Z`).
> - `.tz()` **mutates** the instance and returns it — use a **fresh instance per conversion**.

### Key Features

- **IANA Timezone Support**: Full support for all IANA timezone identifiers
- **Automatic DST Detection**: Handles Daylight Saving Time transitions automatically
- **Cross-Platform Consistency**: Works identically in browsers and Node.js
- **Performance Optimized**: Intelligent caching for timezone calculations
- **Error Handling**: Descriptive errors for invalid timezones

## Basic Timezone Operations

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

### Converting Between Timezones

```javascript
// Each timezone conversion should use a separate instance
const nyTime = new kk_date('2024-08-23 10:00:00').tz('America/New_York');
const tokyoTime = new kk_date('2024-08-23 10:00:00').tz('Asia/Tokyo');
const londonTime = new kk_date('2024-08-23 10:00:00').tz('Europe/London');

console.log(nyTime.format('HH:mm'));     // '06:00' (EDT)
console.log(tokyoTime.format('HH:mm'));  // '19:00' (JST)
console.log(londonTime.format('HH:mm')); // '11:00' (BST)
```

### Instance-Specific Timezone

```javascript
// Create a date, then display it in a specific timezone (global timezone = UTC)
const date = new kk_date('2024-08-23 10:00:00');
date.config({timezone: 'America/New_York'});

// config({ timezone }) only changes the DISPLAY zone; 10:00 UTC shown as New York local time:
console.log(date.format('HH:mm')); // '06:00'
```

## DST (Daylight Saving Time)

### Automatic DST Handling

kk-date automatically handles DST transitions without any additional configuration:

```javascript
// DST is handled automatically. Absolute instants (…Z) show the transition unambiguously.

// New York springs forward at 07:00 UTC on 2024-03-10 (02:00 EST -> 03:00 EDT)
console.log(new kk_date('2024-03-10T06:59:00.000Z').tz('America/New_York').format('HH:mm')); // '01:59' (EST)
console.log(new kk_date('2024-03-10T07:00:00.000Z').tz('America/New_York').format('HH:mm')); // '03:00' (EDT)

// New York falls back at 06:00 UTC on 2024-11-03 (02:00 EDT -> 01:00 EST)
console.log(new kk_date('2024-11-03T05:59:00.000Z').tz('America/New_York').format('HH:mm')); // '01:59' (EDT)
console.log(new kk_date('2024-11-03T06:00:00.000Z').tz('America/New_York').format('HH:mm')); // '01:00' (EST)
```

### Checking DST Status

```javascript
const date = new kk_date('2024-08-23 10:00:00');

// Check if date is in DST
const isDST = date.isDST('America/New_York');
console.log(isDST); // true (EDT)

// Get DST information
const info = date.getTimezoneInfo('America/New_York');
console.log(info.isDST);        // true
console.log(info.abbreviation); // 'EDT'
```

### DST Transition Dates

```javascript
// 2024 US spring-forward boundary (transition is at 07:00 UTC on 2024-03-10)

const beforeSpring = new kk_date('2024-03-10T06:00:00.000Z'); // one hour before the transition
const afterSpring  = new kk_date('2024-03-10T08:00:00.000Z'); // one hour after the transition

console.log(beforeSpring.tz('America/New_York').format('HH:mm')); // '01:00' (EST)
console.log(afterSpring.tz('America/New_York').format('HH:mm'));  // '04:00' (EDT)
```

## Timezone Conversion Examples

### Real-World Scenarios

#### 1. International Meeting Scheduling

```javascript
// Schedule a meeting at 2 PM New York time. 2 PM EDT is 18:00 UTC — express it as an absolute instant
// so every conversion is unambiguous (a fresh instance per .tz() call).
const meetingInstant = '2024-08-23T18:00:00.000Z';

const nyTime = new kk_date(meetingInstant).tz('America/New_York');
const londonTime = new kk_date(meetingInstant).tz('Europe/London');
const tokyoTime = new kk_date(meetingInstant).tz('Asia/Tokyo');
const sydneyTime = new kk_date(meetingInstant).tz('Australia/Sydney');

console.log('Meeting times:');
console.log('New York:', nyTime.format('HH:mm'));          // 14:00
console.log('London:', londonTime.format('HH:mm'));        // 19:00
console.log('Tokyo:', tokyoTime.format('HH:mm'));          // 03:00 (next day)
console.log('Sydney:', sydneyTime.format('HH:mm'));        // 04:00 (next day)
```

#### 2. Flight Departure Times

```javascript
// Flight departs 10:30 in Istanbul (UTC+3 -> 07:30 UTC) and arrives 14:15 in New York (EDT -> 18:15 UTC).
// Express each local time as its absolute UTC instant.
const departureUTC = new kk_date('2024-08-23T07:30:00.000Z').tz('UTC');
const arrivalUTC   = new kk_date('2024-08-23T18:15:00.000Z').tz('UTC');

console.log('Flight times (UTC):');
console.log('Departure:', departureUTC.format('HH:mm')); // 07:30
console.log('Arrival:', arrivalUTC.format('HH:mm'));     // 18:15
```

#### 3. E-commerce Order Processing

```javascript
// Order placed at 3:45 PM in Los Angeles (PDT -> 22:45 UTC). Use the absolute instant.
const orderInstant = '2024-08-23T22:45:00.000Z';

// Convert to warehouse timezone (Chicago)
const warehouseTime = new kk_date(orderInstant).tz('America/Chicago');
console.log('Order received at warehouse:', warehouseTime.format('HH:mm')); // 17:45

// Convert to customer support timezone (India)
const supportTime = new kk_date(orderInstant).tz('Asia/Kolkata');
console.log('Order time for support:', supportTime.format('YYYY-MM-DD HH:mm')); // 2024-08-24 04:15 (next day)
```

### Cross-Day Conversions

```javascript
// Late night in Los Angeles (23:30 PDT on 2024-08-23 -> 06:30 UTC on 2024-08-24)
const tokyoTime = new kk_date('2024-08-24T06:30:00.000Z').tz('Asia/Tokyo');
console.log(tokyoTime.format('YYYY-MM-DD HH:mm')); // 2024-08-24 15:30

// Early morning in Tokyo (06:00 on 2024-08-24 JST -> 21:00 UTC on 2024-08-23)
const laTime = new kk_date('2024-08-23T21:00:00.000Z').tz('America/Los_Angeles');
console.log(laTime.format('YYYY-MM-DD HH:mm')); // 2024-08-23 14:00
```

## Global vs Instance Configuration

### Global Configuration

Global configuration affects all new instances:

```javascript
// Set global timezone
kk_date.setTimezone('UTC');

// All new instances will use UTC
const date1 = new kk_date('2024-08-23 10:00:00');
const date2 = new kk_date('2024-08-23 15:00:00');

console.log(date1.format('HH:mm')); // '10:00' (UTC)
console.log(date2.format('HH:mm')); // '15:00' (UTC)
```

### Instance Configuration

Instance configuration overrides global settings:

```javascript
// Global timezone is UTC
kk_date.setTimezone('UTC');

// Instance with specific DISPLAY timezone
const nyDate = new kk_date('2024-08-23 10:00:00');
nyDate.config({timezone: 'America/New_York'});

// 10:00 UTC displayed in New York (config({ timezone }) sets the display zone, not the input zone):
console.log(nyDate.format('HH:mm')); // '06:00'
```

### Configuration Priority

1. **Instance configuration** (highest priority)
2. **Global configuration**
3. **Default values** (lowest priority)

```javascript
// Global: UTC
kk_date.setTimezone('UTC');

// Instance: display in New York
const date = new kk_date('2024-08-23 10:00:00');
date.config({timezone: 'America/New_York'});

// Result: 10:00 UTC displayed in New York (instance display zone overrides global)
console.log(date.format('HH:mm')); // '06:00'
```

## Common Timezone Scenarios

### 1. User Preferences

```javascript
// Store user's preferred timezone
kk_date.setUserTimezone('America/New_York');
kk_date.setTimezone('UTC'); // server works in UTC

// Convert a fresh instance to the user's timezone for display
const userTime = new kk_date('2024-08-23 15:00:00').tz(kk_date.getUserTimezone());
console.log('Time for user:', userTime.format('HH:mm')); // '11:00'
```

### 2. Database Storage

```javascript
// Always store in UTC. To interpret user input as a specific zone's wall-clock time, build the
// absolute instant for that zone. 14:30 in America/Chicago (CDT, UTC-5) is 19:30 UTC.
const utcDate = new kk_date('2024-08-23T19:30:00.000Z');
console.log('Store in database:', utcDate.toISOString()); // '2024-08-23T19:30:00.000Z'
```

### 3. API Responses

```javascript
// Server time as an absolute UTC instant
const serverTime = new kk_date('2024-08-23T15:00:00.000Z');

// Convert to client's timezone for the API response (fresh instance for the conversion)
const clientTimezone = 'Europe/London';
const clientTime = new kk_date('2024-08-23T15:00:00.000Z').tz(clientTimezone);

const apiResponse = {
    serverTime: serverTime.toISOString(),               // '2024-08-23T15:00:00.000Z'
    clientTime: clientTime.format('YYYY-MM-DD HH:mm:ss'), // '2024-08-23 16:00:00' (BST)
    timezone: clientTimezone
};
```

### 4. Calendar Applications

```javascript
// Event at 2 PM in the organizer's timezone (New York, EDT) = 18:00 UTC
const eventInstant = '2024-08-23T18:00:00.000Z';

// Convert for different attendees (a fresh instance per conversion)
const attendees = [
    { name: 'John', timezone: 'Europe/London' },
    { name: 'Sarah', timezone: 'Asia/Tokyo' },
    { name: 'Mike', timezone: 'Australia/Sydney' }
];

attendees.forEach(attendee => {
    const localTime = new kk_date(eventInstant).tz(attendee.timezone);
    console.log(`${attendee.name}: ${localTime.format('HH:mm')}`);
});
// John: 19:00
// Sarah: 03:00 (next day)
// Mike: 04:00 (next day)
```

## Best Practices

### 1. Always Store in UTC

```javascript
// ✅ Store an absolute UTC instant. 2 PM New York (EDT) is 18:00 UTC.
const utcTime = new kk_date('2024-08-23T18:00:00.000Z');
console.log(utcTime.toISOString()); // '2024-08-23T18:00:00.000Z'
```

### 2. Convert for Display Only

```javascript
// Store in UTC
const utcDate = new kk_date('2024-08-23T18:00:00.000Z');

// Convert for display
const displayDate = utcDate.tz('America/New_York');
console.log(displayDate.format('HH:mm')); // '14:00'
```

### 3. Handle Invalid Timezones

```javascript
try {
    const date = new kk_date('2024-08-23 10:00:00');
    const converted = date.tz('Invalid/Timezone');
} catch (error) {
    console.log('Invalid timezone:', error.message);
    // Fallback to UTC
    const fallback = date.tz('UTC');
}
```

### 4. Use IANA Timezone Identifiers

```javascript
// ❌ Don't use abbreviations
date.tz('EST');  // Ambiguous
date.tz('PST');  // Ambiguous

// ✅ Use IANA identifiers
date.tz('America/New_York');  // Clear and unambiguous
date.tz('America/Los_Angeles'); // Clear and unambiguous
```

### 5. Consider DST Transitions

```javascript
// Be careful with DST transition times
const dstTransition = new kk_date('2024-03-10 02:30:00');
dstTransition.config({timezone: 'America/New_York'});

// This time doesn't exist during spring forward
console.log(dstTransition.format('HH:mm')); // May show unexpected result
```

## Troubleshooting

### Common Issues

#### 1. Unexpected Timezone Conversions

**Problem**: Timezone conversion returns unexpected results.

**Solution**: Check if you're using the correct IANA timezone identifier.

```javascript
// ❌ Wrong
date.tz('EST');

// ✅ Correct
date.tz('America/New_York');
```

#### 2. DST Issues

**Problem**: DST transitions causing confusion.

**Solution**: Use specific timezone identifiers and test DST transitions.

```javascript
// Test DST transitions
const springForward = new kk_date('2024-03-10 02:00:00');
const fallBack = new kk_date('2024-11-03 02:00:00');

console.log(springForward.tz('America/New_York').format('HH:mm'));
console.log(fallBack.tz('America/New_York').format('HH:mm'));
```

#### 3. Cross-Platform Differences

**Problem**: Different results in browser vs Node.js.

**Solution**: Ensure you're using the same timezone database.

```javascript
// Check available timezones
const timezones = kk_date.getAvailableTimezones();
console.log('Available timezones:', timezones.length);
```

#### 4. Performance Issues

**Problem**: Slow timezone conversions.

**Solution**: The library caches timezone calculations automatically.

```javascript
// First conversion may be slower
const first = date.tz('America/New_York');

// Subsequent conversions are faster
const second = date.tz('America/New_York');
const third = date.tz('America/New_York');
```

### Debugging Tips

#### 1. Check Timezone Information

```javascript
const date = new kk_date('2024-08-23 10:00:00');
const info = date.getTimezoneInfo('America/New_York');

console.log('Timezone info:', {
    timezone: info.timezone,
    offset: info.offset / (60 * 60 * 1000) + ' hours',
    isDST: info.isDST,
    abbreviation: info.abbreviation
});
```

#### 2. Verify UTC Base

```javascript
const date = new kk_date('2024-08-23 10:00:00');
console.log('UTC time:', date.tz('UTC').format('HH:mm'));
console.log('Local time:', date.format('HH:mm'));
```

#### 3. Test Edge Cases

```javascript
// Test DST transitions
const dstDates = [
    '2024-03-10 02:00:00', // Spring forward
    '2024-11-03 02:00:00', // Fall back
    '2024-08-23 10:00:00'  // Regular day
];

dstDates.forEach(dateStr => {
    const date = new kk_date(dateStr);
    const nyTime = date.tz('America/New_York');
    console.log(`${dateStr} → ${nyTime.format('HH:mm')}`);
});
```

### Error Messages

Common error messages and their solutions:

- **"Invalid timezone: [timezone]"**: Use a valid IANA timezone identifier
- **"Could not determine timezone offset"**: The timezone may not be supported in your environment
- **"Invalid Date"**: Check your date input format

### Getting Help

If you encounter issues:

1. Check the [API Reference](../docs/API-REFERENCE.md)
2. Review the [Configuration Guide](../docs/CONFIGURATION-GUIDE.md)
3. Test with known timezone conversions
4. Verify your environment supports the required timezone
5. Check for DST transition edge cases
