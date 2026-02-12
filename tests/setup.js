// ---------------------------------------------------------
// TEST SETUP / CONFIGURATION
// ---------------------------------------------------------
// This file runs BEFORE all tests to set up the test environment
// It configures environment variables with test-specific values
// so tests don't affect the real database or services

// Set environment to "test" (affects error handling, logging, etc.)
process.env.NODE_ENV = 'test';

// JWT Secrets for testing (different from production secrets for security)
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';   // Secret to sign access tokens
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key'; // Secret to sign refresh tokens
process.env.SESSION_SECRET = 'test-session-secret';          // Secret for session management

// Database Configuration (uses a separate test database!)
process.env.DB_NAME = 'test_database';        // Test database name (not the real one)
process.env.DB_USER = 'postgres';             // Database username
process.env.DB_PASSWORD = 'admin123';         // Database password
process.env.DB_HOST = 'localhost';            // Database host
process.env.DB_PORT = '5433';                 // Database port

// Redis Configuration for tests
process.env.REDIS_URL = 'redis://localhost:6379';

// Other test-specific configs
process.env.PORT = '3001';                    // Different port so it doesn't conflict with dev server
process.env.TZ = 'Asia/Kolkata';              // Timezone
process.env.FRONTEND_URL = 'http://localhost:5173';  // Frontend URL for CORS

// Give integration tests more time (30 seconds) since they hit real databases
jest.setTimeout(30000);

// Optionally suppress console logs during tests to keep output clean
// Uncomment the lines below if you want quieter test output
// global.console = {
//   ...console,
//   log: jest.fn(),      // Suppress console.log
//   debug: jest.fn(),    // Suppress console.debug
//   info: jest.fn(),     // Suppress console.info
//   warn: jest.fn(),     // Suppress console.warn
// };