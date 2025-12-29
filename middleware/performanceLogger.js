import logger from "../utils/logger.js";

/**
 * Logs slow HTTP requests
 * Threshold: 500ms
 */
const performanceLogger = (req, res, next) => {
  const start = process.hrtime(); // high precision timer

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const timeInMs = diff[0] * 1000 + diff[1] / 1e6;

    if (timeInMs > 500) {
      logger.warn(
        `SLOW REQUEST: ${req.method} ${req.originalUrl} - ${timeInMs.toFixed(
          2
        )} ms`
      );
    }
  });

  next();
};

export default performanceLogger;
