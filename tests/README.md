# Test Suite Documentation

## Overview

This directory contains comprehensive integration tests for the backend API. The tests cover authentication, posts, comments, and various middleware functionality.

## Test Files

### Integration Tests
- **authController.test.js** - Authentication endpoints (register, login, logout, password reset, OAuth)
- **postController.test.js** - Post CRUD operations, likes, caching
- **commentController.test.js** - Comment creation, nested replies, fetching

### Unit Tests
- **inputValidation.test.js** - Input validation schemas
- **rateLimiter.test.js** - Rate limiting middleware
- **securityHeaders.test.js** - Security headers middleware

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- authController.test.js
npm test -- postController.test.js
npm test -- commentController.test.js
```

### Run Specific Test Suite
```bash
npm test -- --testNamePattern="Registration"
npm test -- --testNamePattern="Login"
```

## Test Coverage

Current test coverage:

| Category | Files | Coverage |
|----------|-------|----------|
| Controllers | 3/6 | 50% |
| Middleware | 3/10 | 30% |
| Validators | 2/3 | 67% |
| **Overall** | **8/19** | **42%** |

### Coverage Goals
- [ ] Auth Controller: 90%+
- [ ] Post Controller: 90%+
- [ ] Comment Controller: 90%+
- [ ] Middleware: 80%+
- [ ] Validators: 100%

## Test Structure

Each integration test follows this pattern:

```javascript
describe('Feature Name', () => {
  // Setup
  beforeAll(async () => {
    // Create database tables
    // Create test users
    // Get authentication tokens
  });

  // Cleanup after each test
  afterEach(async () => {
    // Clear test data
  });

  // Teardown
  afterAll(async () => {
    // Close database connections
  });

  describe('Specific Endpoint', () => {
    test('Should do something successfully', async () => {
      // Arrange
      const testData = { ... };

      // Act
      const response = await request(app)
        .post('/api/v1/endpoint')
        .send(testData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

## Test Environment

Tests run in an isolated environment with:
- **Test Database**: `test_database` (separate from development)
- **Test Port**: `3001` (different from development port 3000)
- **Redis**: Uses same Redis instance but clears data after each test
- **Environment**: `NODE_ENV=test`

## Prerequisites

Before running tests, ensure:

1. **PostgreSQL is running** on port 5433
2. **Redis is running** on port 6379
3. **Test database exists**:
   ```bash
   psql -U postgres -p 5433
   CREATE DATABASE test_database;
   ```

## Test Data Management

- Tests use `sequelize.sync({ force: true })` to recreate tables
- Each test suite cleans up its data in `afterEach` hooks
- No test data persists between test runs

## Mocking Strategy

- **Database**: Real PostgreSQL database (integration tests)
- **Redis**: Real Redis instance (cleared between tests)
- **External APIs**: Not mocked (OAuth tests may need mocking in future)
- **Email Queue**: Real Bull queue (emails not actually sent in test mode)

## Common Test Patterns

### Testing Protected Routes
```javascript
test('Should access protected route with valid token', async () => {
  const response = await request(app)
    .get('/api/v1/protected')
    .set('Authorization', `Bearer ${accessToken}`)
    .set('X-CSRF-Token', csrfToken)
    .expect(200);
});
```

### Testing Database Changes
```javascript
test('Should create record in database', async () => {
  await request(app)
    .post('/api/v1/resource')
    .send(data);

  const record = await Model.findOne({ where: { ... } });
  expect(record).toBeDefined();
});
```

### Testing Error Cases
```javascript
test('Should return 404 for non-existent resource', async () => {
  const response = await request(app)
    .get('/api/v1/resource/99999')
    .expect(404);

  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain('not found');
});
```

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="Should register a new user"
```

### Enable Verbose Output
```bash
npm test -- --verbose
```

### See Console Logs
Comment out the console suppression in `setup.js`

### Debug in VS Code
Add this to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Known Issues

1. **Redis Connection**: If Redis is not running, tests will fail
2. **Database Port**: Ensure PostgreSQL is on port 5433 (not 5432)
3. **Async Cleanup**: Some tests may leave orphaned connections if interrupted

## Future Improvements

- [ ] Add unit tests for utility functions
- [ ] Mock external OAuth providers
- [ ] Add performance benchmarks
- [ ] Add E2E tests with real frontend
- [ ] Implement test database seeding
- [ ] Add API contract tests
- [ ] Implement snapshot testing for responses
- [ ] Add load testing with Artillery/k6

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Clean up test data in `afterEach`
4. Test both success and error cases
5. Verify database changes
6. Check for proper error messages
7. Aim for 80%+ coverage

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
