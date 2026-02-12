// ---------------------------------------------------------
// SECURITY MIDDLEWARE (Helmet)
// ---------------------------------------------------------
// This middleware adds security-related HTTP headers to every response
// Helmet is a collection of 15+ small middlewares that set headers

// Import Helmet - the security headers library
import helmet from 'helmet';

/**
 * Security middleware configuration
 * Each setting below controls a specific security header
 */
export const securityMiddleware = helmet({

    // Content Security Policy (CSP)
    // Controls which sources the browser is allowed to load content from
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],                       // Only allow loading from same origin
            styleSrc: ["'self'", "'unsafe-inline'"],      // Allow inline styles (needed for some CSS)
            scriptSrc: ["'self'"],                        // Only allow scripts from same origin
            imgSrc: ["'self'", 'data:', 'https:'],        // Allow images from same origin, data URIs, and HTTPS
        },
    },

    // X-DNS-Prefetch-Control header
    // Prevents browsers from pre-resolving DNS for external links (privacy)
    dnsPrefetchControl: {
        allow: false,                                     // Disable DNS prefetching
    },

    // X-Frame-Options header
    // Prevents your site from being embedded in iframes (prevents clickjacking attacks)
    frameguard: {
        action: 'deny',                                   // Never allow iframe embedding
    },

    // X-Powered-By header
    // Hides the "Express" server identifier (attackers can't easily tell you use Express)
    hidePoweredBy: true,

    // Strict-Transport-Security (HSTS) header
    // Forces browsers to always use HTTPS (prevents downgrade attacks)
    hsts: {
        maxAge: 31536000,                                 // Remember for 1 year (in seconds)
        includeSubDomains: true,                          // Apply to all subdomains too
        preload: true,                                    // Allow inclusion in browser HSTS preload lists
    },

    // X-Content-Type-Options header
    // Prevents browsers from guessing file types (prevents MIME sniffing attacks)
    noSniff: true,

    // Referrer-Policy header
    // Controls what referrer info is sent when navigating to other sites
    referrerPolicy: {
        policy: 'no-referrer',                            // Don't send any referrer information
    },

    // X-XSS-Protection header
    // Enables the browser's built-in XSS (cross-site scripting) filter
    xssFilter: true,
});