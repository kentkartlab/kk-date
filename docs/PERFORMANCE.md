# Performance Guide

## 🚀 Performance Overview

kk-date is designed for speed and efficiency, featuring intelligent caching, memory optimization, and automatic DST handling. This guide covers performance optimization strategies and provides guidance for benchmarking your specific use cases.

**Important Note:** Performance can vary significantly based on your environment, Node.js version, operating system, and specific use patterns. The benchmarks and optimizations described here are general guidelines. For accurate performance metrics relevant to your application, please run benchmarks in your target environment.

## ⚡ Performance Features

### Intelligent Multi-Level Caching System

kk-date uses a sophisticated multi-level caching system to optimize performance:

- **Converter Results Cache**: Caches date component extraction results (10K limit with LRU eviction)
- **Formatter Cache**: Caches formatted output strings (10K limit with LRU eviction)
- **Timezone Offset Caching**: Caches timezone calculations with TTL to avoid repeated computations
- **Format Pattern Caching**: Caches compiled format patterns for faster formatting
- **Locale Data Caching**: Pre-computes and caches month/day names for different locales
- **DateTimeFormat Cache**: Reuses Intl.DateTimeFormat instances for locale operations
- **Automatic Cleanup**: Removes expired cache entries and implements LRU eviction to prevent memory leaks

```javascript
const kk_date = require('kk-date');

// Enable caching for better performance
kk_date.caching({ status: true, defaultTtl: 3600 });

// Check cache statistics
const stats = kk_date.caching_status();
console.log('Cache hit rate:', stats.hitRate);
console.log('Cache size:', stats.size);
```

### Timezone Conversion Performance

**Key Optimization Features:**

- **Lazy Loading**: Timezone data is loaded only when needed
- **Efficient Algorithms**: Optimized date calculation algorithms
- **Memory Management**: Automatic cleanup of cached data
- **DST Handling**: Built-in DST calculations without external lookups

**Benchmark Example:**
```javascript
const kk_date = require('kk-date');

function benchmarkTimezoneConversions() {
    const iterations = 10000;
    const testDate = '2024-08-23 10:00:00';
    
    console.time('Timezone Conversions');
    for (let i = 0; i < iterations; i++) {
        // Each conversion should use a separate instance to avoid side effects
        const nyTime = new kk_date(testDate).tz('America/New_York');
        const tokyoTime = new kk_date(testDate).tz('Asia/Tokyo');
        const londonTime = new kk_date(testDate).tz('Europe/London');
    }
    console.timeEnd('Timezone Conversions');
}

benchmarkTimezoneConversions();
```

### Date Formatting Performance

**Optimization Features:**

- **Template Caching**: Common format patterns are pre-compiled and cached
- **Efficient String Building**: Optimized string concatenation methods
- **Locale Caching**: Month and day names are pre-computed for supported locales
- **Pattern Reuse**: Regex patterns are cached and reused across operations

**Benchmark Example:**
```javascript
const kk_date = require('kk-date');

function benchmarkFormatting() {
    const date = new kk_date('2024-08-23 10:30:45');
    const iterations = 10000;
    
    console.time('Date Formatting');
    for (let i = 0; i < iterations; i++) {
        const testDate = new kk_date('2024-08-23 10:30:45');
        testDate.format('YYYY-MM-DD HH:mm:ss');
        testDate.format('DD.MM.YYYY');
        testDate.format('DD MMMM YYYY');
        testDate.format('dddd, DD MMMM YYYY HH:mm');
    }
    console.timeEnd('Date Formatting');
}

benchmarkFormatting();
```

### Constructor Performance

**Optimization Features:**

- **Format Detection**: Automatic format detection with result caching
- **Input Validation**: Efficient validation using pre-compiled regex patterns
- **Object Reuse**: Internal object pooling where applicable
- **Type Optimization**: Fast-path handling for different input types

**Benchmark Example:**
```javascript
const kk_date = require('kk-date');

function benchmarkConstructor() {
    const iterations = 10000;
    
    console.time('Constructor Performance');
    for (let i = 0; i < iterations; i++) {
        new kk_date(); // Current date
        new kk_date('2024-08-23'); // String parsing
        new kk_date(Date.now()); // Timestamp
        new kk_date(new Date()); // Date object
        new kk_date('2024-08-23 10:30:45'); // DateTime string
    }
    console.timeEnd('Constructor Performance');
}

benchmarkConstructor();
```

### Date Manipulation Performance

**Optimization Features:**

- **Millisecond-Based Operations**: Direct manipulation of underlying timestamp
- **Efficient Month Calculations**: Optimized algorithms for month/year arithmetic
- **In-Place Modifications**: Modifies existing objects rather than creating new ones
- **Batch Operations**: Optimized handling of multiple operations

**Benchmark Example:**
```javascript
const kk_date = require('kk-date');

function benchmarkManipulation() {
    const date = new kk_date('2024-08-23 10:00:00');
    const iterations = 10000;
    
    console.time('Date Manipulation');
    for (let i = 0; i < iterations; i++) {
        const testDate = new kk_date('2024-08-23 10:00:00');
        // Note: These operations mutate the same instance sequentially
        testDate.add(1, 'days');
        testDate.add(1, 'months');
        testDate.startOf('days');
        testDate.endOf('days');
    }
    console.timeEnd('Date Manipulation');
}

benchmarkManipulation();
```

### Comparison Operations

**Optimization Features:**

- **Direct Timestamp Comparison**: Uses underlying timestamp values for faster comparisons
- **Type Coercion**: Efficient type conversion for different input types
- **Early Returns**: Optimization shortcuts for obvious cases
- **Batch Comparison**: Optimized handling when comparing multiple dates

**Benchmark Example:**
```javascript
const kk_date = require('kk-date');

function benchmarkComparisons() {
    const date1 = new kk_date('2024-08-23 10:00:00');
    const date2 = new kk_date('2024-08-23 15:00:00');
    const date3 = new kk_date('2024-08-25 10:00:00');
    const iterations = 10000;
    
    console.time('Comparison Operations');
    for (let i = 0; i < iterations; i++) {
        // These comparison operations don't modify the instances
        date1.isBefore(date2);
        date2.isAfter(date1);
        date1.isSame(date1);
        date1.diff(date3, 'days');
    }
    console.timeEnd('Comparison Operations');
}

benchmarkComparisons();
```

### Validation Performance

**Optimization Features:**

- **Regex Caching**: Validation patterns are pre-compiled and cached
- **Early Validation**: Quick rejection of obviously invalid inputs
- **Type Checking**: Efficient type detection and validation
- **Format-Specific Validation**: Tailored validation for different input formats

**Benchmark Example:**
```javascript
const kk_date = require('kk-date');

function benchmarkValidation() {
    const iterations = 10000;
    const validInputs = ['2024-08-23', '2024-08-23 10:30:45', new Date()];
    const invalidInputs = ['invalid-date', '2024-13-45', null];
    
    console.time('Validation Operations');
    for (let i = 0; i < iterations; i++) {
        // Test valid inputs
        validInputs.forEach(input => {
            kk_date.isValid(input);
            try {
                new kk_date(input).isValid();
            } catch (e) {}
        });
        
        // Test invalid inputs
        invalidInputs.forEach(input => {
            kk_date.isValid(input);
            try {
                new kk_date(input).isValid();
            } catch (e) {}
        });
    }
    console.timeEnd('Validation Operations');
}

benchmarkValidation();
```

## 🔧 Performance Optimization Strategies

### 1. Enable Caching

```javascript
const kk_date = require('kk-date');

// Enable caching at application startup
kk_date.caching({ status: true, defaultTtl: 3600 }); // 1 hour TTL

// Monitor cache performance
setInterval(() => {
    const stats = kk_date.caching_status();
    console.log('Cache stats:', {
        hitRate: stats.hitRate,
        size: stats.size,
        efficiency: stats.hits / (stats.hits + stats.misses)
    });
}, 60000); // Log every minute
```

### 2. Reuse Date Instances

```javascript
// ❌ Inefficient: Creating new instances repeatedly
function formatDatesSlowly(timestamps) {
    return timestamps.map(ts => new kk_date(ts).format('YYYY-MM-DD'));
}

// ✅ Efficient: Reuse instance where possible
function formatDatesFast(timestamps) {
    const date = new kk_date();
    return timestamps.map(ts => {
        date.date = new Date(ts);
        return date.format('YYYY-MM-DD');
    });
}
```

### 3. Pre-compile Format Strings

```javascript
// Define format constants to enable caching
const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm:ss';
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

function formatDate(date) {
    // These formats will be cached after first use
    return {
        date: date.format(DATE_FORMAT),
        time: date.format(TIME_FORMAT),
        datetime: date.format(DATETIME_FORMAT)
    };
}
```

### 4. Optimize Timezone Operations

```javascript
// ❌ Inefficient: Multiple timezone conversions mutating the same instance
function getTimesInMultipleZones(dateStr) {
    // This approach mutates the same date instance multiple times
    const date = new kk_date(dateStr);
    return {
        ny: new kk_date(dateStr).tz('America/New_York').format('HH:mm'),
        london: new kk_date(dateStr).tz('Europe/London').format('HH:mm'),
        tokyo: new kk_date(dateStr).tz('Asia/Tokyo').format('HH:mm')
    };
}

// ✅ Efficient: Batch timezone operations with separate instances
function getTimesInMultipleZonesFast(dateStr) {
    const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
    const results = {};
    
    timezones.forEach(tz => {
        const converted = new kk_date(dateStr).tz(tz);
        results[tz.split('/')[1].toLowerCase()] = converted.format('HH:mm');
    });
    
    return results;
}
```

### 5. Memory Management

```javascript
// Monitor memory usage in production
function monitorMemoryUsage() {
    const used = process.memoryUsage();
    console.log('Memory usage:', {
        rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + ' MB',
        heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + ' MB',
        heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
        external: Math.round(used.external / 1024 / 1024 * 100) / 100 + ' MB'
    });
}

// Clear cache periodically if needed
function manageCacheMemory() {
    const stats = kk_date.caching_status();
    if (stats.size > 1000) { // Arbitrary threshold
        kk_date.clearCache();
        console.log('Cache cleared due to size:', stats.size);
    }
}
```

## 📊 Running Your Own Benchmarks

### Using the Built-in Benchmark Scripts

```bash
# Run comprehensive benchmark against other libraries
npm run benchmark

# Run sequential 1000-day real-world benchmark
npm run benchmark2

# Or run directly
node benchmark.js   # Comprehensive benchmark
node benchmark2.js  # Sequential operations benchmark
```

### Latest Benchmark Results (1000 Sequential Days)

| Operation | kk-date | Moment.js | Day.js | Luxon | Performance |
|-----------|---------|-----------|--------|-------|--------------|
| **Date Creation & Formatting** | **287ms** | 644ms | 471ms | 559ms | **64% faster** than Day.js |
| **Time Operations** | **197ms** | 785ms | 421ms | 2280ms | **114% faster** than Day.js |
| **Timezone Conversions** | **336ms** | 1216ms | 14976ms | 2890ms | **43x faster** than Day.js |
| **Complex Operations** | **491ms** | 1486ms | 920ms | 2462ms | **87% faster** than Day.js |
| **Overall** | **1.39s** | 4.24s | 17.09s | 8.44s | **11x faster** than Day.js |

### Custom Benchmark Template

```javascript
const kk_date = require('kk-date');

function runBenchmark(name, testFunction, iterations = 10000) {
    console.log(`\nBenchmarking: ${name}`);
    
    // Warm up
    for (let i = 0; i < 100; i++) {
        testFunction();
    }
    
    // Measure
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        testFunction();
    }
    const end = process.hrtime.bigint();
    
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    const opsPerSecond = Math.round((iterations / duration) * 1000);
    
    console.log(`${iterations} iterations completed in ${duration.toFixed(2)}ms`);
    console.log(`${opsPerSecond.toLocaleString()} operations per second`);
}

// Example usage
runBenchmark('Date Creation', () => {
    new kk_date('2024-08-23 10:30:45');
});

runBenchmark('Date Formatting', () => {
    const date = new kk_date('2024-08-23 10:30:45');
    date.format('YYYY-MM-DD HH:mm:ss');
});

runBenchmark('Timezone Conversion', () => {
    const date = new kk_date('2024-08-23 10:30:45');
    date.tz('America/New_York');
});
```

## 🏆 Best Practices for Performance

### 1. Application Startup

```javascript
const kk_date = require('kk-date');

// Configure for optimal performance at startup
function configureKkDate() {
    // Enable caching
    kk_date.caching({ status: true, defaultTtl: 3600 });
    
    // Set default timezone
    kk_date.setTimezone('UTC');
    
    // Pre-warm common operations
    const warmupDate = new kk_date();
    warmupDate.format('YYYY-MM-DD');
    new kk_date().tz('America/New_York');
    new kk_date().add(1, 'days');
    
    console.log('kk-date configured for optimal performance');
}

configureKkDate();
```

### 2. High-Volume Operations

```javascript
// For processing large datasets
function processDateArray(dates) {
    // Enable caching for bulk operations
    const originalCaching = kk_date.caching_status().enabled;
    if (!originalCaching) {
        kk_date.caching({ status: true });
    }
    
    try {
        const results = dates.map(dateStr => {
            const date = new kk_date(dateStr);
            return {
                formatted: date.format('YYYY-MM-DD'),
                timestamp: date.getTime(),
                isWeekend: [0, 6].includes(new Date(date.date).getDay())
            };
        });
        
        return results;
    } finally {
        // Restore original caching state
        if (!originalCaching) {
            kk_date.caching({ status: false });
        }
    }
}
```

### 3. Production Monitoring

```javascript
// Monitor performance in production
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            operations: 0,
            totalTime: 0,
            errors: 0
        };
    }
    
    measure(operation) {
        const start = process.hrtime.bigint();
        
        try {
            const result = operation();
            this.metrics.operations++;
            return result;
        } catch (error) {
            this.metrics.errors++;
            throw error;
        } finally {
            const end = process.hrtime.bigint();
            this.metrics.totalTime += Number(end - start) / 1000000;
        }
    }
    
    getStats() {
        return {
            averageTime: this.metrics.totalTime / this.metrics.operations,
            operationsPerSecond: (this.metrics.operations / this.metrics.totalTime) * 1000,
            errorRate: this.metrics.errors / this.metrics.operations,
            totalOperations: this.metrics.operations
        };
    }
}

const monitor = new PerformanceMonitor();

// Use in your application
const result = monitor.measure(() => {
    const date = new kk_date('2024-08-23 10:30:45');
    return date.format('YYYY-MM-DD HH:mm:ss');
});

// Check performance periodically
setInterval(() => {
    console.log('Performance stats:', monitor.getStats());
}, 60000);
```

## 🔍 Troubleshooting Performance Issues

### Common Performance Bottlenecks

1. **Excessive Object Creation**
   ```javascript
   // ❌ Creating many objects
   dates.map(d => new kk_date(d).format('YYYY-MM-DD'))
   
   // ✅ Reuse where possible
   const formatter = new kk_date();
   dates.map(d => {
       formatter.date = new Date(d);
       return formatter.format('YYYY-MM-DD');
   })
   ```

2. **Uncached Timezone Operations**
   ```javascript
   // Enable caching for timezone-heavy operations
   kk_date.caching({ status: true, defaultTtl: 3600 });
   ```

3. **Memory Leaks in Long-Running Processes**
   ```javascript
   // Clear cache periodically in long-running processes
   setInterval(() => {
       if (kk_date.caching_status().size > 10000) {
           kk_date.clearCache();
       }
   }, 3600000); // Every hour
   ```

### Performance Debugging

```javascript
function debugPerformance() {
    const stats = kk_date.caching_status();
    const memUsage = process.memoryUsage();
    
    console.log('Performance Debug Info:', {
        cache: {
            enabled: stats.enabled,
            size: stats.size,
            hitRate: stats.hitRate,
            efficiency: stats.hits / (stats.hits + stats.misses || 1)
        },
        memory: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
        },
        recommendations: {
            enableCaching: !stats.enabled ? 'Enable caching for better performance' : null,
            clearCache: stats.size > 1000 ? 'Consider clearing cache' : null,
            memoryUsage: memUsage.heapUsed > 100 * 1024 * 1024 ? 'High memory usage detected' : null
        }
    });
}

// Run performance debugging
debugPerformance();
```

## 📈 Performance Comparison Guidelines

When comparing kk-date with other date libraries:

1. **Use Realistic Test Cases**: Test with your actual data patterns and operations
2. **Include Cache Warm-up**: Run operations multiple times to account for caching
3. **Test in Your Environment**: Performance varies by Node.js version and platform
4. **Measure What Matters**: Focus on operations you use most frequently
5. **Consider Total Cost**: Include memory usage, bundle size, and feature completeness

Remember: The best performance optimization is using the right tool for your specific use case and measuring actual performance in your production environment.