import helmet from 'helmet';

/**
 * Security middleware configuration using Helmet
 * Helmet helps secure Express apps by setting various HTTP headers
 */
export const securityMiddleware = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
        allow: false,
    },

    // X-Frame-Options (prevents clickjacking)
    frameguard: {
        action: 'deny',
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },

    // X-Content-Type-Options (prevents MIME sniffing)
    noSniff: true,

    // Referrer-Policy
    referrerPolicy: {
        policy: 'no-referrer',
    },

    // X-XSS-Protection
    xssFilter: true,
});