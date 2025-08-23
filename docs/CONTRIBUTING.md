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

- Node.js (version 16 or higher)
- npm or yarn
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/kk-date.git
   cd kk-date
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/original-owner/kk-date.git
   ```

## Development Setup

### Install Dependencies

```bash
# Install dependencies
npm install

# Install development dependencies
npm install --save-dev
```

### Development Scripts

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run linting
npm run lint

# Run linting with auto-fix
npm run lint:fix

# Build the project
npm run build
```

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

We follow the [JavaScript Standard Style](https://standardjs.com/) with some modifications:

- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Use camelCase for variables and functions
- Use PascalCase for classes
- Use UPPER_CASE for constants

### Code Formatting

```javascript
// Good
const kk_date = require('kk-date')

function formatDate (dateString) {
  const date = new kk_date(dateString)
  return date.format('YYYY-MM-DD')
}

// Bad
const kk_date = require("kk-date");

function formatDate(dateString) {
    const date = new kk_date(dateString);
    return date.format("YYYY-MM-DD");
}
```

### File Organization

- **Source files**: Place in root directory (`index.js`, `functions.js`, etc.)
- **Test files**: Place in `test/` directory
- **Documentation**: Place in `docs/` directory
- **Examples**: Place in `examples/` directory

### Naming Conventions

- **Files**: Use kebab-case for file names (`user-timezone-scenarios.test.js`)
- **Functions**: Use camelCase (`formatDate`, `getTimezoneInfo`)
- **Classes**: Use PascalCase (`KkDate`)
- **Constants**: Use UPPER_SNAKE_CASE (`MAX_CACHE_SIZE`)
- **Test files**: End with `.test.js`

## Testing

### Writing Tests

All new functionality must include tests. Follow these guidelines:

1. **Test file structure**:
   ```javascript
   const kk_date = require('../index')

   describe('Feature Name', () => {
     beforeEach(() => {
       // Reset global configuration
       kk_date.setTimezone('UTC')
       kk_date.config({ locale: 'en' })
     })

     describe('Sub-feature', () => {
       test('should handle basic case', () => {
         const date = new kk_date('2024-08-23 10:00:00')
         expect(date.format('YYYY-MM-DD')).toBe('2024-08-23')
       })

       test('should handle edge case', () => {
         // Test edge cases
       })

       test('should throw error for invalid input', () => {
         expect(() => {
           new kk_date('invalid-date')
         }).toThrow('Invalid date format')
       })
     })
   })
   ```

2. **Test categories**:
   - **Unit tests**: Test individual functions and methods
   - **Integration tests**: Test how components work together
   - **Edge case tests**: Test boundary conditions and error cases
   - **Performance tests**: Test performance characteristics

3. **Test coverage**: Aim for at least 90% code coverage

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/timezone.test.js

# Run tests matching pattern
npm test -- --testPathPattern="timezone"

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass**:
   ```bash
   npm test
   ```

2. **Check code style**:
   ```bash
   npm run lint
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

1. **Automated checks** must pass:
   - Tests
   - Linting
   - Code coverage

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
- Node.js version: [e.g., 18.0.0]
- Operating system: [e.g., macOS 12.0]
- kk-date version: [e.g., 3.3.1]

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

- **Documentation**: Check the [docs/](docs/) directory
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
