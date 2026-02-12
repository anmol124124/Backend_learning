// ---------------------------------------------------------
// QUERY MONITOR MIDDLEWARE
// ---------------------------------------------------------
// This middleware monitors every API request for performance issues
// It logs slow requests, development info, and errors

// Import our Winston logger
import logger from '../utils/logger.js';

/**
 * Query Monitor Middleware
 * Tracks API request performance and logs useful information:
 * - Slow requests (> 500ms) → logged as warnings
 * - All requests in development → logged for debugging
 * - Failed requests (4xx/5xx) → logged as errors
 */
const queryMonitor = (req, res, next) => {
    // Record the current time when the request arrives
    const start = Date.now();

    // Listen for when the response finishes being sent to the client
    res.on('finish', () => {
        // Calculate how long the request took (current time minus start time)
        const duration = Date.now() - start;

        // If the request took more than 500ms, it's slow → log a warning
        if (duration > 500) {
            logger.warn('Slow request detected', {
                method: req.method,            // GET, POST, PUT, DELETE
                url: req.url,                  // The URL path
                duration: `${duration}ms`,     // How long it took
                statusCode: res.statusCode     // The response status code
            });
        }

        // In development mode, log ALL requests for easy debugging
        if (process.env.NODE_ENV === 'development') {
            logger.info(`${req.method} ${req.url} - ${duration}ms - ${res.statusCode}`);
        }

        // If the response was an error (400+ status code), log it as an error
        if (res.statusCode >= 400) {
            logger.error('Request failed', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
                statusCode: res.statusCode
            });
        }
    });

    // Continue to the next middleware/route handler
    next();
};

// Export this middleware
export default queryMonitor;
