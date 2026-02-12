// ---------------------------------------------------------
// HTTP REQUEST LOGGER MIDDLEWARE
// ---------------------------------------------------------
// This middleware logs every HTTP request (GET, POST, etc.) to both
// the console and log files using Morgan + Winston

// Import Morgan - a library that automatically logs HTTP request details
import morgan from "morgan";

// Import our custom Winston logger (writes to console + files)
import logger from "../utils/logger.js";

// Create the HTTP logger by connecting Morgan with Winston
const httpLogger = morgan(

  // Define the log format - what information to include in each log line:
  // :method        → HTTP method (GET, POST, PUT, DELETE)
  // :url           → The URL that was requested
  // :status        → Response status code (200 = OK, 404 = Not Found, 500 = Error)
  // :response-time → How long the request took in milliseconds
  ":method :url :status :response-time ms",

  {
    // Instead of Morgan's default console.log, route output through Winston
    stream: {

      // Morgan calls this write function for every HTTP request
      write: (message) => {

        // Remove the extra newline at the end of the message
        // Then log it using Winston's "info" level
        logger.info(message.trim());
      },
    },
  }
);

// Export this middleware so it can be used in app.js
export default httpLogger;
