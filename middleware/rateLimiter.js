import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Applies to all API routes
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 minutes
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication routes
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per 15 minutes
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Rate limiter for creating posts/comments
 * Prevents spam
 */
export const createLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 posts/comments per minute
    message: {
        success: false,
        message: 'You are creating content too quickly, please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});