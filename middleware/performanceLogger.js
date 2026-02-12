// ---------------------------------------------------------
// PERFORMANCE LOGGER MIDDLEWARE
// ---------------------------------------------------------
// This middleware logs a warning when any API request takes too long
// Helps identify slow endpoints that need optimization

// Import our Winston logger for writing log messages
import logger from "../utils/logger.js";

/**
 * Performance Logger - Monitors request response times
 * If a request takes longer than 500ms, it logs a warning
 */
const performanceLogger = (req, res, next) => {
  // Start a high-precision timer when the request comes in
  const start = process.hrtime();

  // Listen for when the response finishes being sent
  res.on("finish", () => {
    // Calculate how much time has passed since the request started
    const diff = process.hrtime(start);
    // Convert from [seconds, nanoseconds] to milliseconds
    const timeInMs = diff[0] * 1000 + diff[1] / 1e6;

    // If the request took longer than 500ms, log a warning
    if (timeInMs > 500) {
      logger.warn(
        `SLOW REQUEST: ${req.method} ${req.originalUrl} - ${timeInMs.toFixed(
          2
        )} ms`
      );
    }
  });

  // Continue to the next middleware/route handler
  next();
};

// Export this middleware
export default performanceLogger;
