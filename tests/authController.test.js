// ---------------------------------------------------------
// AUTH CONTROLLER INTEGRATION TESTS
// ---------------------------------------------------------
// These tests verify that the authentication system works correctly
// Tests cover: Registration, Login, Logout, Token Refresh, 
// Forgot Password, Reset Password, and Profile Access

// Import supertest - allows us to make HTTP requests to express apps in tests
import request from 'supertest';
// Import express to create a test-only app
import express from 'express';
// Import the auth routes we want to test
import authRoutes from '../routes/authRoutes.js';
// Import the User model to check database state
import { User } from '../models/associations.js';
// Import database connection (Sequelize)
import sequelize from '../config/db.js';
// Import Redis client for CSRF token checks
import redisClient from '../config/redis.js';
// Import bcrypt for password hashing verification
import bcrypt from 'bcrypt';

// Create a mini Express app just for testing (not the real app)
const app = express();
app.use(express.json());                          // Parse JSON request bodies
app.use('/api/v1/auth', authRoutes);              // Mount auth routes

// Simple error handler for test app
app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message
    });
});

// Main test suite for Auth Controller
describe('Auth Controller Integration Tests', () => {

    // Before ALL tests: set up database and Redis
    beforeAll(async () => {
        await sequelize.sync({ force: true });         // Drop and recreate all tables
        await redisClient.connect().catch(() => { });   // Connect to Redis (ignore if fails)
    });

    // After EACH test: clean up data so tests don't affect each other
    afterEach(async () => {
        await User.destroy({ where: {}, truncate: true });   // Delete all users
        await redisClient.flushAll().catch(() => { });        // Clear all Redis data
    });

    // After ALL tests: close connections
    afterAll(async () => {
        await sequelize.close();                       // Close database connection
        await redisClient.quit().catch(() => { });     // Close Redis connection
    });

    /* ===========================
       REGISTRATION TESTS
    =========================== */
    describe('POST /api/v1/auth/register', () => {

        // Test: Check if a new user can register successfully
        test('Should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'StrongPass123!',
                role: 'user'
            };

            // Send registration request
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(200);                          // Expect 200 OK

            // Check response data
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('registered successfully');
            expect(response.body.data.userId).toBeDefined();

            // Verify user exists in database
            const user = await User.findOne({ where: { email: userData.email } });
            expect(user).toBeDefined();
            expect(user.username).toBe(userData.username);
            expect(user.email).toBe(userData.email);

            // Verify password was hashed (not stored as plain text!)
            expect(user.password).not.toBe(userData.password);
            const isPasswordValid = await bcrypt.compare(userData.password, user.password);
            expect(isPasswordValid).toBe(true);
        });

        // Test: Duplicate email should be rejected
        test('Should reject registration with existing email', async () => {
            // Create a user first
            await User.create({
                username: 'existing',
                email: 'existing@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            // Try to register with the same email
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser',
                    email: 'existing@example.com',
                    password: 'StrongPass123!'
                })
                .expect(400);                          // Expect 400 Bad Request

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

        // Test: Missing required fields should be rejected
        test('Should reject registration with missing fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'testuser'
                    // Missing email and password
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        // Test: Default role should be "user" if not specified
        test('Should set default role to "user" if not provided', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'StrongPass123!'
                // No role specified
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(200);

            // Check database to confirm role is "user"
            const user = await User.findOne({ where: { email: userData.email } });
            expect(user.role).toBe('user');
        });
    });

    /* ===========================
       LOGIN TESTS
    =========================== */
    describe('POST /api/v1/auth/login', () => {

        let testUser;

        // Before each login test: create a test user
        beforeEach(async () => {
            testUser = await User.create({
                username: 'logintest',
                email: 'login@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });
        });

        // Test: Correct credentials should return tokens
        test('Should login successfully with correct credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'Password123!'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Login successful');
            expect(response.body.data.accessToken).toBeDefined();    // JWT access token
            expect(response.body.data.refreshToken).toBeDefined();   // JWT refresh token

            // Verify CSRF token is in response header
            expect(response.headers['x-csrf-token']).toBeDefined();

            // Verify refresh token cookie is set
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies.some(cookie => cookie.includes('refreshToken'))).toBe(true);
        });

        // Test: Wrong password should be rejected
        test('Should reject login with incorrect password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'WrongPassword123!'
                })
                .expect(401);                          // 401 Unauthorized

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Incorrect email or password');
        });

        // Test: Non-existent email should be rejected
        test('Should reject login with non-existent email', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Incorrect email or password');
        });

        // Test: Refresh token should be saved to database after login
        test('Should save refresh token to database on login', async () => {
            await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'Password123!'
                })
                .expect(200);

            // Check that refresh token is saved in the User record
            const user = await User.findByPk(testUser.id);
            expect(user.refreshToken).toBeDefined();
            expect(user.refreshToken).not.toBeNull();
        });

        // Test: CSRF token should be stored in Redis after login
        test('Should save CSRF token to Redis on login', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'Password123!'
                })
                .expect(200);

            // Get CSRF token from header and verify it's in Redis
            const csrfToken = response.headers['x-csrf-token'];
            const storedToken = await redisClient.get(`csrf:${testUser.id}`);
            expect(storedToken).toBe(csrfToken);
        });
    });

    /* ===========================
       LOGOUT TESTS
    =========================== */
    describe('POST /api/v1/auth/logout', () => {

        let testUser;
        let refreshToken;

        // Before each test: create user, login, and save the refresh token
        beforeEach(async () => {
            testUser = await User.create({
                username: 'logouttest',
                email: 'logout@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            // Login to get a refresh token
            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'logout@example.com',
                    password: 'Password123!'
                });

            refreshToken = loginResponse.body.data.refreshToken;
        });

        // Test: Logout should clear refresh token from database and cookies
        test('Should logout successfully and clear refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .set('Cookie', [`refreshToken=${refreshToken}`])
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Logged out successfully');

            // Verify refresh token was removed from database
            const user = await User.findByPk(testUser.id);
            expect(user.refreshToken).toBeNull();

            // Verify cookies are cleared
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies.some(cookie => cookie.includes('refreshToken=;'))).toBe(true);
        });

        // Test: Logout without providing refresh token should fail
        test('Should reject logout without refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Refresh token missing');
        });

        // Test: Logout with invalid token should fail
        test('Should reject logout with invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .set('Cookie', ['refreshToken=invalid-token'])
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid refresh token');
        });
    });

    /* ===========================
       REFRESH TOKEN TESTS
    =========================== */
    describe('POST /api/v1/auth/refresh-token', () => {

        let testUser;
        let refreshToken;

        // Before each test: create user and login
        beforeEach(async () => {
            testUser = await User.create({
                username: 'refreshtest',
                email: 'refresh@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'refresh@example.com',
                    password: 'Password123!'
                });

            refreshToken = loginResponse.body.data.refreshToken;
        });

        // Test: Valid refresh token should give a new access token
        test('Should generate new access token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .send({ refreshToken })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Token refreshed successfully');
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.accessToken).not.toBe(refreshToken);  // Should be different
        });

        // Test: Invalid token should be rejected
        test('Should reject refresh with invalid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid refresh token');
        });

        // Test: Missing token should be rejected
        test('Should reject refresh without token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Refresh token required');
        });
    });

    /* ===========================
       FORGOT PASSWORD TESTS
    =========================== */
    describe('POST /api/v1/auth/forgot-password', () => {

        let testUser;

        beforeEach(async () => {
            testUser = await User.create({
                username: 'forgottest',
                email: 'forgot@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });
        });

        // Test: Should create a reset token for valid email
        test('Should send password reset email for existing user', async () => {
            const response = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'forgot@example.com' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('password reset link has been sent');

            // Verify reset token was saved to database
            const user = await User.findByPk(testUser.id);
            expect(user.resetPasswordToken).toBeDefined();
            expect(user.resetPasswordExpires).toBeDefined();
            expect(new Date(user.resetPasswordExpires).getTime()).toBeGreaterThan(Date.now());
        });

        // Test: Non-existent email should still return success (to prevent email enumeration attacks)
        test('Should return generic message for non-existent email (security)', async () => {
            const response = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'nonexistent@example.com' })
                .expect(200);

            // Returns success even for non-existent emails (security best practice)
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('password reset link has been sent');
        });

        // Test: Reset token should be hashed before saving (not stored in plain text)
        test('Should hash reset token before saving to database', async () => {
            await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'forgot@example.com' })
                .expect(200);

            const user = await User.findByPk(testUser.id);

            // Token should be a 64-character hex string (SHA-256 hash)
            expect(user.resetPasswordToken).toHaveLength(64);
            expect(user.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    /* ===========================
       RESET PASSWORD TESTS
    =========================== */
    describe('POST /api/v1/auth/reset-password', () => {

        let testUser;
        let resetToken;

        // Before each test: create user with a valid reset token
        beforeEach(async () => {
            const crypto = await import('crypto');

            // Generate a random reset token and hash it
            resetToken = crypto.randomBytes(32).toString('hex');        // Plain token (sent via email)
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');  // Hashed (stored in DB)

            testUser = await User.create({
                username: 'resettest',
                email: 'reset@example.com',
                password: await bcrypt.hash('OldPassword123!', 10),
                role: 'user',
                resetPasswordToken: hashedToken,
                resetPasswordExpires: Date.now() + 3600000              // Expires in 1 hour
            });
        });

        // Test: Valid token should reset the password
        test('Should reset password successfully with valid token', async () => {
            const newPassword = 'NewPassword123!';

            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({
                    token: resetToken,
                    newPassword: newPassword
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Password reset successful');

            // Verify password was actually changed
            const user = await User.findByPk(testUser.id);
            const isNewPasswordValid = await bcrypt.compare(newPassword, user.password);
            expect(isNewPasswordValid).toBe(true);

            // Verify reset token was cleared after use
            expect(user.resetPasswordToken).toBeNull();
            expect(user.resetPasswordExpires).toBeNull();
        });

        // Test: Invalid token should be rejected
        test('Should reject reset with invalid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({
                    token: 'invalid-token',
                    newPassword: 'NewPassword123!'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid or expired reset token');
        });

        // Test: Expired token should be rejected
        test('Should reject reset with expired token', async () => {
            const crypto = await import('crypto');

            // Create a token that's already expired
            const expiredToken = crypto.randomBytes(32).toString('hex');
            const hashedExpiredToken = crypto.createHash('sha256').update(expiredToken).digest('hex');

            // Update user with the expired token
            await User.update(
                {
                    resetPasswordToken: hashedExpiredToken,
                    resetPasswordExpires: Date.now() - 1000            // Expired 1 second ago
                },
                { where: { id: testUser.id } }
            );

            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({
                    token: expiredToken,
                    newPassword: 'NewPassword123!'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid or expired reset token');
        });

        // Test: New password should be hashed, not stored as plain text
        test('Should hash new password before saving', async () => {
            const newPassword = 'NewPassword123!';

            await request(app)
                .post('/api/v1/auth/reset-password')
                .send({
                    token: resetToken,
                    newPassword: newPassword
                })
                .expect(200);

            const user = await User.findByPk(testUser.id);

            // Password should be bcrypt hashed, not plain text
            expect(user.password).not.toBe(newPassword);
            expect(user.password).toMatch(/^\$2[aby]\$/);              // bcrypt hash pattern
        });
    });

    /* ===========================
       GET PROFILE TESTS (Protected Route)
    =========================== */
    describe('GET /api/v1/auth/profile', () => {

        let testUser;
        let accessToken;
        let csrfToken;

        // Before each test: create user and login to get tokens
        beforeEach(async () => {
            testUser = await User.create({
                username: 'profiletest',
                email: 'profile@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'profile@example.com',
                    password: 'Password123!'
                });

            accessToken = loginResponse.body.data.accessToken;
            csrfToken = loginResponse.headers['x-csrf-token'];
        });

        // Test: Valid token + CSRF should return profile data
        test('Should get profile with valid token and CSRF', async () => {
            const response = await request(app)
                .get('/api/v1/auth/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Profile fetched successfully');
            expect(response.body.data.userId).toBe(testUser.id);
        });

        // Test: Missing token should be rejected
        test('Should reject profile request without token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/profile')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        // Test: Invalid token should be rejected
        test('Should reject profile request with invalid token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/profile')
                .set('Authorization', 'Bearer invalid-token')
                .set('X-CSRF-Token', csrfToken)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});
