import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/authRoutes.js';
import { User } from '../models/associations.js';
import sequelize from '../config/db.js';
import redisClient from '../config/redis.js';
import bcrypt from 'bcrypt';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

// Mock error handler
app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message
    });
});

describe('Auth Controller Integration Tests', () => {

    // Setup: Create tables before all tests
    beforeAll(async () => {
        await sequelize.sync({ force: true }); // Recreate tables
        await redisClient.connect().catch(() => { }); // Connect to Redis
    });

    // Cleanup: Clear database after each test
    afterEach(async () => {
        await User.destroy({ where: {}, truncate: true });
        await redisClient.flushAll().catch(() => { }); // Clear Redis
    });

    // Teardown: Close connections after all tests
    afterAll(async () => {
        await sequelize.close();
        await redisClient.quit().catch(() => { });
    });

    /* ===========================
       REGISTRATION TESTS
    =========================== */
    describe('POST /api/v1/auth/register', () => {

        test('Should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'StrongPass123!',
                role: 'user'
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('registered successfully');
            expect(response.body.data.userId).toBeDefined();

            // Verify user was created in database
            const user = await User.findOne({ where: { email: userData.email } });
            expect(user).toBeDefined();
            expect(user.username).toBe(userData.username);
            expect(user.email).toBe(userData.email);

            // Verify password is hashed
            expect(user.password).not.toBe(userData.password);
            const isPasswordValid = await bcrypt.compare(userData.password, user.password);
            expect(isPasswordValid).toBe(true);
        });

        test('Should reject registration with existing email', async () => {
            // Create a user first
            await User.create({
                username: 'existing',
                email: 'existing@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            // Try to register with same email
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser',
                    email: 'existing@example.com',
                    password: 'StrongPass123!'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

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

            const user = await User.findOne({ where: { email: userData.email } });
            expect(user.role).toBe('user');
        });
    });

    /* ===========================
       LOGIN TESTS
    =========================== */
    describe('POST /api/v1/auth/login', () => {

        let testUser;

        beforeEach(async () => {
            // Create a test user before each login test
            testUser = await User.create({
                username: 'logintest',
                email: 'login@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });
        });

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
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.refreshToken).toBeDefined();

            // Verify CSRF token in header
            expect(response.headers['x-csrf-token']).toBeDefined();

            // Verify refresh token cookie is set
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies.some(cookie => cookie.includes('refreshToken'))).toBe(true);
        });

        test('Should reject login with incorrect password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'WrongPassword123!'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Incorrect email or password');
        });

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

        test('Should save refresh token to database on login', async () => {
            await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'Password123!'
                })
                .expect(200);

            // Verify refresh token was saved
            const user = await User.findByPk(testUser.id);
            expect(user.refreshToken).toBeDefined();
            expect(user.refreshToken).not.toBeNull();
        });

        test('Should save CSRF token to Redis on login', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'Password123!'
                })
                .expect(200);

            // Verify CSRF token in Redis
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

        beforeEach(async () => {
            // Create user and login to get refresh token
            testUser = await User.create({
                username: 'logouttest',
                email: 'logout@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'logout@example.com',
                    password: 'Password123!'
                });

            refreshToken = loginResponse.body.data.refreshToken;
        });

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

        test('Should reject logout without refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Refresh token missing');
        });

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

        test('Should generate new access token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .send({ refreshToken })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Token refreshed successfully');
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.accessToken).not.toBe(refreshToken);
        });

        test('Should reject refresh with invalid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid refresh token');
        });

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

        test('Should return generic message for non-existent email (security)', async () => {
            const response = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'nonexistent@example.com' })
                .expect(200);

            // Should still return success to prevent email enumeration
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('password reset link has been sent');
        });

        test('Should hash reset token before saving to database', async () => {
            await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'forgot@example.com' })
                .expect(200);

            const user = await User.findByPk(testUser.id);

            // Token should be 64 characters (SHA-256 hash in hex)
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

        beforeEach(async () => {
            const crypto = await import('crypto');

            // Generate reset token
            resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

            testUser = await User.create({
                username: 'resettest',
                email: 'reset@example.com',
                password: await bcrypt.hash('OldPassword123!', 10),
                role: 'user',
                resetPasswordToken: hashedToken,
                resetPasswordExpires: Date.now() + 3600000 // 1 hour from now
            });
        });

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

            // Verify password was changed
            const user = await User.findByPk(testUser.id);
            const isNewPasswordValid = await bcrypt.compare(newPassword, user.password);
            expect(isNewPasswordValid).toBe(true);

            // Verify reset token was cleared
            expect(user.resetPasswordToken).toBeNull();
            expect(user.resetPasswordExpires).toBeNull();
        });

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

        test('Should reject reset with expired token', async () => {
            const crypto = await import('crypto');

            // Create expired token
            const expiredToken = crypto.randomBytes(32).toString('hex');
            const hashedExpiredToken = crypto.createHash('sha256').update(expiredToken).digest('hex');

            await User.update(
                {
                    resetPasswordToken: hashedExpiredToken,
                    resetPasswordExpires: Date.now() - 1000 // Expired 1 second ago
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

            // Password should be hashed, not plain text
            expect(user.password).not.toBe(newPassword);
            expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
        });
    });

    /* ===========================
       GET PROFILE TESTS (Protected Route)
    =========================== */
    describe('GET /api/v1/auth/profile', () => {

        let testUser;
        let accessToken;
        let csrfToken;

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

        test('Should reject profile request without token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/profile')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

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
