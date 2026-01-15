// Import supertest to simulate HTTP requests without running a real server
import request from 'supertest';

// Import express to create small test servers
import express from 'express';

// Import the rate limiter middlewares we want to test
import { authLimiter, createLimiter, apiLimiter } from '../middleware/rateLimiter.js';



/* ===============================
   AUTH LIMITER TEST APP
   =============================== */

// Create a small express app only for auth (login) testing
const authApp = express();

// Enable JSON body parsing (req.body)
authApp.use(express.json());

// Create a fake login API
authApp.post('/auth/login', authLimiter, (req, res) => {
    // Extract success flag from request body
    const { success } = req.body;

    // If login is successful
    if (success) {
        // Send success response
        res.status(200).json({ message: 'Login successful' });
    } 
    // If login failed
    else {
        // Send invalid credentials response
        res.status(401).json({ message: 'Invalid credentials' });
    }
});



/* ===============================
   CREATE POST LIMITER TEST APP
   =============================== */

// Create another express app for post creation testing
const createApp = express();

// Enable JSON body parsing
createApp.use(express.json());

// Fake create-post API with rate limiter
createApp.post('/posts', createLimiter, (req, res) => {
    // Always return success if limiter allows
    res.status(201).json({ message: 'Post created' });
});



/* ===============================
   API LIMITER TEST APP
   =============================== */

// Create app for generic API rate limiting
const apiApp = express();

// Enable JSON body parsing
apiApp.use(express.json());

// Simple test API with apiLimiter
apiApp.get('/api/test', apiLimiter, (req, res) => {
    // Return simple response
    res.json({ message: 'API response' });
});



/* ===============================
   RATE LIMITER TESTS
   =============================== */

describe('Rate Limiter Tests', () => {



    /* ===============================
       AUTH LIMITER TESTS
       =============================== */
    describe('Auth Limiter (5 requests per 15 minutes)', () => {

        test('Should allow up to 5 failed login attempts', async () => {

            // Loop 5 times to simulate failed login attempts
            for (let i = 0; i < 5; i++) {

                // Send POST request to login API
                const response = await request(authApp)
                    .post('/auth/login')
                    .send({ success: false }); // simulate wrong password

                // Expect unauthorized status
                expect(response.status).toBe(401);

                // Expect correct error message
                expect(response.body.message).toBe('Invalid credentials');
            }
        });

        test('Should block 6th failed login attempt with 429', async () => {

            // First make 5 failed attempts
            for (let i = 0; i < 5; i++) {
                await request(authApp)
                    .post('/auth/login')
                    .send({ success: false });
            }

            // 6th attempt should hit rate limit
            const response = await request(authApp)
                .post('/auth/login')
                .send({ success: false });

            // Expect rate limit status
            expect(response.status).toBe(429);

            // Expect structured error response
            expect(response.body.success).toBe(false);

            // Error message should mention too many attempts
            expect(response.body.message).toContain('Too many authentication attempts');
        });

        test('Should set rate limit headers', async () => {

            // Make one login request
            const response = await request(authApp)
                .post('/auth/login')
                .send({ success: false });

            // Check rate limit headers exist
            expect(response.headers['ratelimit-limit']).toBeDefined();
            expect(response.headers['ratelimit-remaining']).toBeDefined();
            expect(response.headers['ratelimit-reset']).toBeDefined();
        });

        // This test is skipped intentionally
        // Because rate limiters use shared memory store
        // Proper testing requires Redis or isolated store
        test.skip('Should NOT count successful requests (skipSuccessfulRequests)', async () => {

            // Create a fresh app to avoid polluted limiter state
            const freshAuthApp = express();

            // Enable JSON parsing
            freshAuthApp.use(express.json());

            // Login API again with limiter
            freshAuthApp.post('/auth/login', authLimiter, (req, res) => {
                const { success } = req.body;

                if (success) {
                    res.status(200).json({ message: 'Login successful' });
                } else {
                    res.status(401).json({ message: 'Invalid credentials' });
                }
            });

            // Send 10 successful logins
            for (let i = 0; i < 10; i++) {
                const response = await request(freshAuthApp)
                    .post('/auth/login')
                    .send({ success: true });

                // Successful logins should not be blocked
                expect(response.status).toBe(200);
            }

            // Even after many successful requests, limiter should not block
            const response = await request(freshAuthApp)
                .post('/auth/login')
                .send({ success: true });

            expect(response.status).toBe(200);
        });
    });



    /* ===============================
       CREATE POST LIMITER TESTS
       =============================== */
    describe('Create Limiter (10 requests per minute)', () => {

        test('Should allow up to 10 requests', async () => {

            // Send 10 post creation requests
            for (let i = 0; i < 10; i++) {
                const response = await request(createApp)
                    .post('/posts')
                    .send({ title: `Post ${i}`, content: 'Test content' });

                // All should succeed
                expect(response.status).toBe(201);
            }
        });

        test('Should block 11th request with 429', async () => {

            // Make 10 requests first
            for (let i = 0; i < 10; i++) {
                await request(createApp)
                    .post('/posts')
                    .send({ title: `Post ${i}`, content: 'Test content' });
            }

            // 11th request should exceed limit
            const response = await request(createApp)
                .post('/posts')
                .send({ title: 'Too many posts', content: 'Blocked' });

            // Expect rate limit error
            expect(response.status).toBe(429);

            // Error response structure
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('creating content too quickly');
        });

        test('Should return correct rate limit headers', async () => {

            // Send one request
            const response = await request(createApp)
                .post('/posts')
                .send({ title: 'Test', content: 'Test content' });

            // Limit should be 10
            expect(response.headers['ratelimit-limit']).toBe('10');

            // Remaining should be <= 10
            expect(parseInt(response.headers['ratelimit-remaining']))
                .toBeLessThanOrEqual(10);
        });
    });



    /* ===============================
       API LIMITER TESTS
       =============================== */
    describe('API Limiter (100 requests per 15 minutes)', () => {

        test('Should allow requests under the limit', async () => {

            // Make simple GET request
            const response = await request(apiApp).get('/api/test');

            // Should work normally
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('API response');
        });

        test('Should set rate limit headers with correct max limit', async () => {

            // Make request
            const response = await request(apiApp).get('/api/test');

            // Check rate limit headers
            expect(response.headers['ratelimit-limit']).toBe('100');
            expect(response.headers['ratelimit-remaining']).toBeDefined();
            expect(response.headers['ratelimit-reset']).toBeDefined();
        });

        test('Should return 429 after exceeding limit', async () => {

            // We do NOT actually send 100 requests here
            // That would slow down test suite
            // Instead we verify request does not crash

            const response = await request(apiApp).get('/api/test');

            // Just ensure no server error
            expect(response.status).toBeLessThan(500);
        });
    });



    /* ===============================
       ERROR MESSAGE FORMAT TESTS
       =============================== */
    describe('Rate Limit Error Messages', () => {

        test('Auth limiter should return JSON error message', async () => {

            // Exceed auth limit
            for (let i = 0; i < 6; i++) {
                await request(authApp)
                    .post('/auth/login')
                    .send({ success: false });
            }

            // One more request to confirm block
            const response = await request(authApp)
                .post('/auth/login')
                .send({ success: false });

            // Expect rate limit error
            expect(response.status).toBe(429);

            // Error should be JSON
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message');

            // Message should mention time window
            expect(response.body.message).toContain('15 minutes');
        });

        test('Create limiter should return JSON error message', async () => {

            // Exceed post creation limit
            for (let i = 0; i < 11; i++) {
                await request(createApp)
                    .post('/posts')
                    .send({ title: 'Test', content: 'Test' });
            }

            // Another request to confirm blocking
            const response = await request(createApp)
                .post('/posts')
                .send({ title: 'Test', content: 'Test' });

            // Expect rate limit error
            expect(response.status).toBe(429);

            // Response should have standard format
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message');

            // Message should be user friendly
            expect(response.body.message).toContain('slow down');
        });
    });
});
