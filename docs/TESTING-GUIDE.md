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

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- test/timezone.test.js

# Run tests matching pattern
npm test -- --testPathPattern="timezone"

# Run tests with verbose output
npm test -- --verbose
```

### Test Environment Setup

```bash
# Install dependencies
npm install

# Install test dependencies
npm install --save-dev jest

# Run tests in different environments
NODE_ENV=test npm test
```

## Test Structure

### Test File Organization

```
test/
├── add.test.js                    # Addition operations
├── beforeAfter.test.js            # Before/after comparisons
├── format.test.js                 # Formatting functionality
├── fromNow.test.js                # Relative time calculations
├── other.test.js                  # Miscellaneous functionality
├── startEndOf.test.js             # Start/end of period operations
├── timezone.test.js               # Basic timezone functionality
├── validInvalid.test.js           # Date validation
├── weekStartDay.test.js           # Week start day functionality
├── user-timezone-scenarios.test.js # Real-world timezone scenarios
├── comprehensive-timezone-formats.test.js # All format templates
├── real-world-timezone.test.js    # Real-world timezone examples
└── cross-platform-timezone.test.js # Cross-platform compatibility
```

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
            }).toThrow('Invalid date format');
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
// Basic assertions
expect(date.format('YYYY-MM-DD')).toBe('2024-08-23');
expect(date.isValid()).toBe(true);
expect(date.getTime()).toBe(1724407200000);

// Array assertions
expect(['2024-08-23', '2024-08-24']).toContain(date.format('YYYY-MM-DD'));

// Object assertions
expect(date.getTimezoneInfo('America/New_York')).toEqual({
    timezone: 'America/New_York',
    offset: -14400000,
    isDST: true,
    abbreviation: 'EDT'
});

// Error assertions
expect(() => {
    new kk_date('invalid-date');
}).toThrow('Invalid date format');

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
    describe('Timezone Workflow', () => {
        test('should handle complete timezone workflow', () => {
            // Create date in UTC
            const utcDate = new kk_date('2024-08-23 10:00:00');
            utcDate.config({timezone: 'UTC'});

            // Convert to multiple timezones
            const nyTime = utcDate.tz('America/New_York');
            const tokyoTime = utcDate.tz('Asia/Tokyo');
            const londonTime = utcDate.tz('Europe/London');

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
                custom: date.format('DD MMMM YYYY, dddd')
            };

            expect(formats.date).toBe('2024-08-23');
            expect(formats.time).toBe('10:30:45');
            expect(formats.datetime).toBe('2024-08-23 10:30:45');
            expect(formats.iso).toBe('2024-08-23T10:30:45');
            expect(formats.custom).toBe('23 August 2024, Friday');
        });
    });
});
```

### Edge Case Tests

```javascript
describe('Edge Cases', () => {
    describe('DST Transitions', () => {
        test('should handle spring forward', () => {
            const dstDate = new kk_date('2024-03-10 02:00:00');
            const nyTime = dstDate.tz('America/New_York');
            expect(nyTime.format('HH:mm')).toBe('03:00'); // EDT
        });

        test('should handle fall back', () => {
            const dstDate = new kk_date('2024-11-03 02:00:00');
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
            }).toThrow('Invalid date format');
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
            const nonLeapYear = new kk_date('2023-02-29 10:00:00');
            expect(nonLeapYear.isValid()).toBe(false);
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

```javascript
describe('Memory Leak Tests', () => {
    test('should not leak memory with repeated operations', () => {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Perform many operations
        for (let i = 0; i < 1000; i++) {
            const date = new kk_date('2024-08-23 10:00:00');
            date.tz('America/New_York');
            date.format('YYYY-MM-DD HH:mm:ss');
            date.add(1, 'days');
            date.add(-1, 'hours');
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be minimal (less than 1MB)
        expect(memoryIncrease).toBeLessThan(1024 * 1024);
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

# Run tests with coverage
npm test -- --coverage

# Run specific test categories
npm test -- --testPathPattern="timezone"
npm test -- --testPathPattern="format"

# Check test coverage
npm test -- --coverage --coverageReporters=text
```

### Continuous Integration

The project uses GitHub Actions for continuous integration:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16, 18, 20]
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - run: npm ci
    - run: npm test
    - run: npm test -- --coverage
```

### Test Coverage Requirements

- **Minimum coverage**: 90% for all code
- **Critical paths**: 100% coverage for timezone and formatting functions
- **Error handling**: 100% coverage for error conditions
- **Edge cases**: Comprehensive coverage for boundary conditions

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
