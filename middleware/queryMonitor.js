import logger from '../utils/logger.js';

/**
 * Query Monitor Middleware
 * Tracks API request performance and logs slow requests
 * 
 * Purpose:
 * - Monitor response times for all API endpoints
 * - Identify slow endpoints that need optimization
 * - Log performance metrics for analysis
 * 
 * Usage: Add to app.js before routes
 * app.use(queryMonitor);
 */
const queryMonitor = (req, res, next) => {
    const start = Date.now();

    // Track when response finishes
    res.on('finish', () => {
        const duration = Date.now() - start;

        // Log slow requests (>500ms) - these need optimization!
        if (duration > 500) {
            logger.warn('Slow request detected', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
                statusCode: res.statusCode
            });
        }

        // Log all requests in development for debugging
        if (process.env.NODE_ENV === 'development') {
            logger.info(`${req.method} ${req.url} - ${duration}ms - ${res.statusCode}`);
        }

        // Log errors (4xx, 5xx status codes)
        if (res.statusCode >= 400) {
            logger.error('Request failed', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
                statusCode: res.statusCode
            });
        }
    });

    next();
};

export default queryMonitor;
