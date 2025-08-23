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

### Configuration Levels

1. **Global Configuration**: Affects all new instances
2. **Instance Configuration**: Overrides global settings for specific instances
3. **Default Values**: Fallback when no configuration is provided

## Global Configuration

### Setting Global Timezone

```javascript
const kk_date = require('kk-date');

// Set global default timezone
kk_date.setTimezone('UTC');
kk_date.setTimezone('America/New_York');
kk_date.setTimezone('Europe/London');

// Get current global timezone
const currentTimezone = kk_date.getTimezone();
console.log(currentTimezone); // 'UTC'
```

### Setting User Timezone

```javascript
// Set user's preferred timezone
kk_date.setUserTimezone('America/New_York');

// Get user timezone
const userTimezone = kk_date.getUserTimezone();
console.log(userTimezone); // 'America/New_York'
```

### Setting Global Locale

```javascript
// Set global locale
kk_date.config({ locale: 'en' });
kk_date.config({ locale: 'tr' });
kk_date.config({ locale: 'de' });

// Get current locale (access global config)
const currentLocale = kk_date.global_config?.locale || 'en';
console.log(currentLocale); // 'en'
```

### Setting Week Start Day

```javascript
// Set week start day (0 = Sunday, 1 = Monday)
kk_date.config({ weekStartDay: 0 }); // Sunday (default)
kk_date.config({ weekStartDay: 1 }); // Monday

// Get week start day (access global config)
const weekStartDay = kk_date.global_config?.weekStartDay || 0;
console.log(weekStartDay); // 0 or 1
```

### Complete Global Configuration Example

```javascript
const kk_date = require('kk-date');

// Configure global settings
kk_date.setTimezone('UTC');
kk_date.setUserTimezone('America/New_York');
kk_date.config({ locale: 'en', weekStartDay: 1 }); // Monday

// All new instances will use these settings
const date1 = new kk_date('2024-08-23 10:00:00');
const date2 = new kk_date('2024-08-23 15:00:00');

console.log(date1.format('HH:mm')); // '10:00' (UTC)
console.log(date2.format('HH:mm')); // '15:00' (UTC)
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
| `weekStartDay` | number | Week start day (0 or 1) | Global week start day |

### Instance Configuration Examples

#### Timezone Configuration

```javascript
// Create instance with specific timezone
const nyDate = new kk_date('2024-08-23 10:00:00');
nyDate.config({ timezone: 'America/New_York' });

console.log(nyDate.format('HH:mm')); // '10:00' (interpreted as NY time)
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

// Instance: New York (overrides global)
const nyDate = new kk_date('2024-08-23 10:00:00');
nyDate.config({ timezone: 'America/New_York' });

// Result: Uses New York timezone
console.log(nyDate.format('HH:mm')); // '10:00' (NY time)

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
console.log('Global locale:', kk_date.global_config?.locale || 'en');
console.log('Global week start day:', kk_date.global_config?.weekStartDay || 0);

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

```javascript
// Store user's timezone preference
kk_date.setUserTimezone('America/New_York');

// Use user timezone for display
const serverTime = new kk_date('2024-08-23 15:00:00');
            date.config({timezone: 'UTC'});

const userTime = serverTime.tz(kk_date.getUserTimezone());
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

// Convert to user timezone for display
const serverTime = new kk_date('2024-08-23 15:00:00');
const userTimezone = 'America/New_York';
const userTime = serverTime.tz(userTimezone);

console.log('Server time:', serverTime.format('HH:mm')); // '15:00'
console.log('User time:', userTime.format('HH:mm'));     // '11:00'
```

#### 2. Client-Side Application

```javascript
// Detect user's timezone
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
kk_date.setUserTimezone(userTimezone);

// Use user timezone for all operations
const localTime = new kk_date('2024-08-23 10:00:00');
console.log(localTime.format('HH:mm')); // '10:00' (user's timezone)
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
    return new kk_date(dateString);
            date.config({timezone: config.timezone});
}

const tenant1Date = createTenantDate('2024-08-23 10:00:00', 'tenant1');
const tenant2Date = createTenantDate('2024-08-23 10:00:00', 'tenant2');

console.log(tenant1Date.format('HH:mm')); // '10:00' (NY time)
console.log(tenant2Date.format('HH:mm')); // '10:00' (London time)
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
            date.config({locale: 'tr'});

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

// Output:
// en: Friday, 23 August 2024
// tr: Cuma, 23 Ağustos 2024
// de: Freitag, 23 August 2024
// fr: Vendredi, 23 août 2024
// es: Viernes, 23 agosto 2024
```

### Supported Locales

The library supports various locales:

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

## Week Start Day Configuration

### Setting Week Start Day

```javascript
// Set week to start on Monday (1)
kk_date.config({ weekStartDay: 1 });

// Set week to start on Sunday (0)
kk_date.config({ weekStartDay: 0 });
```

### Week Start Day Examples

```javascript
const date = new kk_date('2024-08-23 10:00:00'); // Friday

// Week starts on Sunday (default)
kk_date.config({ weekStartDay: 0 });
console.log(date.startOf('week').format('YYYY-MM-DD')); // '2024-08-18' (Sunday)

// Week starts on Monday
kk_date.config({ weekStartDay: 1 });
console.log(date.startOf('week').format('YYYY-MM-DD')); // '2024-08-19' (Monday)
```

### Instance-Specific Week Start Day

```javascript
// Create instance with specific week start day
const mondayWeek = new kk_date('2024-08-23 10:00:00');
mondayWeek.config({ weekStartDay: 1 });

console.log(mondayWeek.startOf('week').format('YYYY-MM-DD')); // '2024-08-19' (Monday)
```

## Performance Configuration

### Caching Configuration

The library automatically caches timezone calculations for better performance:

```javascript
// Timezone calculations are cached automatically
const date = new kk_date('2024-08-23 10:00:00');

// First conversion may be slower
const first = date.tz('America/New_York');

// Subsequent conversions are faster
const second = date.tz('America/New_York');
const third = date.tz('America/New_York');
```

### Memory Management

The library automatically manages memory and cleans up cached data:

```javascript
// No manual cleanup required
// The library handles memory management automatically
```

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
    weekStartDay: parseInt(process.env.WEEK_START_DAY) || 0
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

// Apply user preferences
kk_date.setUserTimezone(userPreferences.timezone);

// Create dates with user preferences
const userDate = new kk_date('2024-08-23 10:00:00');
userDate.config({ 
    locale: userPreferences.locale,
    weekStartDay: userPreferences.weekStartDay
});
```

### 6. Configuration Validation

```javascript
// Validate all configuration
function validateConfiguration() {
    const errors = [];
    
    try {
        kk_date.getTimezone();
    } catch (error) {
        errors.push('Invalid timezone configuration');
    }
    
    try {
        // Check if locale is accessible through global config
        const locale = kk_date.global_config?.locale || 'en';
    } catch (error) {
        errors.push('Invalid locale configuration');
    }
    
    const weekStartDay = kk_date.global_config?.weekStartDay || 0;
    if (weekStartDay !== 0 && weekStartDay !== 1) {
        errors.push('Invalid week start day configuration');
    }
    
    return errors;
}

// Usage
const errors = validateConfiguration();
if (errors.length > 0) {
    console.log('Configuration errors:', errors);
    // Apply default configuration
    kk_date.setTimezone('UTC');
    kk_date.config({ locale: 'en', weekStartDay: 0 });
}
```

### 7. Configuration Documentation

```javascript
// Document your configuration
const configuration = {
    timezone: {
        global: 'UTC',
        user: 'America/New_York',
        description: 'Server uses UTC, users see their local timezone'
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
console.log('Global timezone:', kk_date.getTimezone());
console.log('User timezone:', kk_date.getUserTimezone());

// Verify instance configuration
const date = new kk_date('2024-08-23 10:00:00');
console.log('Instance timezone:', date.temp_config.timezone);
```

#### 2. Locale Not Working

**Problem**: Locale changes not reflected in formatting.

**Solution**: Ensure locale is supported and properly set.

```javascript
// Check current locale
console.log('Current locale:', kk_date.global_config?.locale || 'en');

// Test locale formatting
const date = new kk_date('2024-08-23 10:00:00');
console.log(date.format('DD MMMM YYYY'));
```

#### 3. Week Start Day Issues

**Problem**: Week calculations not working as expected.

**Solution**: Verify week start day configuration.

```javascript
// Check week start day
console.log('Week start day:', kk_date.global_config?.weekStartDay || 0);

// Test week calculations
const date = new kk_date('2024-08-23 10:00:00');
console.log('Start of week:', date.startOf('week').format('YYYY-MM-DD'));
```

### Configuration Reset

```javascript
// Reset to default configuration
function resetConfiguration() {
    kk_date.setTimezone('UTC');
    kk_date.setUserTimezone('UTC');
    kk_date.config({ locale: 'en', weekStartDay: 0 });
}

// Usage
resetConfiguration();
console.log('Configuration reset to defaults');
```
