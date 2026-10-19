# Advanced Usage Guide

Advanced features, performance tips, and best practices for kk-date.

## Table of Contents

- [Performance Optimization](#performance-optimization)
- [Memory Management](#memory-management)
- [Error Handling](#error-handling)
- [Custom Extensions](#custom-extensions)
- [Integration Patterns](#integration-patterns)
- [Testing Strategies](#testing-strategies)
- [Migration Guide](#migration-guide)

## Performance Optimization

### Caching Strategies

kk-date always caches compiled format templates, format results, date-component extraction and
timezone offsets. `kk_date.caching({ status: true })` adds an opt-in layer (nope-redis) that
memoizes constructor parses of repeated input strings and locale name tokens (`dddd`, `MMMM`, …).
For the measured effect, see the auto-generated numbers in the README's
[Cache Performance Impact](../README.md#cache-performance-impact) section and the
[Key Performance Metrics](PERFORMANCE.md#key-performance-metrics) in the Performance Guide —
they are refreshed from real benchmark runs; results vary by workload.

```javascript
const kk_date = require('kk-date');

// Enable the opt-in cache layer
kk_date.caching({ status: true, defaultTtl: 3600 });

new kk_date('2024-08-23 10:00:00'); // parsed, result stored (miss)
new kk_date('2024-08-23 10:00:00'); // served from the cache (hit)

// Monitor cache performance: hit rate = hits / (hits + misses)
const stats = kk_date.caching_status();
const lookups = stats.totalHits + stats.totalMisses;
const hitRate = lookups > 0 ? ((stats.totalHits / lookups) * 100).toFixed(1) : '0.0';
console.log('Cache hit rate:', hitRate + '%'); // '50.0%' here: 1 hit, 1 miss
```

**Performance Gains with Caching:**

Caching mainly helps **repeated** operations (the same input string parsed again, the same name
tokens formatted again). Distinct-input / first-time operations are already fast without it, and
`.tz()` conversions rely on the always-on timezone-offset cache either way. See the auto-updated
tables in the [README](../README.md#-performance-benchmarks) / [Performance Guide](PERFORMANCE.md)
for current per-scenario numbers.

### Clone Instead of Re-Parsing

kk-date does **not** pool or recycle objects: every `new kk_date()` is an ordinary allocation, and
`add()`, `set()`, `startOf()`, `endOf()` and `tz()` mutate the instance they are called on. To derive
many dates from one value, parse it once and clone the instance — cloning skips string parsing:

```javascript
const baseDate = new kk_date('2024-08-23 10:00:00');

const dates = [];
for (let i = 0; i < 1000; i++) {
    // ❌ Slower: parses the same string 1000 times
    // dates.push(new kk_date('2024-08-23 10:00:00').add(i, 'hours'));

    // ✅ Faster: clone the parsed instance (baseDate itself is not modified)
    dates.push(new kk_date(baseDate).add(i, 'hours'));
}

console.log(baseDate.format('HH:mm'));  // '10:00'
console.log(dates[5].format('HH:mm'));  // '15:00'
```

### Batch Operations

For multiple date operations, use batch processing:

```javascript
// Process multiple dates efficiently
const dates = [
    '2024-08-23 10:00:00',
    '2024-08-23 11:00:00',
    '2024-08-23 12:00:00'
];

// Batch timezone conversion.
// (Naive inputs are parsed in the global timezone, which defaults to the system timezone; the
// outputs below assume kk_date.setTimezone('UTC') or TZ=UTC. Use '...Z' instants for results
// independent of the configuration.)
const convertedDates = dates.map(dateStr => {
    const date = new kk_date(dateStr);
    return date.tz('America/New_York').format('HH:mm');
});

console.log(convertedDates); // ['06:00', '07:00', '08:00']
```

### Format String Optimization

Every distinct template string is compiled once and cached, whether it is written inline or kept in
a constant — constants simply keep the templates consistent across a code base:

```javascript
// Define format strings as constants
const FORMATS = {
    DATE: 'YYYY-MM-DD',
    TIME: 'HH:mm:ss',
    DATETIME: 'YYYY-MM-DD HH:mm:ss',
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
};

const date = new kk_date('2024-08-23 10:30:45');

// Use constants instead of inline strings
console.log(date.format(FORMATS.DATE));     // '2024-08-23'
console.log(date.format(FORMATS.TIME));     // '10:30:45'
console.log(date.format(FORMATS.DATETIME)); // '2024-08-23 10:30:45'
```

## Memory Management

### Memory Usage

> The net memory delta is a **GC-timing artifact**, not a guarantee — from run to run it can be **positive or negative**, and **several other libraries (e.g. Luxon) also show negative values**. It depends on workload, Node version, and GC behavior; reproduce it with `node benchmark.js` before relying on it.

In our benchmarks kk-date can report **negative net memory usage** — which only means that a garbage collection ran during the measured window:

```javascript
// Measurement methodology (the result depends on when the GC runs)
const before = process.memoryUsage().heapUsed;

// Create 100,000 date instances
for (let i = 0; i < 100000; i++) {
    const date = new kk_date('2024-08-23 10:00:00');
    date.format('YYYY-MM-DD HH:mm:ss');
}

const after = process.memoryUsage().heapUsed;
const memoryUsed = (after - before) / 1024 / 1024;
console.log('Memory used:', memoryUsed); // GC-dependent; can be positive or negative from run to run
```

**What keeps memory stable:**
- **Bounded caches**: the formatter-result, converter and timezone-offset caches are cleared wholesale above 10,000 entries, compiled templates above 1,000, and the Intl formatter caches (keyed by timezone/locale) at 500 each
- **Opt-in nope-redis layer**: TTL expiry, and the least recently used 20% are evicted once it holds more than 10,000 entries
- **Few intermediate objects** on the parsing and formatting hot paths
- **No object pooling**: kk-date does not pool or recycle objects — instances are ordinary allocations that the garbage collector reclaims

### Automatic Cleanup

The library automatically manages memory and cleans up cached data:

```javascript
// No manual cleanup required
const date = new kk_date('2024-08-23 10:00:00');
const formatted = date.format('YYYY-MM-DD HH:mm:ss');

// Every cache has a size limit, so cache memory stays bounded however long the process runs.
// To release the opt-in cache layer's memory early:
kk_date.caching_flush();
```

### Large-Scale Usage

```javascript
// Monitor memory usage in development
if (process.env.NODE_ENV === 'development') {
    const used = process.memoryUsage();
    console.log('Memory usage:', {
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`
    });
}
```

## Error Handling

### Comprehensive Error Handling

```javascript
const kk_date = require('kk-date');

// Wrapper function with error handling
function safeDateOperation(operation) {
    try {
        return operation();
    } catch (error) {
        console.error('Date operation failed:', error.message);
        
        // Log error details for debugging
        if (process.env.NODE_ENV === 'development') {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                operation: operation.toString()
            });
        }
        
        // Return fallback value
        return null;
    }
}

// Usage
const result = safeDateOperation(() => {
    const date = new kk_date('invalid-date');
    return date.format('YYYY-MM-DD');
});

if (result === null) {
    console.log('Using fallback date');
    const fallback = new kk_date().format('YYYY-MM-DD');
}
```

### Validation Functions

```javascript
// Validate date input
function validateDateInput(input) {
    if (!input) {
        throw new Error('Date input is required');
    }
    
    if (typeof input === 'string') {
        // Check for common invalid patterns
        if (input === 'invalid' || input === 'null' || input === 'undefined') {
            throw new Error('Invalid date string');
        }
    }
    
    return true;
}

// Validate timezone: kk_date.checkTimezone() returns true for any zone the runtime's Intl
// accepts and throws 'Invalid timezone: <value>' otherwise (including undefined, '' and non-strings)
function validateTimezone(timezone) {
    return kk_date.checkTimezone(timezone);
}

// To list the zones instead (e.g. for a dropdown), kk_date.getAvailableTimezones() returns every
// zone the engine supports (Intl.supportedValuesOf('timeZone'), plus 'UTC')

// Usage
try {
    validateDateInput('2024-08-23 10:00:00');
    validateTimezone('America/New_York');
    
    const date = new kk_date('2024-08-23 10:00:00');
    const converted = date.tz('America/New_York');
    
    console.log(converted.format('HH:mm'));
} catch (error) {
    console.error('Validation failed:', error.message);
}
```

### Error Recovery

```javascript
// Error recovery with fallbacks
function createDateWithFallback(input, fallback = new Date()) {
    try {
        return new kk_date(input);
    } catch (error) {
        console.warn(`Failed to create date from '${input}', using fallback`);
        return new kk_date(fallback);
    }
}

// Usage
const date1 = createDateWithFallback('2024-08-23 10:00:00');
const date2 = createDateWithFallback('invalid-date'); // Uses fallback
```

## Custom Extensions

### Extending kk-date

You can extend kk-date with custom methods:

```javascript
// Extend kk-date with custom methods
function extendKkDate() {
    // Add custom method to prototype
    kk_date.prototype.toRelativeTime = function() {
        const now = new kk_date();
        // diff is measured as (now - this): positive when `this` is in the past.
        const diff = this.diff(now, 'minutes');
        
        if (Math.abs(diff) < 1) {
            return 'just now';
        } else if (diff > 0) {
            return `${diff} minutes ago`;
        } else {
            return `in ${Math.abs(diff)} minutes`;
        }
    };
    
    // Add static method
    kk_date.isWeekend = function(date) {
        const day = date.date.getDay();
        return day === 0 || day === 6;
    };
    
    // Add utility method to count business days
    kk_date.getBusinessDays = function(startDate, endDate) {
        const start = new kk_date(startDate);
        const end = new kk_date(endDate);
        let businessDays = 0;
        
        let current = new kk_date(start.getDate());
        while (current.isBefore(end) || current.isSame(end)) {
            const dayOfWeek = current.date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                businessDays++;
            }
            current.add(1, 'days');
        }
        
        return businessDays;
    };
}

// Initialize extensions
extendKkDate();

// Usage
const date = new kk_date('2024-08-23 10:00:00');
console.log(date.toRelativeTime()); // 'just now' or 'X minutes ago'

const isWeekend = kk_date.isWeekend(date);
console.log('Is weekend:', isWeekend);

const businessDays = kk_date.getBusinessDays('2024-08-23', '2024-08-30');
console.log('Business days:', businessDays);
```

### Custom Formatting

```javascript
// Custom formatting functions
const customFormatters = {
    // Relative time formatting
    relative: (date) => {
        const now = new kk_date();
        // diff is measured as (now - date): negative when `date` is in the future.
        const diff = date.diff(now, 'days');
        
        if (diff === 0) {
            return 'Today';
        } else if (diff === -1) {
            return 'Tomorrow';
        } else if (diff === 1) {
            return 'Yesterday';
        } else if (diff < 0) {
            return `In ${Math.abs(diff)} days`;
        } else {
            return `${diff} days ago`;
        }
    },
    
    // Age calculation: date.diff(now) === (now - date), positive for a past birthdate
    age: (date) => {
        const now = new kk_date();
        const years = date.diff(now, 'years');
        return `${years} years old`;
    },
    
    // Quarter formatting
    quarter: (date) => {
        const month = parseInt(date.format('MM'), 10);
        const quarter = Math.ceil(month / 3);
        return `Q${quarter} ${date.format('YYYY')}`;
    }
};

// Usage
const date = new kk_date('2024-08-23 10:00:00');
console.log(customFormatters.relative(date)); // 'Today' or relative time
console.log(customFormatters.age(date));      // Age calculation
console.log(customFormatters.quarter(date));  // 'Q3 2024'
```

## Integration Patterns

### Express.js Integration

```javascript
const express = require('express');
const kk_date = require('kk-date');

const app = express();

// Middleware: read the user's timezone per request. Keep it on the request — global setters
// (setTimezone/setUserTimezone) are process-wide and would leak between concurrent requests.
app.use((req, res, next) => {
    const userTimezone = req.headers['x-timezone'] || 'UTC';
    try {
        kk_date.checkTimezone(userTimezone); // throws 'Invalid timezone: ...'
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
    req.userTimezone = userTimezone;
    next();
});

// API endpoint with timezone support
app.get('/api/events', (req, res) => {
    // Store and exchange absolute instants (ISO-8601 with Z): they never depend on the server's timezone
    const events = [
        { id: 1, title: 'Meeting', time: '2024-08-23T14:00:00Z' },
        { id: 2, title: 'Lunch', time: '2024-08-23T12:00:00Z' }
    ];

    // Display each instant in the user's timezone (.tz() changes only the display zone)
    const eventsWithUserTime = events.map((event) => {
        const userTime = new kk_date(event.time).tz(req.userTimezone);

        return {
            ...event,
            userTime: userTime.format('HH:mm'),      // '10:00' / '08:00' for x-timezone: America/New_York
            userDate: userTime.format('YYYY-MM-DD')  // '2024-08-23'
        };
    });

    res.json(eventsWithUserTime);
});
```

### React Integration

```javascript
import React, { useState, useEffect } from 'react';
import kk_date from 'kk-date';

// Custom hook for timezone-aware dates
function useTimezoneDate(dateString, timezone) {
    const [formattedDate, setFormattedDate] = useState('');
    
    useEffect(() => {
        try {
            const date = new kk_date(dateString);
            const converted = date.tz(timezone);
            setFormattedDate(converted.format('YYYY-MM-DD HH:mm'));
        } catch (error) {
            console.error('Date formatting error:', error);
            setFormattedDate('Invalid date');
        }
    }, [dateString, timezone]);
    
    return formattedDate;
}

// React component
function EventCard({ event, userTimezone }) {
    const formattedTime = useTimezoneDate(event.time, userTimezone);
    
    return (
        <div className="event-card">
            <h3>{event.title}</h3>
            <p>Time: {formattedTime}</p>
        </div>
    );
}
```

### Database Integration

```javascript
// MongoDB with Mongoose
const mongoose = require('mongoose');
const kk_date = require('kk-date');

const eventSchema = new mongoose.Schema({
    title: String,
    startTime: Date, // an absolute instant: MongoDB stores Dates in UTC
    endTime: Date,
    timezone: { type: String, default: 'UTC' } // the zone the event is shown in
});

// There is nothing to "convert to UTC" in a save hook: a Date already is an absolute instant, and
// kk-date's .tz() / .config({ timezone }) only change the DISPLAY zone — they never move the
// instant. Get the instant right before the value reaches Mongoose instead (see the usage below).

// Instance method to display the stored instants in any timezone
eventSchema.methods.getUserTime = function (userTimezone) {
    return {
        startTime: new kk_date(this.startTime).tz(userTimezone).format('YYYY-MM-DD HH:mm'),
        endTime: new kk_date(this.endTime).tz(userTimezone).format('YYYY-MM-DD HH:mm')
    };
};

const Event = mongoose.model('Event', eventSchema);

// Usage: 2–3 PM New York time. A string with an explicit offset (or Z) is an absolute instant;
// toISOString() hands Mongoose an unambiguous UTC value.
const event = new Event({
    title: 'Team Meeting',
    startTime: new kk_date('2024-08-23T14:00:00-04:00').toISOString(), // '2024-08-23T18:00:00.000Z'
    endTime: new kk_date('2024-08-23T15:00:00-04:00').toISOString(),   // '2024-08-23T19:00:00.000Z'
    timezone: 'America/New_York'
});

await event.save();

console.log(event.getUserTime('Europe/London'));  // { startTime: '2024-08-23 19:00', endTime: '2024-08-23 20:00' }
console.log(event.getUserTime(event.timezone));   // { startTime: '2024-08-23 14:00', endTime: '2024-08-23 15:00' }
```

A naive wall-clock string (`'2024-08-23 14:00:00'` meant as New York time) can only be read in a
given zone through the **global** timezone — `kk_date.setTimezone('America/New_York')` before
parsing — because instance configuration is display-only. Passing such a string straight to
Mongoose lets it parse the string with `new Date()` in the server's timezone.

## Testing Strategies

### Unit Testing

```javascript
// Jest test examples
const kk_date = require('kk-date');

describe('kk-date Advanced Features', () => {
    beforeEach(() => {
        // Reset global configuration before each test
        kk_date.setTimezone('UTC');
        kk_date.config({ locale: 'en' });
    });
    
    test('timezone conversion with DST', () => {
        // 07:00 UTC on 2024-03-10 is just after New York springs forward to EDT.
        // (Use an absolute instant so the result does not depend on the process timezone.)
        const dstDate = new kk_date('2024-03-10T07:00:00.000Z');
        const nyTime = dstDate.tz('America/New_York');
        
        expect(nyTime.format('HH:mm')).toBe('03:00'); // EDT
    });
    
    test('batch timezone conversion', () => {
        const dates = [
            '2024-08-23 10:00:00',
            '2024-08-23 11:00:00',
            '2024-08-23 12:00:00'
        ];
        
        const converted = dates.map(dateStr => {
            const date = new kk_date(dateStr);
            return date.tz('America/New_York').format('HH:mm');
        });
        
        expect(converted).toEqual(['06:00', '07:00', '08:00']);
    });
    
    test('error handling for invalid input', () => {
        expect(() => {
            new kk_date('invalid-date');
        }).toThrow('Invalid Date');
    });
    
    test('repeated parses are served from the cache', () => {
        // Don't compare the wall time of single calls: they take microseconds, below
        // Date.now() resolution (both measure 0 ms), and timing assertions are flaky.
        // Assert on the cache counters instead.
        kk_date.caching({ status: true });
        try {
            const before = kk_date.caching_status();

            new kk_date('2024-08-23 10:00:00'); // miss: parsed and stored
            new kk_date('2024-08-23 10:00:00'); // hit: served from the cache

            const after = kk_date.caching_status();
            expect(after.totalMisses - before.totalMisses).toBe(1);
            expect(after.totalHits - before.totalHits).toBe(1);
        } finally {
            kk_date.caching({ status: false }); // also resets the counters
        }
    });
});
```

### Integration Testing

```javascript
// Integration test with API
describe('API Integration', () => {
    test('timezone-aware API response', async () => {
        const response = await fetch('/api/events', {
            headers: {
                'x-timezone': 'America/New_York'
            }
        });
        
        const events = await response.json();
        
        expect(events[0]).toHaveProperty('userTime');
        expect(events[0]).toHaveProperty('userDate');
    });
});
```

## Migration Guide

### From Moment.js

```javascript
// Moment.js code — .tz() needs moment-timezone (plain 'moment' has no .tz())
const moment = require('moment-timezone');
const date = moment('2024-08-23 10:00:00');
const formatted = date.format('YYYY-MM-DD HH:mm:ss');
const converted = date.tz('America/New_York');
```

```javascript
// kk-date equivalent (like moment, .tz() changes the display zone of the same instance and returns it)
const kk_date = require('kk-date');
const date = new kk_date('2024-08-23 10:00:00');
const formatted = date.format('YYYY-MM-DD HH:mm:ss');
const converted = date.tz('America/New_York');
```

### From Day.js

```javascript
// Day.js code
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const date = dayjs('2024-08-23 10:00:00');
const converted = date.tz('America/New_York'); // a new Day.js object; `date` is unchanged
```

```javascript
// kk-date equivalent — unlike Day.js, .tz() mutates the instance and returns it,
// so `date` and `converted` are the same object
const kk_date = require('kk-date');
const date = new kk_date('2024-08-23 10:00:00');
const converted = date.tz('America/New_York');
```

### From Native Date

```javascript
// Native Date code
const date = new Date('2024-08-23T10:00:00Z');
const formatted = date.toISOString(); // '2024-08-23T10:00:00.000Z'
```

```javascript
// kk-date equivalent
const kk_date = require('kk-date');
const date = new kk_date('2024-08-23T10:00:00Z');
const formatted = date.toISOString(); // '2024-08-23T10:00:00.000Z'
```

### Migration Checklist

- [ ] Replace constructor calls
- [ ] Update method names
- [ ] Adjust format strings
- [ ] Update timezone handling
- [ ] Test DST transitions
- [ ] Verify locale support
- [ ] Update error handling
- [ ] Performance testing
- [ ] Integration testing
