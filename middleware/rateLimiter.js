// ---------------------------------------------------------
// RATE LIMITER MIDDLEWARE
// ---------------------------------------------------------
// Rate limiting prevents users from making too many requests
// This protects against spam, brute-force attacks, and abuse

// Import the express-rate-limit library
import rateLimit from 'express-rate-limit';

// ---------------------------------------------------------
// GENERAL API RATE LIMITER
// ---------------------------------------------------------
// Applied to all API routes - limits each IP to 100 requests per 15 minutes
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,    // Time window: 15 minutes (in milliseconds)
    max: 100,                     // Maximum 100 requests per IP in the time window
    message: {
        success: false,
        message: 'Too many requests from this IP, Please try again later.',
    },
    standardHeaders: true,        // Include rate limit info in response headers (RateLimit-*)
    legacyHeaders: false,         // Disable the old X-RateLimit-* headers
});


// ---------------------------------------------------------
// AUTH RATE LIMITER (Stricter)
// ---------------------------------------------------------
// Applied to login/register routes - limits each IP to 5 attempts per 15 minutes
// This prevents brute-force password guessing attacks
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,    // Time window: 15 minutes
    max: 5,                       // Only 5 attempts allowed per IP
    message: {
        success: false,
        message: 'Too many authentication attempts, Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,  // Successful logins don't count toward the limit
});

// ---------------------------------------------------------
// CREATE CONTENT RATE LIMITER
// ---------------------------------------------------------
// Applied to post/comment creation - limits to 10 per minute
// Prevents spamming posts or comments
export const createLimiter = rateLimit({
    windowMs: 60 * 1000,          // Time window: 1 minute
    max: 10,                      // Maximum 10 create operations per minute
    message: {
        success: false,
        message: 'You are creating content too quickly, Please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});