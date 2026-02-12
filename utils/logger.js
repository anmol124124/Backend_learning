// ---------------------------------------------------------
// WINSTON LOGGER
// ---------------------------------------------------------
// Winston is a logging library that writes logs to both:
// 1. The console (terminal) - for real-time monitoring
// 2. A log file (logs/app.log) - for historical records

// Import the Winston logging library
import winston from "winston";

// Create and configure the logger
const logger = winston.createLogger({
  level: "info",                           // Minimum log level to record (info and above)
  format: winston.format.combine(
    // Add a timestamp to every log entry
    winston.format.timestamp({
      // Format the timestamp in Indian Standard Time (IST)
      format: () =>
        new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",         // Indian timezone
        }),
    }),
    // Output logs in JSON format (easier to parse programmatically)
    winston.format.json()
  ),
  // Where to send the logs:
  transports: [
    new winston.transports.Console(),                         // Log to terminal/console
    new winston.transports.File({ filename: "logs/app.log" }), // Log to file
  ],
});

// Export the logger for use throughout the app
export default logger;
