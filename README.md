# kk-date - Advanced JavaScript Date Library

[![npm version](https://badge.fury.io/js/kk-date.svg)](https://badge.fury.io/js/kk-date)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-499%20passed-brightgreen)](https://github.com/kentkartlab/kk-date)

A blazing-fast JavaScript date library with intelligent caching, automatic DST detection, and zero-config timezone handling. Perfect for high-performance applications, real-time systems, and data-intensive operations where speed and accuracy matter most.

## 🌟 Why Choose kk-date?

### Performance & Efficiency *(measured on Node.js 26; reproduced by CI, results vary)*
- **⚡ Lightning Fast** - Over 40x faster timezone operations than Day.js
- **🚀 ~80% Faster Overall** - Wins most scenarios vs Moment.js, Day.js, and Luxon (Day.js is faster in isolated "Time Operations")
- **💾 Memory Efficient** - Object pooling + LRU cache eviction keep long-running processes stable
- **⚙️ Smart Caching** - ~70% faster repeated operations with built-in caching

### Reliability & Safety
- **🛡️ Fail-Fast Design** - Invalid dates immediately throw errors, preventing silent bugs in production
- **🎯 Type Safety** - Rejects malformed dates instead of returning unexpected results
- **✅ Predictable Behavior** - Never continues with invalid dates, unlike libraries that return "Invalid Date"
- **🔒 Production Tested** - 499 comprehensive tests covering edge cases and DST transitions

### Features & Compatibility
- **🌍 Accurate Timezone Handling** - 95-99% faster timezone conversions with perfect accuracy
- **🧠 Zero-Config DST** - Automatic Daylight Saving Time detection without manual intervention
- **📊 Big Data Ready** - Handles 1M operations with 95% better performance than competitors
- **🌍 Production Proven** - Cross-platform compatibility with zero dependencies

## 📦 Installation

```bash
npm install kk-date
```

## 🚀 Quick Start

```javascript
const kk_date = require('kk-date');

// Enable caching for high-performance applications
kk_date.caching({ status: true, defaultTtl: 3600 });

// Create and format dates
const date = new kk_date('2024-08-23 10:30:00');
console.log(date.format('YYYY-MM-DD HH:mm:ss')); // 2024-08-23 10:30:00

// Safe error handling - catches invalid dates early!
try {
    const invalid = new kk_date('invalid-date'); // ❌ Throws error immediately
} catch (error) {
    console.log('Invalid date prevented!'); // ✅ Error caught, no silent bugs
}

// Pre-validate dates without throwing errors (the static isValid() requires a format template)
if (kk_date.isValid('2024-13-45', 'YYYY-MM-DD')) { // false - invalid month
    // Won't execute
}
if (kk_date.isValid('2024-08-23', 'YYYY-MM-DD')) { // true - valid date
    const safeDate = new kk_date('2024-08-23'); // ✅ Safe to create
}

// Zero-config timezone conversion with automatic DST detection.
// Note: a naive string like '2024-08-23 10:30:00' is parsed in the process's LOCAL timezone.
// The examples below assume the process timezone is UTC (run with TZ=UTC, or call
// kk_date.setTimezone('UTC')). Pass an absolute instant ('...Z') for identical results everywhere.
const nyTime = new kk_date('2024-08-23 10:30:00').tz('America/New_York');
console.log(nyTime.format('HH:mm')); // 06:30 (EDT - automatically detected)

const tokyoTime = new kk_date('2024-08-23 10:30:00').tz('Asia/Tokyo');
console.log(tokyoTime.format('HH:mm')); // 19:30 (JST)

// Lightning-fast date manipulation
const tomorrow = new kk_date('2024-08-23 10:30:00').add(1, 'days');
console.log(tomorrow.format('YYYY-MM-DD')); // 2024-08-24
```

## 📚 Documentation

### 📖 [Complete API Reference](docs/API-REFERENCE.md)
Comprehensive documentation of all available methods and properties.

### 🕐 [Timezone Guide](docs/TIMEZONE-GUIDE.md)
Detailed guide on timezone handling, DST support, and conversion examples.

### 📅 [Formatting Guide](docs/FORMATTING-GUIDE.md)
Complete list of supported date/time formats with examples.

### ⚙️ [Configuration Guide](docs/CONFIGURATION-GUIDE.md)
How to configure global settings, locales, and timezone preferences.

### ⚡ [Performance Guide](docs/PERFORMANCE.md)
Comprehensive benchmarks, optimization strategies, and performance monitoring.

### 🔧 [Advanced Usage](docs/ADVANCED-USAGE.md)
Advanced features, performance tips, and best practices.

### 🧪 [Testing Guide](docs/TESTING-GUIDE.md)
How to run tests and contribute to the project.

## 🌍 Timezone Accuracy & Reliability

### Why Timezone Accuracy Matters

Timezone handling is one of the most critical aspects of date libraries. Inconsistent timezone conversions can lead to:
- **Data corruption** in financial applications
- **Scheduling conflicts** in calendar systems
- **User confusion** in global applications
- **Production bugs** that are hard to detect

### kk-date vs Other Libraries

| Library | Timezone Accuracy | DST Handling | Cross-Platform Consistency | Configuration Required |
|---------|------------------|--------------|---------------------------|----------------------|
| **kk-date** | ✅ **Perfect** | ✅ **Automatic** | ✅ **Consistent** | ✅ **Zero Config** |
| Moment.js | ⚠️ **System Dependent** | ⚠️ **Manual Setup** | ❌ **Inconsistent** | ⚠️ **Complex Setup** |
| Day.js | ⚠️ **System Dependent** | ⚠️ **Plugin Required** | ❌ **Inconsistent** | ⚠️ **Plugin Setup** |

### Real-World Example

```javascript
// Test instant: an absolute UTC instant (ISO-8601 with 'Z') is unambiguous on every machine.
// (A naive string like '2024-08-23 10:00:00' would instead be parsed in the process's local
// timezone, so pass an absolute instant when you need identical results everywhere.)
const testDate = '2024-08-23T10:00:00.000Z';

// kk-date: absolute instant converts to the same wall-clock on every system
const kkDate = new kk_date(testDate).tz('America/New_York');
console.log(kkDate.format('YYYY-MM-DD HH:mm:ss'));
// Result: 2024-08-23 06:00:00 (identical on every system)

// Moment.js: requires the moment-timezone add-on for .tz()
const moment = require('moment-timezone');
const momentDate = moment(testDate);
console.log(momentDate.tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'));
// Result: 2024-08-23 06:00:00 (needs moment-timezone)

// Day.js: requires the utc + timezone plugins for .tz()
const dayjs = require('dayjs');
const dayjsDate = dayjs(testDate);
console.log(dayjsDate.tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'));
// Result: 2024-08-23 06:00:00 (needs dayjs timezone plugin)
```

### Cross-Platform Consistency

**kk-date** provides **identical results** across different systems:

```javascript
// Same code, same results on Windows, macOS, Linux, and Docker.
// Use an absolute instant (ISO-8601 with 'Z') so the value does not depend on the system timezone.
const baseTime = '2024-08-23T10:00:00.000Z';

// These results are identical on all platforms:
console.log(new kk_date(baseTime).tz('UTC').format('YYYY-MM-DD HH:mm:ss'));        // 2024-08-23 10:00:00
console.log(new kk_date(baseTime).tz('America/New_York').format('YYYY-MM-DD HH:mm:ss')); // 2024-08-23 06:00:00
console.log(new kk_date(baseTime).tz('Europe/London').format('YYYY-MM-DD HH:mm:ss'));    // 2024-08-23 11:00:00
console.log(new kk_date(baseTime).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'));       // 2024-08-23 19:00:00
```

### Automatic DST Detection

**kk-date** automatically handles Daylight Saving Time transitions:

```javascript
// DST transition dates - kk-date handles automatically.
// (Naive inputs below assume the process timezone is UTC; see the note above.)
const dstStart = new kk_date('2024-03-10 02:30:00'); // near DST start
const dstEnd = new kk_date('2024-11-03 02:30:00');   // near DST end

console.log(new kk_date('2024-03-10 02:30:00').tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'));
// Result: 2024-03-09 21:30:00 (EST, correctly adjusted)

console.log(new kk_date('2024-11-03 02:30:00').tz('America/New_York').format('YYYY-MM-DD HH:mm:ss'));
// Result: 2024-11-02 22:30:00 (EDT, correctly adjusted)
```

### Safety Comparison: kk-date vs Others

```javascript
// ❌ Moment.js & Day.js - Silent failures can cause production bugs
const momentDate = moment('invalid-date');
console.log(momentDate.isValid()); // false
console.log(momentDate.format('YYYY-MM-DD')); // 'Invalid date' - but continues!
// Risk: This string can propagate through your app causing unexpected behavior

// ✅ kk-date - Fail-fast approach prevents bugs
try {
    const kkDate = new kk_date('invalid-date'); // Throws immediately!
} catch (error) {
    // Handle error properly - no silent failures
    console.log('Date validation failed - handling error safely');
}
```

### Why Other Libraries Fail

**Moment.js and Day.js** have fundamental issues:

1. **System Timezone Dependency**: Results vary based on the server's timezone
2. **Manual DST Configuration**: Requires complex setup for DST handling
3. **Plugin Requirements**: Need additional plugins for timezone support
4. **Inconsistent Results**: Same code produces different results on different systems

**kk-date** solves these problems with:
- **Built-in timezone support** (no plugins needed)
- **Automatic DST detection** (no manual configuration)
- **Cross-platform consistency** (same results everywhere)
- **Zero configuration** (works out of the box)

## 🎯 Performance & Reliability

### 🚀 Intelligent Caching System (~70% Performance Boost)

```javascript
// Enable high-performance caching for massive speed improvements
kk_date.caching({ status: true, defaultTtl: 3600 });

// Real-world performance gains with caching:
// ✅ Timezone conversions: 95-99% faster (critical for global apps)
// ✅ Date formatting: 75% faster (essential for UI rendering)
// ✅ Complex operations: 80% faster (important for data processing)
// ✅ Memory efficient: < 10MB for 10,000 cached operations

// Monitor cache performance
const stats = kk_date.caching_status();
const hitRate = stats.totalHits > 0 ? (stats.totalHits / (stats.totalHits + stats.total) * 100).toFixed(1) : 0;
console.log('Cache hit rate:', hitRate + '%'); // Typically 99%+
console.log('Cache size:', stats.cacheSize + '/' + stats.maxCacheSize); // Current/Max
console.log('Performance gain:', '~70%'); // Representative measured improvement (varies)

// Handle millions of operations efficiently
for (let i = 0; i < 1000000; i++) {
    const date = new kk_date('2024-08-23 10:00:00');
    date.tz('America/New_York'); // First: 77ms, Cached: 20ms (74% faster!)
}
```

**When to Enable Caching:**
- 📊 Data processing pipelines with repeated date operations
- 🌍 Global applications with multiple timezone conversions
- ⚡ Real-time systems requiring sub-20ms response times
- 📈 Analytics dashboards with thousands of date calculations
- 🔄 APIs serving high-frequency date/time requests

### Zero-Config DST Handling
```javascript
// Automatic DST detection - no manual configuration needed
const summerTime = new kk_date('2024-08-23 10:00:00').tz('America/New_York'); // Automatically EDT
const winterTime = new kk_date('2024-12-23 10:00:00').tz('America/New_York'); // Automatically EST

console.log(summerTime.format('HH:mm')); // Summer time (EDT)
console.log(winterTime.format('HH:mm')); // Winter time (EST)
```

### Memory-Efficient Operations
```javascript
// Object pooling for high-frequency operations
const dates = [];
for (let i = 0; i < 10000; i++) {
    dates.push(new kk_date('2024-08-23 10:00:00'));
    // Memory usage remains constant due to object pooling
}

// Lazy loading - timezone data loaded only when needed
const date = new kk_date('2024-08-23 10:00:00');
// Timezone data not loaded until .tz() is called
```

### Date Manipulation
```javascript
const date = new kk_date('2024-08-23 10:30:00');

// Add/subtract time
date.add(2, 'hours');                   // Add 2 hours
date.add(-1, 'days');                   // Subtract 1 day
date.add(3, 'months');                  // Add 3 months

// Start/end of periods
date.startOf('months');                 // Start of month
date.endOf('weeks');                    // End of week
```

### Comparison Operations
```javascript
const date1 = new kk_date('2024-08-23');
const date2 = new kk_date('2024-08-25');

date1.isBefore(date2);                  // true
date1.isAfter(date2);                   // false
date1.isSame(date2);                    // false
// diff is measured as (other - this), so a later argument yields a positive result:
date1.diff(date2, 'days');              // 2
date2.diff(date1, 'days');              // -2
```

## 🔧 Configuration

```javascript
// Global configuration
kk_date.setTimezone('UTC');
kk_date.config({ locale: 'en', weekStartDay: 1 }); // Monday

// Instance-specific configuration
const date = new kk_date('2024-08-23');
date.config({ 
    timezone: 'America/New_York',
    locale: 'tr',
    weekStartDay: 0
});
```

## 📱 React Native & Hermes Support

kk-date is compatible with **React Native** using the **Hermes** JavaScript engine.

**Tested Environment:**
- Expo **54**
- React Native **0.81**
- Hermes engine enabled

### What Works Out of the Box

All core features work without any additional configuration:

- Date creation, formatting, and parsing
- `add`, `subtract`, `diff`, `startOf`, `endOf`
- `isBefore`, `isAfter`, `isSame`, `isBetween`
- Timezone conversions (`.tz()`)
- `fromNow`, `toNow` relative time
- Caching system

### Hermes Intl Compatibility

Hermes has a known limitation with `Intl.DateTimeFormat` — the `timeZoneName: 'longOffset'` option either splits the GMT offset across multiple parts or is not supported at all. kk-date automatically detects and handles this with a built-in fallback:

```javascript
// This works seamlessly on Hermes — no configuration needed
const date = new kk_date('2024-08-23 10:30:00');
const istanbul = date.tz('Europe/Istanbul');
console.log(istanbul.format('YYYY-MM-DD HH:mm')); // 2024-08-23 13:30
```

The fallback uses a date-comparison method to calculate timezone offsets when `longOffset` is unavailable, ensuring correct DST-aware results across all timezones.

### Installation (React Native)

```bash
npm install kk-date
```

No polyfills or additional packages required.

```javascript
// CommonJS (Metro bundler compatible)
const kk_date = require('kk-date');

const date = new kk_date('2024-08-23');
console.log(date.format('DD/MM/YYYY')); // 23/08/2024
```

---

## 🌍 Browser Support

- Chrome 60+ (basic functionality)
- Firefox 55+ (basic functionality)
- Safari 12+ (basic functionality)
- Edge 79+ (basic functionality)
- Internet Explorer 11+ (with polyfills)

**Advanced Features:**
- **Locale Configuration:** Chrome 74+, Firefox 75+, Safari 14.1+, Edge 79+
- **Relative Time Formatting:** Chrome 71+, Firefox 65+, Safari 14.1+, Edge 79+ (with fallback)

**Note:** Basic date operations work in older browsers, but locale configuration requires newer Intl APIs.

## 📊 Performance Benchmarks

> **Note:** All performance figures in this README come from our own benchmark suite on Node.js 26 and are **reproduced by CI on every PR** (the "Performance Benchmarks" job runs `benchmark.js` + `benchmark2.js` and uploads the results). They are **not guarantees** — results vary by workload, hardware, Node version, and caching. Reproduce locally with `node benchmark.js` / `node benchmark2.js`. kk-date wins most scenarios but not all (e.g. Day.js is faster in isolated "Time Operations").

### Real-World Sequential Operations (1000 days, 100 operations/day)

Our benchmark simulates real-world usage by processing 1000 sequential days with 100 operations per day. This reflects typical production scenarios where dates are processed in sequence rather than synthetic benchmarks.

**Run the benchmark yourself:**
```bash
node benchmark2.js
```

**Representative run (Node.js 26) — reproduced by CI on every PR (see the "Performance Benchmarks" job artifacts). Numbers vary run-to-run.** Totals are for 100,000 operations per scenario:

<!-- BENCH:readme-seq -->
| Operation | kk-date | Moment.js | Day.js | Luxon | vs Fastest Competitor |
|-----------|---------|-----------|--------|-------|-----------------------|
| **Date Creation & Formatting** | **284ms** | 667ms | 487ms | 627ms | **~72% faster** than Day.js |
| **Time Operations** | 439ms | 754ms | **357ms** | 1580ms | **~23% slower** than Day.js |
| **Timezone Conversions** | **304ms** | 1085ms | 12586ms | 2314ms | **~257% faster** than Moment |
| **Complex Operations** | **524ms** | 1318ms | 825ms | 1768ms | **~57% faster** than Day.js |
<!-- /BENCH:readme-seq -->

### Overall Performance Summary

kk-date wins the overall sequential run, though Day.js is faster in the isolated "Time Operations" scenario above.

<!-- BENCH:readme-overall -->
| Library | Total Time | Operations/sec | Performance |
|---------|------------|---------------|-------------|
| **kk-date** | **1.55s** | **257,958 ops/sec** | 🏆 **Winner** |
| Moment.js | 3.82s | 104,629 ops/sec | ~147% slower |
| Luxon | 6.29s | 63,598 ops/sec | ~306% slower |
| Day.js | 14.25s | 28,062 ops/sec | **~819% slower** |
<!-- /BENCH:readme-overall -->

### Memory & Bundle Size

Net heap delta after creating 100,000 date instances (from `node benchmark.js`). This metric is **dominated by GC timing**, so it is noisy and several libraries can show a *negative* net delta — it is not a unique kk-date property. Bundle sizes are the published package sizes.

<!-- BENCH:readme-memory -->
| Library | Heap Δ / 100k instances* | Bundle Size | DST Support |
|---------|--------------------------|-------------|-------------|
| **kk-date** | ~+4 MB | **15 KB** | **Built-in** |
| Moment.js | ~-3 MB* | 297 KB | Plugin required |
| Day.js | ~0 MB | 18.5 KB | Plugin required |
| Luxon | ~+4 MB | 71 KB | Built-in |
<!-- /BENCH:readme-memory -->

<sub>* GC-timing artifact — varies run-to-run and can be negative for multiple libraries; reproduce with `node benchmark.js`.</sub>

kk-date's real memory advantages come from **object pooling**, **LRU cache eviction**, and creating few intermediate objects — which keep long-running processes stable. The exact heap-delta number is not a guarantee.

```javascript
// Measurement methodology:
const before = process.memoryUsage().heapUsed;
// Create 100,000 date instances...
const after = process.memoryUsage().heapUsed;
console.log((after - before) / 1024 / 1024, 'MB'); // GC-dependent; can be negative
```

### Cache Performance Impact

**Without Cache vs With Cache (representative run):**
<!-- BENCH:readme-cache -->
- **~69% faster** repeated operations when cache is enabled
- Average operation time: ~67ms → ~21ms with cache
- Cache hit ratio: **100%** for repeated operations
<!-- /BENCH:readme-cache -->
- Memory overhead: Minimal (< 10MB for 10,000 cached items)

**Why Enable Caching:**
```javascript
// Enable for high-performance scenarios
kk_date.caching({ status: true, defaultTtl: 3600 });

// Perfect for:
// ✅ Repeated timezone conversions (95-99% faster)
// ✅ Frequent date formatting (75% faster)
// ✅ Large-scale data processing (handles 1M ops efficiently)
// ✅ Real-time applications (sub-20ms response times)
```

### Key Performance Advantages

- **⚡ ~80% faster** than the average of competing libraries (comprehensive benchmark)
- **🚀 95-99% faster** in timezone operations (critical for global apps)
- **📊 Big-data ready** - efficient for bulk/1M-operation workloads
- **💾 Stable memory** - object pooling + LRU eviction; net heap delta is GC-dependent (often negative)
- **⚙️ ~70% boost** with smart caching enabled
- **🌍 Over 40x faster** (≈4300%) than Day.js in timezone conversions
- **✅ Production tested** with 499 comprehensive tests

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Run tests in watch mode
npm test -- --coverage     # Run tests with coverage
```

### Running Benchmarks
```bash
node benchmark.js           # Run comprehensive benchmark suite
node benchmark2.js          # Run sequential 1000-day benchmark
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by modern date libraries like Moment.js and Day.js
- Built with performance and developer experience in mind
- Comprehensive timezone support using IANA timezone database

## 📞 Support
- 🐛 **Issues**: [GitHub Issues](https://github.com/kentkartlab/kk-date/issues)
- 📖 **Documentation**: [Full Documentation](docs/)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/kentkartlab/kk-date/discussions)

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. Use of the kk-date package is at your own risk. The maintainers and contributors do not guarantee that the package will function without errors or produce accurate results in all scenarios. In no event shall the authors or contributors be held liable for any damages, losses, or issues arising from the use of this package.

## 🚀 What's Next?

We're constantly working to improve kk-date! Here are some exciting features we're planning:

- **🌐 Web Workers Support** - Asynchronous date operations for better performance
- **📦 Tree Shaking** - Bundle size optimization for production builds
- **🔌 Plugin System** - Extensible architecture for custom functionality
- **⚡ Template Compilation** - Pre-compiled format strings for even faster formatting
- **🎯 Enhanced Caching** - More intelligent cache strategies for specific use cases

## 💡 Pro Tips

- **Enable caching** for applications with repeated timezone operations
- **Use instance configuration** for date-specific settings
- **Monitor cache statistics** in production for optimal performance
- **Test DST transitions** thoroughly in your application
- **Consider memory usage** for high-frequency operations

---

**Made with ❤️ for the JavaScript community**
