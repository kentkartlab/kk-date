# Contributing Guide

Thank you for your interest in contributing to kk-date! This guide will help you get started with contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

- Node.js 22 or higher (`engines` in `package.json`; CI tests Node.js 22, 24 and 26)
- npm (the repository's lockfile is `package-lock.json`; CI installs with `npm ci`)
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/kk-date.git
   cd kk-date
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/kentkartlab/kk-date.git
   ```

## Development Setup

### Install Dependencies

```bash
# Install dependencies (devDependencies included: Jest 30, Biome, and the benchmark
# competitors dayjs / luxon / moment-timezone). The library itself has zero runtime dependencies.
npm ci        # or: npm install
```

### Development Scripts

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage (enforces the coverageThreshold in package.json)
npm run test:coverage

# Run linting (Biome)
npm run lint

# Run linting and formatting with auto-fix (npx biome check --write)
npm run lint:fix

# Check formatting (Biome)
npm run format

# Benchmarks against Moment.js, Day.js and Luxon (slow)
npm run benchmark
npm run benchmark2
```

There is no build step: the package ships the source files `index.js`, `functions.js`,
`constants.js`, `nope-redis.js` and `index.d.ts` as they are.

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write your code
   - Add tests for new functionality
   - Update documentation

3. **Test your changes**:
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a pull request** on GitHub

## Code Style

### JavaScript Style Guide

Formatting and linting are done by [Biome](https://biomejs.dev/), configured in `biome.json` —
let the tool format the code instead of formatting by hand:

- Tab indentation
- Single quotes for strings
- Semicolons at the end of statements
- Line width: 150 characters
- Trailing commas in multi-line literals and calls; parentheses around arrow-function parameters
- CommonJS modules (`require` / `module.exports`)
- Zero runtime dependencies: only devDependencies may be added
- Lint: Biome's recommended rules plus the overrides in `biome.json` (`noUndeclaredVariables` is an error)

Run `npm run lint:fix` (`npx biome check --write`) before committing: it applies safe lint fixes,
formats the code and organizes imports. CI runs `npm run lint`.

### Code Formatting

```javascript
// Good: what Biome produces (tabs, single quotes, semicolons)
const kk_date = require('kk-date');

function formatDate(dateString) {
	const date = new kk_date(dateString);
	return date.format('YYYY-MM-DD');
}

// Bad: double quotes, missing semicolons, space indentation
const kk_date = require("kk-date")

function formatDate (dateString) {
  const date = new kk_date(dateString)
  return date.format("YYYY-MM-DD")
}
```

### File Organization

- **Source files**: Repository root (`index.js`, `functions.js`, `constants.js`, `nope-redis.js`) plus the type definitions in `index.d.ts`
- **Test files**: `test/` directory (fixtures in `test/fixtures/`)
- **Documentation**: `docs/` directory; user-facing changes also go into `CHANGELOG.md`
- **Benchmarks**: `benchmark.js` and `benchmark2.js` in the repository root
- **Maintenance scripts**: `scripts/` (format-fixture generator, benchmark-docs updater)

### Naming Conventions

Follow the naming of the surrounding code:

- **Files**: kebab-case for new files (`dst-arithmetic.test.js`)
- **Functions**: camelCase (`parseWithTimezone`, `getTimezoneOffset`)
- **Module-level caches and configuration objects**: snake_case (`global_config`, `timezone_cache`)
- **Classes**: PascalCase (`KkDate`)
- **Constants**: UPPER_SNAKE_CASE (`INTL_CACHE_LIMIT`, `MAX_CACHE_SIZE`)
- **Public API names are fixed**: existing exports such as `caching_status` or `diff_range` keep their names
- **Test files**: End with `.test.js`

## Testing

### Writing Tests

All new functionality must include tests. Follow these guidelines:

1. **Test file structure**:
   ```javascript
   const kk_date = require('../index');

   describe('Feature Name', () => {
   	beforeEach(() => {
   		// Reset global configuration
   		kk_date.setTimezone('UTC');
   		kk_date.config({ locale: 'en' });
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

2. **Test categories**:
   - **Unit tests**: Test individual functions and methods
   - **Integration tests**: Test how components work together
   - **Edge case tests**: Test boundary conditions and error cases
   - **Performance tests**: Test performance characteristics

3. **Test coverage**: `package.json` sets a global Jest `coverageThreshold` — statements 88%,
   branches 85%, functions 95%, lines 88% — which Jest enforces whenever coverage is collected
   (`npm run test:coverage`), and the Node.js 26 CI job runs exactly that. The suite currently
   measures about 91% statements, 88% branches, 97% functions and 91% lines; new code should not
   lower these numbers.

4. **Expected values**: take them from an independent source (moment / moment-timezone, Luxon or
   `Intl`), not from kk-date's own output, and make tests pass under any system timezone (see the
   [Testing Guide](TESTING-GUIDE.md#independent-oracles-and-pinned-timezones)).

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/timezone.test.js

# Run test files whose path matches a pattern (Jest 30: --testPathPatterns)
npm test -- --testPathPatterns="timezone"

# Run tests with coverage
npm run test:coverage

# Run the suite under another system timezone, as CI does
TZ=America/New_York npm test

# Run tests in watch mode
npm test -- --watch
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass** (and keep coverage above the thresholds):
   ```bash
   npm test
   npm run test:coverage
   ```

2. **Check code style**:
   ```bash
   npm run lint        # what CI runs
   npm run lint:fix    # apply fixes and formatting
   ```

3. **Update documentation**:
   - Update relevant documentation files
   - Add examples for new features
   - Update API documentation if needed

4. **Update tests**:
   - Add tests for new functionality
   - Update existing tests if needed
   - Ensure all tests pass

### Pull Request Guidelines

1. **Title**: Use clear, descriptive titles
   - Good: "feat: add support for custom timezone formats"
   - Bad: "fix bug"

2. **Description**: Provide detailed description including:
   - What the change does
   - Why the change is needed
   - How to test the change
   - Any breaking changes

3. **Type**: Use appropriate labels:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation changes
   - `style`: Code style changes
   - `refactor`: Code refactoring
   - `test`: Test changes
   - `chore`: Build or tool changes

4. **Size**: Keep pull requests small and focused
   - One feature or fix per pull request
   - Break large changes into multiple pull requests

### Review Process

1. **Automated checks** (`.github/workflows/pr-checks.yml`) must pass:
   - Lint (`npm run lint`)
   - Unit tests on Node.js 22, 24 and 26
   - The test suite under a matrix of system timezones
   - Hermes/React Native fallback and simulation tests
   - The "All checks passed" gate job, which fails if any of the above failed or was skipped

2. **Code review**:
   - At least one maintainer must approve
   - Address all review comments
   - Make requested changes

3. **Merge**:
   - Squash commits if requested
   - Use conventional commit messages

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Environment information**:
   - Node.js version
   - Operating system
   - kk-date version

2. **Steps to reproduce**:
   - Clear, step-by-step instructions
   - Minimal code example

3. **Expected vs actual behavior**:
   - What you expected to happen
   - What actually happened

4. **Additional context**:
   - Error messages
   - Stack traces
   - Screenshots if applicable

### Issue Template

```markdown
## Bug Report

### Environment
- Node.js version: [e.g., 22.11.0]
- Operating system: [e.g., macOS 14.0]
- System timezone (`TZ`) and any `kk_date.setTimezone()` / `config()` calls: [e.g., Europe/Istanbul]
- kk-date version: [e.g., 5.0.1]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

### Expected Behavior
[What you expected to happen]

### Actual Behavior
[What actually happened]

### Code Example
```javascript
const kk_date = require('kk-date')
const date = new kk_date('2024-08-23 10:00:00')
console.log(date.format('YYYY-MM-DD'))
```

### Additional Information
[Any other context, error messages, etc.]
```

## Feature Requests

### Feature Request Guidelines

1. **Check existing issues**: Search for similar feature requests
2. **Provide use case**: Explain why the feature is needed
3. **Propose implementation**: Suggest how the feature could be implemented
4. **Consider impact**: Think about how it affects existing functionality

### Feature Request Template

```markdown
## Feature Request

### Problem Statement
[Describe the problem you're trying to solve]

### Proposed Solution
[Describe your proposed solution]

### Use Cases
[Provide specific use cases where this feature would be helpful]

### Implementation Ideas
[Suggest how this could be implemented]

### Alternatives Considered
[Describe any alternatives you've considered]

### Additional Context
[Any other relevant information]
```

## Code of Conduct

### Our Standards

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- **Be respectful**: Treat others with respect and dignity
- **Be inclusive**: Welcome people of all backgrounds and experience levels
- **Be collaborative**: Work together to improve the project
- **Be constructive**: Provide constructive feedback and suggestions

### Unacceptable Behavior

The following behaviors are unacceptable:

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Any conduct inappropriate in a professional setting

### Reporting

If you experience or witness unacceptable behavior, please report it to the project maintainers.

## Development Guidelines

### Adding New Features

1. **Discuss first**: Open an issue to discuss the feature
2. **Plan implementation**: Design the API and implementation
3. **Write tests**: Create comprehensive tests
4. **Update documentation**: Update all relevant documentation
5. **Submit pull request**: Follow the pull request process

### Fixing Bugs

1. **Reproduce the bug**: Create a minimal test case
2. **Write a failing test**: Add a test that demonstrates the bug
3. **Fix the bug**: Implement the fix
4. **Verify the fix**: Ensure the test passes
5. **Submit pull request**: Follow the pull request process

### Code Review Checklist

When reviewing code, check for:

- [ ] **Functionality**: Does the code work as intended?
- [ ] **Tests**: Are there adequate tests?
- [ ] **Documentation**: Is the code well-documented?
- [ ] **Style**: Does the code follow style guidelines?
- [ ] **Performance**: Is the code efficient?
- [ ] **Security**: Are there any security concerns?
- [ ] **Accessibility**: Is the code accessible?

### Commit Message Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build or tool changes

**Examples**:
```
feat(timezone): add support for custom timezone formats
fix(format): correct timezone conversion edge case
docs(api): update API documentation for new methods
test(timezone): add comprehensive timezone conversion tests
```

## Getting Help

### Resources

- **Documentation**: Check the [docs/](./) directory
- **Issues**: Search existing issues on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Code**: Review the source code for examples

### Contact

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: For sensitive or private matters

## Recognition

Contributors will be recognized in:

- **README.md**: Listed as contributors
- **Release notes**: Mentioned in relevant releases
- **GitHub**: Shown in the contributors section

Thank you for contributing to kk-date! Your contributions help make the library better for everyone.
