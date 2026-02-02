// tests/setup.js
// Set test environment
process.env.NODE_ENV = 'test';

// JWT Secrets
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.SESSION_SECRET = 'test-session-secret';

// Database Configuration (use test database)
process.env.DB_NAME = 'test_database';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'admin123';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';

// Redis Configuration
process.env.REDIS_URL = 'redis://localhost:6379';

// Other configs
process.env.PORT = '3001'; // Different port for tests
process.env.TZ = 'Asia/Kolkata';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Set test timeout (30 seconds for integration tests)
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };