import request from 'supertest';
import express from 'express';
import { securityMiddleware } from '../middleware/security.js';

// Create a simple test app
const app = express();
app.use(securityMiddleware);
app.get('/test', (req, res) => {
    res.json({ message: 'test' });
});

describe('Security Headers Tests', () => {
    test('Should have Content-Security-Policy header', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['content-security-policy']).toBeDefined();
        expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    test('Should have X-Frame-Options set to DENY', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('Should have X-Content-Type-Options set to nosniff', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Should have Strict-Transport-Security header', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['strict-transport-security']).toBeDefined();
        expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    test('Should have Referrer-Policy set to no-referrer', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['referrer-policy']).toBe('no-referrer');
    });

    test('Should NOT have X-Powered-By header', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('Should have X-DNS-Prefetch-Control set to off', async () => {
        const response = await request(app).get('/test');
        expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
});