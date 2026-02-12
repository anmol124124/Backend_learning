// ---------------------------------------------------------
// SECURITY HEADERS TESTS
// ---------------------------------------------------------
// These tests verify that the security middleware properly sets
// HTTP security headers on all responses. These headers protect
// against common web attacks like:
// - Cross-Site Scripting (XSS)
// - Clickjacking (iframe embedding)
// - MIME type sniffing
// - etc.

// Import supertest for making HTTP requests
import request from 'supertest';
// Import express to create a test app
import express from 'express';
// Import the security middleware we want to test
import { securityMiddleware } from '../middleware/security.js';

// Create a simple test app with the security middleware
const app = express();
app.use(securityMiddleware);                   // Apply security headers
app.get('/test', (req, res) => {
    res.json({ message: 'test' });             // Simple test endpoint
});

// Main test suite
describe('Security Headers Tests', () => {

    // Test: Content-Security-Policy header should prevent XSS attacks
    // CSP tells the browser which content sources are allowed
    test('Should have Content-Security-Policy header', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['content-security-policy']).toBeDefined();
        expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    // Test: X-Frame-Options should prevent clickjacking
    // DENY = this page can never be loaded in an iframe
    test('Should have X-Frame-Options set to DENY', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['x-frame-options']).toBe('DENY');
    });

    // Test: X-Content-Type-Options should prevent MIME sniffing
    // nosniff = browser should trust the Content-Type header, not guess
    test('Should have X-Content-Type-Options set to nosniff', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    // Test: HSTS should force HTTPS connections
    // max-age=31536000 = browser should use HTTPS for the next year
    test('Should have Strict-Transport-Security header', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['strict-transport-security']).toBeDefined();
        expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    // Test: Referrer-Policy controls what info is sent in the Referer header
    // no-referrer = don't send any referrer information to other sites
    test('Should have Referrer-Policy set to no-referrer', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['referrer-policy']).toBe('no-referrer');
    });

    // Test: X-Powered-By should be hidden (reveals server technology)
    // Hiding this makes it harder for attackers to target specific frameworks
    test('Should NOT have X-Powered-By header', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['x-powered-by']).toBeUndefined();
    });

    // Test: X-DNS-Prefetch-Control should be off for privacy
    // Prevents browsers from pre-resolving DNS for links on the page
    test('Should have X-DNS-Prefetch-Control set to off', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
});