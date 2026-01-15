import rateLimit from 'express-rate-limit';
// for all api's
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 minutes
    message: {
        success: false,
        message: 'Too many requests from this IP, Please try again later.',
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
});


// for auth routes (login and register)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per 15 minutes
    message: {
        success: false,
        message: 'Too many authentication attempts, Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

// for comments and posts
export const createLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 posts/comments per minute
    message: {
        success: false,
        message: 'You are creating content too quickly, Please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});