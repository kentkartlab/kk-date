# Testing Guide

Complete guide to testing kk-date, including unit tests, integration tests, and contribution guidelines.

## Table of Contents

- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Test Categories](#test-categories)
- [Performance Testing](#performance-testing)
- [Contributing](#contributing)

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage (enforces the coverageThreshold in package.json)
npm run test:coverage
# or
npm test -- --coverage

# Run specific test file
npm test test/timezone.test.js
# or
npx jest test/timezone.test.js

# Run test files whose path matches a pattern
# (Jest 30 renamed --testPathPattern to --testPathPatterns)
npm test -- --testPathPatterns="timezone"

# Run tests whose name matches a pattern
npx jest test/timezone.test.js -t "should convert"

# Run tests with verbose output
npm test -- --verbose
```

### Test Environment Setup

```bash
# Install dependencies — Jest 30 and Biome are devDependencies (exact versions locked in
# package-lock.json), nothing else to install
npm ci        # or: npm install

# Node.js 22 or newer is required (package.json "engines")
node --version

# Run the suite with a different SYSTEM timezone, as CI does
TZ=America/New_York npm test
TZ=Asia/Kolkata npm test
```

## Test Structure

### Test File Organization (33 files, 1,426 tests)

```
test/
├── add.test.js                        # Addition operations
├── audit-fixes.test.js                # Audit locks: add(duration), weekStartDay 0 override, add(0) unit check, invalid-instance comparisons, numeric seconds/ms arguments, month-end clamping, instance timezone validation, calendar-aware diff
├── audit-timezone-info.test.js        # getTimezoneOffset cache (bounded, cached == fresh) and getTimezoneInfo/isDST hemisphere correctness
├── beforeAfter.test.js                # Before/after comparisons
├── cache-state-fixes.test.js          # Parse-cache keys and validity (forced templates, colliding texts, today-relative inputs, locale language), caching() does not keep the process alive, atomic config(), bounded caches
├── calendar-semantics.test.js         # Calendar semantics: diff/diff_range, isBetween(unit), add() amounts, set() day clamping, fromNow() rounding, valueOfLocal(), hour periods across offset changes, historical local mean time
├── comprehensive-timezone-formats.test.js # All format templates (24 combinations)
├── coverage-gaps.test.js              # Previously untested public API: isSameOrBefore/After, caching_flush, user timezone, diff is_decimal, duration units, valueOfLocal, isBetween units, convertToTimezone default source
├── cross-platform-timezone.test.js    # Cross-platform compatibility
├── dst-arithmetic.test.js             # DST-safe add/startOf/endOf/set via .tz() and the global timezone; add/set onto a repeated hour keep the original side (moment-timezone + Luxon rows, also on the system-zone fast path); every local midnight 2024-2026; global-timezone parsing of every wall-clock time around transitions
├── dynamic-format.test.js             # Dynamic template compiler (token combos, [bracket] literals, cache invalidation)
├── format-parity.test.js              # Byte-parity contract replayed from test/fixtures/format-parity.json
├── format-tokens.test.js              # Full moment/dayjs token vocabulary (YY, M, Q, DDD, weekday numbers, week-of-year, week-years, k/kk, fractional seconds, Z/z)
├── format.test.js                     # Formatting functionality (including overflow time)
├── fromNow.test.js                    # Relative time calculations
├── functions-coverage.test.js         # Coverage tests for functions.js utilities
├── hermes-fallback.test.js            # Hermes/React Native timezone fallback
├── index-coverage.test.js             # Coverage tests for index.js
├── nope-redis.test.js                 # Black-box tests of the vendored nope-redis cache (fake timers: TTL expiry, cleanup interval, LRU bookkeeping, hit/miss stats)
├── other.test.js                      # Miscellaneous functionality
├── parse-behavior-lock.test.js        # Constructor auto-detection lock: input → detected_format → instant
├── parsing-fixes.test.js              # Constructor format argument for every predefined template (incl. 2-digit years), ReDoS inputs, explicit zones checked against the engine itself, anchored text templates, other-language text + time, years 0-99, numeric inputs, locale month names, today-relative inputs, system-zone DST gaps
├── real-world-timezone.test.js        # Real-world timezone examples
├── report-fixes.test.js               # isValid legacy-regex parity corpus, strict-mode moment parity, mm:ss template, dynamic-template validation
├── startEndOf.test.js                 # Start/end of period operations
├── time-formatting.test.js            # Time-specific formatting tests
├── time-operations.test.js            # Date manipulation tests
├── time-parsing.test.js               # Various date/time parsing scenarios
├── timezone.test.js                   # Basic timezone functionality
├── user-timezone-scenarios.test.js    # Real-world timezone scenarios
├── validation-display-fixes.test.js   # Strict isValid vs moment strict, toLocale*() locale/timezone, getAvailableTimezones(), isDST() (moment definition), Hermes "24" midnight
├── validInvalid.test.js               # Date validation
├── weekStartDay.test.js               # Week start day functionality
└── helpers/run-in-zone.js             # runInZone(): runs a snippet in a child Node process with a fixed TZ
```

Run `npx jest --listTests` for the current list; the counts above were taken with `npx jest --silent`.

The `format-parity.json` fixture was generated from the pre-refactor (switch-case) formatter via
`scripts/generate-format-fixtures.js`. It is the byte-parity contract for formatter refactors —
do NOT regenerate it in the same change that intentionally alters formatter output.

### Independent oracles and pinned timezones

The bug-fix suites (`dst-arithmetic`, `parsing-fixes`, `cache-state-fixes`, `calendar-semantics`,
`validation-display-fixes`) do not take their expected values from kk-date itself:

- **Independent oracles.** Expected values come from moment / moment-timezone (constructor
  templates, strict `isValid`, `diff` fractions, `isDST`), Luxon (DST arithmetic — with two
  America/Havana rows hand-verified where Luxon is wrong) and `Intl.DateTimeFormat` (the local
  date/wall clock of every scanned midnight and transition).
- **Pinned system timezones.** Scenarios that depend on the *system* timezone (a UTC container
  configured for another zone, a DST gap of the system zone, "today" at a pinned `Date.now()`) run
  in a child Node process started with a fixed `TZ` (`runInZone()` in `test/helpers/run-in-zone.js`), so
  they give the same result on every machine. Everything else must pass under any system timezone —
  CI runs the whole suite under a matrix of system timezones.

When you add a test for a bug, follow the same rules: take the expected value from an independent
source, and never let it depend on the timezone of the machine running the suite.

### Test File Template

```javascript
const kk_date = require('../index');

describe('Feature Name', () => {
    // Setup before tests
    beforeEach(() => {
        // Reset global configuration
        kk_date.setTimezone('UTC');
        kk_date.config({ locale: 'en' });
    });

    // Cleanup after tests
    afterEach(() => {
        // Cleanup if needed
    });

    describe('Sub-feature', () => {
        test('should handle basic case', () => {
            const date = new kk_date('2024-08-23 10:00:00');
            expect(date.format('YYYY-MM-DD')).toBe('2024-08-23');
        });

        test('should handle edge case', () => {
            // Test edge cases
        });

        test('should throw error for invalid input', () => {
            expect(() => {
                new kk_date('invalid-date');
            }).toThrow('Invalid Date');
        });
    });
});
```

## Writing Tests

### Test Naming Conventions

```javascript
// Use descriptive test names
test('should format date in YYYY-MM-DD format', () => {
    // Test implementation
});

test('should convert timezone from UTC to America/New_York', () => {
    // Test implementation
});

test('should handle DST transition correctly', () => {
    // Test implementation
});

test('should throw error for invalid timezone', () => {
    // Test implementation
});
```

### Test Data Setup

```javascript
describe('Timezone Conversion', () => {
    // Naive strings such as '2024-08-23 10:00:00' are parsed in the GLOBAL timezone (by default the
    // machine's). Pin it, or the expected wall-clock values change with the TZ of the test machine.
    beforeEach(() => {
        kk_date.setTimezone('UTC');
    });

    // Define test data
    const testCases = [
        {
            input: '2024-08-23 10:00:00',
            timezone: 'America/New_York',
            expected: '06:00',
            description: 'UTC to EDT conversion'
        },
        {
            input: '2024-08-23 10:00:00',
            timezone: 'Asia/Tokyo',
            expected: '19:00',
            description: 'UTC to JST conversion'
        }
    ];

    testCases.forEach(({ input, timezone, expected, description }) => {
        test(`should convert ${description}`, () => {
            const date = new kk_date(input);
            const converted = date.tz(timezone);
            expect(converted.format('HH:mm')).toBe(expected);
        });
    });
});
```

### Assertion Examples

```javascript
// Inside a test, with kk_date.setTimezone('UTC') in beforeEach (see the template above)
const date = new kk_date('2024-08-23 10:00:00'); // 10:00 UTC

// Basic assertions
expect(date.format('YYYY-MM-DD')).toBe('2024-08-23');
expect(date.isValid()).toBe(true);
expect(date.getTime()).toBe(1724407200000);

// Array assertions
expect(['2024-08-23', '2024-08-24']).toContain(date.format('YYYY-MM-DD'));

// Object assertions (getTimezoneInfo also returns standardOffset & daylightOffset)
expect(date.getTimezoneInfo('America/New_York')).toEqual({
    timezone: 'America/New_York',
    offset: -14400000,
    isDST: true,
    abbreviation: 'EDT',
    standardOffset: -18000000,
    daylightOffset: -14400000
});

// Error assertions
expect(() => {
    new kk_date('invalid-date');
}).toThrow('Invalid Date');

// Async assertions
test('should handle async operations', async () => {
    const result = await someAsyncOperation();
    expect(result).toBeDefined();
});
```

## Test Categories

### Unit Tests

```javascript
describe('Unit Tests', () => {
    describe('Constructor', () => {
        test('should create date from string', () => {
            const date = new kk_date('2024-08-23 10:00:00');
            expect(date.isValid()).toBe(true);
        });

        test('should create date from Date object', () => {
            const jsDate = new Date('2024-08-23T10:00:00Z');
            const date = new kk_date(jsDate);
            expect(date.isValid()).toBe(true);
        });

        test('should create date from timestamp', () => {
            const timestamp = 1724407200000;
            const date = new kk_date(timestamp);
            expect(date.getTime()).toBe(timestamp);
        });
    });

    describe('Formatting', () => {
        test('should format with YYYY-MM-DD template', () => {
            const date = new kk_date('2024-08-23 10:00:00');
            expect(date.format('YYYY-MM-DD')).toBe('2024-08-23');
        });

        test('should format with custom template', () => {
            const date = new kk_date('2024-08-23 10:00:00');
            expect(date.format('DD/MM/YYYY')).toBe('23/08/2024');
        });
    });

    describe('Manipulation', () => {
        test('should add days', () => {
            const date = new kk_date('2024-08-23 10:00:00');
            date.add(1, 'days');
            expect(date.format('YYYY-MM-DD')).toBe('2024-08-24');
        });

        test('should subtract hours', () => {
            const date = new kk_date('2024-08-23 10:00:00');
            date.add(-2, 'hours');
            expect(date.format('HH:mm')).toBe('08:00');
        });
    });
});
```

### Integration Tests

```javascript
describe('Integration Tests', () => {
    // Naive strings are parsed in the global timezone: pin it so the expected values below
    // do not depend on the timezone of the machine running the tests.
    beforeEach(() => {
        kk_date.setTimezone('UTC');
    });

    describe('Timezone Workflow', () => {
        test('should handle complete timezone workflow', () => {
            // Parsed as 10:00 UTC (the global timezone). An instance .config({ timezone }) or .tz()
            // would only change the DISPLAY zone — it never reinterprets the input string.
            const utcDate = new kk_date('2024-08-23 10:00:00');

            // Convert to multiple timezones.
            // Use a fresh instance per conversion — .tz() mutates the instance it is called on.
            const nyTime = new kk_date('2024-08-23 10:00:00').tz('America/New_York');
            const tokyoTime = new kk_date('2024-08-23 10:00:00').tz('Asia/Tokyo');
            const londonTime = new kk_date('2024-08-23 10:00:00').tz('Europe/London');

            // Verify conversions
            expect(nyTime.format('HH:mm')).toBe('06:00');
            expect(tokyoTime.format('HH:mm')).toBe('19:00');
            expect(londonTime.format('HH:mm')).toBe('11:00');

            // Verify all represent same moment
            expect(utcDate.getTime()).toBe(nyTime.getTime());
            expect(utcDate.getTime()).toBe(tokyoTime.getTime());
            expect(utcDate.getTime()).toBe(londonTime.getTime());
        });
    });

    describe('Format Workflow', () => {
        test('should handle complete formatting workflow', () => {
            const date = new kk_date('2024-08-23 10:30:45.123');

            // Test various formats
            const formats = {
                date: date.format('YYYY-MM-DD'),
                time: date.format('HH:mm:ss'),
                datetime: date.format('YYYY-MM-DD HH:mm:ss'),
                iso: date.format('YYYY-MM-DDTHH:mm:ss'),
                custom: date.format('DD MMMM dddd, YYYY')
            };

            expect(formats.date).toBe('2024-08-23');
            expect(formats.time).toBe('10:30:45');
            expect(formats.datetime).toBe('2024-08-23 10:30:45');
            expect(formats.iso).toBe('2024-08-23T10:30:45');
            expect(formats.custom).toBe('23 August Friday, 2024');
        });
    });
});
```

### Edge Case Tests

```javascript
describe('Edge Cases', () => {
    describe('DST Transitions', () => {
        test('should handle spring forward', () => {
            // 07:00 UTC on 2024-03-10 is just after New York springs forward to EDT.
            const dstDate = new kk_date('2024-03-10T07:00:00.000Z');
            const nyTime = dstDate.tz('America/New_York');
            expect(nyTime.format('HH:mm')).toBe('03:00'); // EDT
        });

        test('should handle fall back', () => {
            // 06:00 UTC on 2024-11-03 is exactly when New York falls back to EST.
            const dstDate = new kk_date('2024-11-03T06:00:00.000Z');
            const nyTime = dstDate.tz('America/New_York');
            expect(nyTime.format('HH:mm')).toBe('01:00'); // EST
        });
    });

    describe('Invalid Inputs', () => {
        test('should handle null input', () => {
            expect(() => {
                new kk_date(null);
            }).toThrow();
        });

        test('should handle undefined input', () => {
            expect(() => {
                new kk_date(undefined);
            }).toThrow();
        });

        test('should handle empty string', () => {
            expect(() => {
                new kk_date('');
            }).toThrow();
        });

        test('should handle invalid date string', () => {
            expect(() => {
                new kk_date('not-a-date');
            }).toThrow('Invalid Date');
        });
    });

    describe('Boundary Values', () => {
        test('should handle year boundaries', () => {
            const newYear = new kk_date('2024-12-31 23:59:59');
            newYear.add(1, 'seconds');
            expect(newYear.format('YYYY')).toBe('2025');
        });

        test('should handle leap years', () => {
            const leapYear = new kk_date('2024-02-29 10:00:00');
            expect(leapYear.isValid()).toBe(true);
        });

        test('should handle non-leap years', () => {
            // Feb 29 in a non-leap year is NOT rejected — it rolls over to March 1 and is valid.
            const nonLeapYear = new kk_date('2023-02-29 10:00:00');
            expect(nonLeapYear.isValid()).toBe(true);
            expect(nonLeapYear.format('YYYY-MM-DD')).toBe('2023-03-01');
        });
    });
});
```

### Performance Tests

```javascript
describe('Performance Tests', () => {
    test('should handle large number of timezone conversions', () => {
        const startTime = Date.now();
        const date = new kk_date('2024-08-23 10:00:00');
        
        // Perform 1000 timezone conversions
        for (let i = 0; i < 1000; i++) {
            date.tz('America/New_York');
            date.tz('Asia/Tokyo');
            date.tz('Europe/London');
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete within 1 second
        expect(duration).toBeLessThan(1000);
    });

    test('should handle large number of format operations', () => {
        const startTime = Date.now();
        const date = new kk_date('2024-08-23 10:30:45');
        
        // Perform 1000 format operations
        for (let i = 0; i < 1000; i++) {
            date.format('YYYY-MM-DD HH:mm:ss');
            date.format('DD MMMM YYYY');
            date.format('HH:mm');
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete within 500ms
        expect(duration).toBeLessThan(500);
    });

    test('should handle memory usage efficiently', () => {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Create many date instances
        const dates = [];
        for (let i = 0; i < 10000; i++) {
            dates.push(new kk_date('2024-08-23 10:00:00'));
        }
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
});
```

## Performance Testing

### Benchmark Tests

```javascript
describe('Benchmarks', () => {
    test('timezone conversion performance', () => {
        const iterations = 10000;
        const date = new kk_date('2024-08-23 10:00:00');
        
        const startTime = process.hrtime.bigint();
        
        for (let i = 0; i < iterations; i++) {
            date.tz('America/New_York');
        }
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        const operationsPerSecond = (iterations / duration) * 1000;
        
        console.log(`Timezone conversions: ${operationsPerSecond.toFixed(0)} ops/sec`);
        
        // Should handle at least 1000 ops/sec
        expect(operationsPerSecond).toBeGreaterThan(1000);
    });

    test('formatting performance', () => {
        const iterations = 10000;
        const date = new kk_date('2024-08-23 10:30:45');
        
        const startTime = process.hrtime.bigint();
        
        for (let i = 0; i < iterations; i++) {
            date.format('YYYY-MM-DD HH:mm:ss');
        }
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        const operationsPerSecond = (iterations / duration) * 1000;
        
        console.log(`Format operations: ${operationsPerSecond.toFixed(0)} ops/sec`);
        
        // Should handle at least 5000 ops/sec
        expect(operationsPerSecond).toBeGreaterThan(5000);
    });
});
```

### Memory Leak Tests

A heap delta is only meaningful with a forced garbage collection. Without it the number is
GC-timing noise (in our runs, the 100,000-iteration loop below reported anything from about
−35 MB to +8 MB). Run memory tests with `global.gc` exposed, e.g. for a `test/memory.test.js`
containing the test below:

```bash
node --expose-gc node_modules/.bin/jest test/memory.test.js
```

```javascript
describe('Memory Leak Tests', () => {
    test('should not grow the heap with repeated operations', () => {
        const run = (iterations) => {
            for (let i = 0; i < iterations; i++) {
                const date = new kk_date('2024-08-23 10:00:00');
                date.tz('America/New_York');
                date.format('YYYY-MM-DD HH:mm:ss');
                date.add(1, 'days');
                date.add(-1, 'hours');
            }
        };

        // Warm up first: lazily built name tables, Intl formatters and cache entries are
        // one-time costs, not leaks.
        run(1000);
        global.gc?.();
        const initialMemory = process.memoryUsage().heapUsed;

        run(100000);
        global.gc?.();
        const memoryIncrease = process.memoryUsage().heapUsed - initialMemory;

        if (!global.gc) {
            // Without a forced GC the delta is indicative only — report it, don't assert on it.
            console.log(`Heap delta (no forced GC): ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
            return;
        }

        // With a forced GC, 100,000 iterations after the warm-up grow the heap by well under
        // 1 MB (≈0.06 MB measured); a leak would grow with the iteration count.
        expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024);
    });
});
```

## Contributing

### Adding New Tests

When adding new functionality, follow these guidelines:

1. **Create test file**: Add a new test file in the `test/` directory
2. **Follow naming convention**: Use descriptive names ending with `.test.js`
3. **Include all scenarios**: Test happy path, edge cases, and error conditions
4. **Add performance tests**: Include performance benchmarks for new features
5. **Update documentation**: Update relevant documentation files

### Test File Template

```javascript
const kk_date = require('../index');

describe('New Feature Name', () => {
    beforeEach(() => {
        // Reset global configuration
        kk_date.setTimezone('UTC');
        kk_date.config({ locale: 'en' });
    });

    describe('Basic Functionality', () => {
        test('should work with valid input', () => {
            // Test implementation
        });

        test('should handle edge cases', () => {
            // Test edge cases
        });
    });

    describe('Error Handling', () => {
        test('should throw error for invalid input', () => {
            expect(() => {
                // Invalid operation
            }).toThrow('Expected error message');
        });
    });

    describe('Performance', () => {
        test('should perform efficiently', () => {
            const startTime = Date.now();
            
            // Perform operation multiple times
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(100); // Should complete within 100ms
        });
    });
});
```

### Running Tests Before Committing

```bash
# Run all tests
npm test

# Run tests with coverage (fails if the coverageThreshold in package.json is not met)
npm run test:coverage

# Run specific test categories (file path patterns)
npm test -- --testPathPatterns="timezone"
npm test -- --testPathPatterns="format"

# Check test coverage (text report only)
npm test -- --coverage --coverageReporters=text

# Lint (CI runs this too); auto-fix lint and formatting issues
npm run lint
npm run lint:fix

# Run the suite under another system timezone, as CI does
TZ=Pacific/Auckland npm test
```

### Continuous Integration

Pull requests to `main` and `dev` run `.github/workflows/pr-checks.yml` (GitHub Actions). Its jobs:

| Job | What it runs |
|-----|--------------|
| **Lint** | `npm run lint` (Biome) on Node.js 26 |
| **Unit tests** | `npm run test` on Node.js 22 and 24, `npm run test:coverage` on Node.js 26 (enforces the coverage thresholds); the supported range is Node.js 22+ |
| **Multi-Timezone Tests** | `npm run test` on Node.js 26, once per entry of a matrix of system timezones (`TZ=<zone>`) |
| **Hermes/React Native Fallback Tests** | `npx jest hermes-fallback`, then the same file under several system timezones |
| **Hermes/React Native Simulation Test** | `node -e` scripts that simulate an engine without `timeZoneName: 'longOffset'` support (part missing, constructor throwing, empty result) and check `getTimezoneOffset`, `startOf`/`endOf` and global-timezone configs |
| **All checks passed** | A single gate that fails if any job above failed, was cancelled or was skipped (the job to require in branch protection) |

The Node.js 26 unit-test job runs `npm run test:coverage`, so a pull request that drops coverage
below the thresholds fails; run `npm run test:coverage` locally before opening one. A newer push to
the same pull request cancels the checks still running for the previous push.

Releases (`.github/workflows/publish.yml`, on every push to `main`) install, run the test suite
again on the exact commit, and only then publish to npm (see [VERSIONING.md](VERSIONING.md)).

Benchmarks are not part of the PR checks: the separate **Update Benchmark Docs** workflow
(`.github/workflows/update-benchmarks.yml`) runs the tests and both benchmarks on pushes to `dev`
that change JavaScript (or on manual dispatch) and refreshes the auto-generated performance
tables in `README.md` and `docs/PERFORMANCE.md`.

### Test Coverage Requirements

`package.json` sets a global Jest `coverageThreshold`, enforced whenever coverage is collected
(`npm run test:coverage` / `npm test -- --coverage`); Jest fails the run if any metric falls
below it:

| Metric | Enforced minimum | Measured (33 files, 1,426 tests) |
|--------|------------------|----------------------------------|
| Statements | 88% | 91.83% |
| Branches | 85% | 88.81% |
| Functions | 95% | 97.30% |
| Lines | 88% | 91.76% |

Coverage is collected from the four runtime files (`index.js`, `functions.js`, `constants.js`,
`nope-redis.js`). New code should come with tests that keep the measured numbers from dropping:
cover the happy path, the error conditions (kk-date throws instead of returning invalid values)
and the boundary cases (DST transitions, month ends, leap years, year boundaries).

### Reporting Issues

When reporting test failures:

1. **Include test output**: Provide complete test output with error messages
2. **Specify environment**: Include Node.js version, OS, and environment details
3. **Reproduce steps**: Provide steps to reproduce the issue
4. **Expected vs actual**: Clearly state expected and actual behavior
5. **Minimal example**: Provide minimal code example that reproduces the issue

### Code Review Checklist

When reviewing test code:

- [ ] Tests cover all functionality
- [ ] Tests include edge cases
- [ ] Tests handle error conditions
- [ ] Tests are readable and well-documented
- [ ] Tests follow naming conventions
- [ ] Tests are efficient and don't take too long
- [ ] Tests don't have side effects
- [ ] Tests are independent and can run in any order
