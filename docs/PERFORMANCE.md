# Performance Guide

## 🚀 Performance Overview

kk-date is designed for speed and efficiency, featuring intelligent caching, memory optimization, and automatic DST handling. This guide covers performance optimization strategies and provides guidance for benchmarking your specific use cases.

**Important Note:** Performance can vary significantly based on your environment, Node.js version, operating system, and specific use patterns. The benchmarks and optimizations described here are general guidelines. For accurate performance metrics relevant to your application, please run benchmarks in your target environment.

## ⚡ Performance Features

### Memory Management (can show negative net usage)

> Net memory delta is a **GC-timing artifact**, not a guarantee — from run to run it can be **positive or negative**, and **several other libraries (e.g. Luxon) also show negative values**. It depends on workload, Node version, and GC behavior. Measure with `node benchmark.js`.

In our benchmarks kk-date can report **negative net memory usage**. That only means a garbage collection happened to run during the measured window — it is not a property you can rely on.

**What actually keeps memory stable:**
- **Bounded caches**: every internal cache has a fixed size limit and cannot grow without bound in a long-running process (details below)
- **Few intermediate objects**: auto-detection dispatches on the input's shape (length and separator characters) to char-code parsers for the numeric formats, and derived format fields (week, day of year, offsets) are computed with integer math
- **No object pooling**: kk-date does not pool or recycle objects; every `new kk_date()` is an ordinary allocation, and `add()`/`set()`/`startOf()`/`endOf()`/`tz()` mutate the instance in place instead of returning a copy

**Benefits for your application:**
- ✅ **No unbounded cache growth** — cache memory is capped no matter how long the process runs
- ✅ **Suited to long-running apps** — no manual cache maintenance required
- ✅ **Low GC pressure** on repeated operations

### Intelligent Multi-Level Caching System

kk-date uses several caches. All of them are bounded; only the opt-in nope-redis layer evicts least-recently-used entries — the others are **cleared wholesale** when they reach their limit:

- **Formatter Results Cache** (always on): finished `format()` strings per template, keyed by timestamp + display configuration; cleared when it exceeds 10,000 entries
- **Compiled Templates** (always on): each format template is compiled once into flat parts; cleared when it exceeds 1,000 entries
- **Converter Results Cache** (always on): date-component extraction results; cleared when it exceeds 10,000 entries
- **Timezone Offset Cache** (always on, no TTL): offsets keyed by exact instant, plus a per-zone map of UTC days verified to have a constant offset; cleared when it exceeds 10,000 entries
- **Intl.DateTimeFormat caches** (always on): formatter instances keyed by timezone/locale, 500 entries per cache (cleared when full)
- **Name tables** (always on): month/weekday name tables for parsing are built lazily on first use
- **nope-redis layer** (opt-in via `kk_date.caching({ status: true })`): memoizes constructor parse results for repeated input strings and locale name tokens (`dddd`, `MMMM`, …); entries expire after `defaultTtl` seconds (default 1300), and once it holds more than 10,000 entries the least recently used 20% are evicted

```javascript
const kk_date = require('kk-date');

// Enable the opt-in nope-redis layer
kk_date.caching({ status: true, defaultTtl: 3600 });

// Check cache statistics (nope-redis layer)
const stats = kk_date.caching_status();
const lookups = stats.totalHits + stats.totalMisses;
const hitRate = lookups > 0 ? ((stats.totalHits / lookups) * 100).toFixed(1) : '0.0';
console.log('Cache hit rate:', hitRate + '%');
console.log('Cache size:', stats.cacheSize, '/', stats.maxCacheSize);
```

### Timezone Conversion Performance

**Key Optimization Features:**

- **Engine timezone data**: offsets and DST rules come from the JavaScript engine's `Intl` (ICU) data — no timezone database is bundled or downloaded
- **System-zone fast path**: offsets of the system timezone (and UTC) come from the native `Date` offset, without an `Intl` call
- **Offset caching**: other zones' offsets are cached per instant, and once a UTC day is verified to have a constant offset, the rest of that day is served from a per-zone day map without asking `Intl` again
- **DST-correct arithmetic**: `add`/`set`/`startOf`/`endOf` results are resolved at their own instant — a time skipped by a DST gap moves forward by the gap, a repeated time keeps the side of the change the original instant was on (or, when parsed, is the earlier instant)

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

- **Compiled Templates**: every template string is compiled once into flat token/literal parts and cached (up to 1,000 templates), so custom token combinations cost the same as predefined ones
- **Result Cache**: repeating `format()` with the same template, instant and display configuration is a single `Map` lookup (up to 10,000 results)
- **Integer Math**: week numbers, day of year, weekday numbers and UTC offsets are computed without `Intl`
- **Cached Intl Formatters**: month/weekday names (`MMMM`, `dddd`, …) and zone names (`z`, `zzz`) come from `Intl.DateTimeFormat` instances cached per locale/timezone; with `caching({ status: true })` the name strings are memoized as well

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
        // Templates are compiled dynamically — any token combination works directly:
        testDate.format('dddd, DD MMMM YYYY HH:mm');
    }
    console.timeEnd('Date Formatting');
}

benchmarkFormatting();
```

### Constructor Performance

**Optimization Features:**

- **Shape-Based Detection**: auto-detection dispatches on the input's length and separator characters straight to the matching parser instead of trying formats one by one
- **Char-Code Validation**: numeric predefined templates are checked by hand-written char-code validators; text templates (month/weekday names) use anchored, linear-time patterns
- **Type Fast Paths**: numbers (Unix seconds/milliseconds), `Date` objects and kk-date instances skip string parsing entirely (cloning an instance is cheaper than parsing its string again)
- **Optional Parse Cache**: with `caching({ status: true })`, repeated input strings are served from the nope-redis layer (bare times such as `'14:30'` and bare weekday names are never cached; a parse that depends on today's date, such as `'15 March'`, is reused only on the same day, and one that resolved month/weekday names only under the same global locale language)

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

- **In-Place Modifications**: `add()`, `set()`, `startOf()` and `endOf()` mutate the instance and return it (chainable, no copies)
- **Absolute Units**: seconds, minutes and hours are exact durations added to the timestamp
- **Calendar Units**: days, weeks, months and years are applied to the wall clock in the instance/global timezone and resolved at the result's own instant, so DST transitions and month ends are handled (Jan 31 + 1 month → Feb 29)

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

- **Direct Timestamp Comparison**: `isBefore`/`isAfter`/`isSame`/… compare millisecond timestamps
- **No Parsing for Instances**: kk-date instances, `Date` objects and numbers are compared without string parsing; strings are parsed with the constructor's rules
- **Calendar Units Only Where Needed**: `diff()` in days/weeks/months/years and `isBetween(a, b, unit)` read the calendar in the instance's timezone; seconds/minutes/hours use elapsed time

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

- **Char-Code Validators**: predefined templates are validated by hand-written char-code validators (bit-for-bit equal to the legacy regexes in the default, non-strict mode)
- **Compiled Dynamic Templates**: any other display-token template is compiled into a validator once and memoized (up to 1,000 templates)
- **Linear Time**: text templates were audited against adversarial (ReDoS) inputs, and inputs longer than 256 characters are rejected up front for dynamic templates
- **No Exceptions for Bad Input**: the static `kk_date.isValid()` returns `false` for non-string input (e.g. `null`, a `Date`) instead of throwing

**Benchmark Example:**
```javascript
const kk_date = require('kk-date');

function benchmarkValidation() {
    const iterations = 10000;
    const validInputs = ['2024-08-23', '2024-08-23 10:30:45', new Date()];
    const invalidInputs = ['invalid-date', '2024-13-45', null];
    
    console.time('Validation Operations');
    for (let i = 0; i < iterations; i++) {
        // The static isValid() REQUIRES a format template (otherwise it throws 'Invalid template !').
        // Test valid inputs
        validInputs.forEach(input => {
            kk_date.isValid(input, 'YYYY-MM-DD');
            try {
                new kk_date(input).isValid();
            } catch (e) {}
        });
        
        // Test invalid inputs
        invalidInputs.forEach(input => {
            kk_date.isValid(input, 'YYYY-MM-DD');
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

`kk_date.caching({ status: true })` turns on the opt-in nope-redis layer: it memoizes constructor parse
results for repeated input strings and locale name tokens. The formatter, template, converter and
timezone-offset caches are always on. The measured effect is in the auto-generated
[Key Performance Metrics](#key-performance-metrics) below — measure your own workload too.

```javascript
const kk_date = require('kk-date');

// Enable caching at application startup
kk_date.caching({ status: true, defaultTtl: 3600 }); // 1 hour TTL

// Monitor cache performance
setInterval(() => {
    const stats = kk_date.caching_status();
    const lookups = stats.totalHits + stats.totalMisses;
    const hitRate = lookups > 0 ? ((stats.totalHits / lookups) * 100).toFixed(1) : '0.0';
    console.log('Cache stats:', {
        hitRate: hitRate + '%',
        size: stats.cacheSize,
        totalHits: stats.totalHits,
        totalMisses: stats.totalMisses
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
// Every distinct template string is compiled once and cached (whether or not it is a constant);
// constants just keep the templates consistent across the code base
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
// ❌ Wrong: .tz() mutates the instance and returns it, so all three variables are the SAME
// object and every format() shows the last zone that was set (Tokyo)
function getTimesInMultipleZonesWrong(dateStr) {
    const date = new kk_date(dateStr);
    const ny = date.tz('America/New_York');
    const london = date.tz('Europe/London');
    const tokyo = date.tz('Asia/Tokyo');
    return { ny: ny.format('HH:mm'), london: london.format('HH:mm'), tokyo: tokyo.format('HH:mm') };
}

// ✅ Correct and fast: parse once, then give every zone its own clone
// (cloning an instance is cheaper than parsing the string again)
function getTimesInMultipleZones(dateStr) {
    const base = new kk_date(dateStr);
    const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
    const results = {};

    timezones.forEach((tz) => {
        results[tz.split('/')[1].toLowerCase()] = new kk_date(base).tz(tz).format('HH:mm');
    });

    return results;
}

// With kk_date.setTimezone('UTC'):
getTimesInMultipleZonesWrong('2024-08-23 10:00:00'); // { ny: '19:00', london: '19:00', tokyo: '19:00' }
getTimesInMultipleZones('2024-08-23 10:00:00');      // { new_york: '06:00', london: '11:00', tokyo: '19:00' }
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

// The caches are bounded (nope-redis: 10,000 entries with LRU eviction), so flushing is never
// needed to prevent a leak — only to release memory earlier than the limits would
function manageCacheMemory() {
    const stats = kk_date.caching_status();
    if (stats.cacheSize > 1000) { // your own, lower threshold
        kk_date.caching_flush(); // empties the nope-redis store (hit/miss counters are kept)
        console.log('Cache cleared due to size:', stats.cacheSize);
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

### Benchmark Results (representative run — refreshed by CI when JavaScript changes on `dev`)

#### Sequential Operations (1000 days, 100 ops/day — 100,000 ops per scenario)

<!-- BENCH:perf-seq -->
| Operation | kk-date | Moment.js | Day.js | Luxon | vs Fastest Competitor |
|-----------|---------|-----------|--------|-------|-----------------------|
| **Date Creation & Formatting** | **148ms** | 1163ms | 768ms | 1026ms | **~81% less time (5.2x faster)** than Day.js |
| **Time Operations** | **188ms** | 1304ms | 635ms | 2910ms | **~70% less time (3.4x faster)** than Day.js |
| **Timezone Conversions** | **462ms** | 3385ms | 19514ms | 4586ms | **~86% less time (7.3x faster)** than Moment |
| **Complex Operations** | **254ms** | 2555ms | 1271ms | 3056ms | **~80% less time (5.0x faster)** than Day.js |
| **Overall** | **1.05s** | 8.41s | 22.19s | 11.58s | **~21.1x faster** than Day.js |
<!-- /BENCH:perf-seq -->

#### Key Performance Metrics

*Measured in our benchmark suite on Node.js 26. The tables and bullets between the `BENCH` markers are regenerated by the "Update Benchmark Docs" workflow (`scripts/update-benchmark-docs.js`) on pushes to `dev` that change JavaScript — they are not part of the PR checks. These are not guarantees — results vary by workload, hardware, and Node version. Reproduce them with `node benchmark.js` / `node benchmark2.js`.*

<!-- BENCH:perf-metrics -->
- **~95% less time** on average vs competing libraries (comprehensive benchmark)
- **up to ~98% less time** in timezone operations
- **~30% less time** with caching enabled
- **kk-date wins every scenario** in the current benchmark run
- **Net memory delta is GC-dependent** (often negative for several libraries); bounded caches with automatic eviction keep long-running processes stable
- **Near-100% cache hit rate** for repeated operations
<!-- /BENCH:perf-metrics -->

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
    const originalCaching = kk_date.caching_status().status;
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

2. **Re-parsing the Same Strings**
   ```javascript
   // Timezone offsets, compiled templates and format results are cached automatically.
   // The opt-in layer additionally memoizes constructor parses of repeated input strings
   // and locale name tokens — measure whether your workload benefits:
   kk_date.caching({ status: true, defaultTtl: 3600 });
   ```

3. **Memory in Long-Running Processes**
   ```javascript
   // Nothing to do: every cache is bounded (nope-redis: TTL expiry, and the least recently
   // used 20% are evicted once it holds more than 10,000 entries; the internal caches are
   // cleared wholesale at their limits), so caching_status().cacheSize stays around
   // caching_status().maxCacheSize at most. Flush only to release memory early:
   kk_date.caching_flush();
   ```

### Performance Debugging

```javascript
function debugPerformance() {
    const stats = kk_date.caching_status();
    const memUsage = process.memoryUsage();
    
    console.log('Performance Debug Info:', {
        cache: {
            status: stats.status,
            cacheSize: stats.cacheSize || 0,
            totalHits: stats.totalHits || 0,
            totalMisses: stats.totalMisses || 0,
            hitRate: stats.totalHits + stats.totalMisses > 0
                ? ((stats.totalHits / (stats.totalHits + stats.totalMisses)) * 100).toFixed(1) + '%'
                : '0%'
        },
        memory: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
        },
        recommendations: {
            enableCaching: !stats.status ? 'Enable caching for better performance' : null,
            clearCache: stats.cacheSize > 1000 ? 'Consider clearing cache' : null,
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