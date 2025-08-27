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

kk-date automatically caches timezone calculations for better performance:

```javascript
const kk_date = require('kk-date');

// First conversion - may be slower
const date = new kk_date('2024-08-23 10:00:00');
const first = date.tz('America/New_York');

// Subsequent conversions - faster due to caching
const second = date.tz('America/New_York');
const third = date.tz('America/New_York');
```

### Object Pooling

The library uses object pooling to reduce garbage collection:

```javascript
// Reuse date instances when possible
const baseDate = new kk_date('2024-08-23 10:00:00');

// Instead of creating new instances
const dates = [];
for (let i = 0; i < 1000; i++) {
    // ❌ Bad: Creates new instances
    // dates.push(new kk_date('2024-08-23 10:00:00'));
    
    // ✅ Good: Create new instance from existing date
dates.push(new kk_date(baseDate.getDate()).add(i, 'hours'));
}
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

// Batch timezone conversion
const convertedDates = dates.map(dateStr => {
    const date = new kk_date(dateStr);
    return date.tz('America/New_York').format('HH:mm');
});

console.log(convertedDates); // ['06:00', '07:00', '08:00']
```

### Format String Optimization

Reuse format strings to avoid repeated string creation:

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

### Automatic Cleanup

The library automatically manages memory and cleans up cached data:

```javascript
// No manual cleanup required
const date = new kk_date('2024-08-23 10:00:00');

// Use the date
const formatted = date.format('YYYY-MM-DD HH:mm:ss');

// Memory is automatically managed
// No need to call cleanup methods
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

// Validate timezone
function validateTimezone(timezone) {
    if (!timezone) {
        throw new Error('Timezone is required');
    }
    
    if (typeof timezone !== 'string') {
        throw new Error('Timezone must be a string');
    }
    
    // Check if timezone is supported
    const supportedTimezones = kk_date.getAvailableTimezones();
    if (!supportedTimezones.includes(timezone)) {
        throw new Error(`Unsupported timezone: ${timezone}`);
    }
    
    return true;
}

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
        const diff = this.diff(now, 'minutes');
        
        if (Math.abs(diff) < 1) {
            return 'just now';
        } else if (diff < 0) {
            return `${Math.abs(diff)} minutes ago`;
        } else {
            return `in ${diff} minutes`;
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
        const diff = date.diff(now, 'days');
        
        if (diff === 0) {
            return 'Today';
        } else if (diff === 1) {
            return 'Tomorrow';
        } else if (diff === -1) {
            return 'Yesterday';
        } else if (diff > 0) {
            return `In ${diff} days`;
        } else {
            return `${Math.abs(diff)} days ago`;
        }
    },
    
    // Age calculation
    age: (date) => {
        const now = new kk_date();
        const years = now.diff(date, 'years');
        return `${years} years old`;
    },
    
    // Quarter formatting
    quarter: (date) => {
        const month = parseInt(date.format('M'));
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

// Middleware to set user timezone
app.use((req, res, next) => {
    // Get timezone from request headers or user preferences
    const userTimezone = req.headers['x-timezone'] || 'UTC';
    kk_date.setUserTimezone(userTimezone);
    next();
});

// API endpoint with timezone support
app.get('/api/events', (req, res) => {
    const events = [
        { id: 1, title: 'Meeting', time: '2024-08-23 14:00:00' },
        { id: 2, title: 'Lunch', time: '2024-08-23 12:00:00' }
    ];
    
    // Convert times to user timezone
    const eventsWithUserTime = events.map(event => {
        const eventDate = new kk_date(event.time);
        eventDate.config({timezone: 'UTC'});
        const userTime = eventDate.tz(kk_date.getUserTimezone());
        
        return {
            ...event,
            userTime: userTime.format('HH:mm'),
            userDate: userTime.format('YYYY-MM-DD')
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

// Schema with date handling
const eventSchema = new mongoose.Schema({
    title: String,
    startTime: Date,
    endTime: Date,
    timezone: { type: String, default: 'UTC' }
});

// Pre-save middleware to normalize dates
eventSchema.pre('save', function(next) {
    if (this.startTime && this.timezone !== 'UTC') {
        // Convert to UTC for storage
        const startDate = new kk_date(this.startTime);
        startDate.config({timezone: this.timezone});
        this.startTime = startDate.tz('UTC').date;
    }
    
    if (this.endTime && this.timezone !== 'UTC') {
        const endDate = new kk_date(this.endTime);
        endDate.config({timezone: this.timezone});
        this.endTime = endDate.tz('UTC').date;
    }
    
    next();
});

// Instance method to get user time
eventSchema.methods.getUserTime = function(userTimezone) {
    const startDate = new kk_date(this.startTime);
    startDate.config({timezone: 'UTC'});
    const endDate = new kk_date(this.endTime);
    endDate.config({timezone: 'UTC'});
    
    return {
        startTime: startDate.tz(userTimezone).format('YYYY-MM-DD HH:mm'),
        endTime: endDate.tz(userTimezone).format('YYYY-MM-DD HH:mm')
    };
};

const Event = mongoose.model('Event', eventSchema);

// Usage
const event = new Event({
    title: 'Team Meeting',
    startTime: '2024-08-23 14:00:00',
    endTime: '2024-08-23 15:00:00',
    timezone: 'America/New_York'
});

await event.save();

// Get user time
const userTime = event.getUserTime('Europe/London');
console.log(userTime); // { startTime: '2024-08-23 19:00', endTime: '2024-08-23 20:00' }
```

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
        // Test DST transition
        const dstDate = new kk_date('2024-03-10 02:00:00');
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
        }).toThrow('Invalid date format');
    });
    
    test('performance with caching', () => {
        const date = new kk_date('2024-08-23 10:00:00');
        
        // First conversion
        const start1 = Date.now();
        date.tz('America/New_York');
        const time1 = Date.now() - start1;
        
        // Second conversion (should be faster)
        const start2 = Date.now();
        date.tz('America/New_York');
        const time2 = Date.now() - start2;
        
        expect(time2).toBeLessThan(time1);
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
// Moment.js code
const moment = require('moment');
const date = moment('2024-08-23 10:00:00');
const formatted = date.format('YYYY-MM-DD HH:mm:ss');
const converted = date.tz('America/New_York');

// kk-date equivalent
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
const converted = date.tz('America/New_York');

// kk-date equivalent
const kk_date = require('kk-date');
const date = new kk_date('2024-08-23 10:00:00');
const converted = date.tz('America/New_York');
```

### From Native Date

```javascript
// Native Date code
const date = new Date('2024-08-23T10:00:00Z');
const formatted = date.toISOString();

// kk-date equivalent
const kk_date = require('kk-date');
const date = new kk_date('2024-08-23T10:00:00Z');
const formatted = date.toISOString();
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
