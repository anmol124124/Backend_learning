// ---------------------------------------------------------
// ERROR HANDLER MIDDLEWARE
// ---------------------------------------------------------
// This is the centralized error handler for the entire app
// All errors from controllers and middleware end up here

// Import app configuration to check if we're in development or production
import config from "../config/index.js";

// In DEVELOPMENT mode: show full error details (helps with debugging)
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,           // "fail" or "error"
    error: err,                   // The full error object
    message: err.message,         // Human-readable error message
    stack: err.stack,             // Stack trace showing where the error happened
  });
};

// In PRODUCTION mode: hide internal error details from users (security!)
const sendErrorProd = (err, res) => {
  // Check if this is an "operational" error (one we created intentionally with AppError)
  if (err.isOperational) {
    // Safe to show this message to users (like "Post not found")
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // If it's a programming bug or unknown error, don't reveal details
  else {
    console.error("ERROR 💥", err);             // Log the full error for developers
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",    // Generic message for users
    });
  }
};

// THE MAIN ERROR HANDLER - Express calls this when `next(error)` is used
export const errorHandler = (err, req, res, next) => {
  // Set default status code and status if not already set
  err.statusCode = err.statusCode || 500;       // Default: 500 Internal Server Error
  err.status = err.status || "error";           // Default: "error"

  // Log full error details for debugging (temporary - remove in production)
  console.error("=== ERROR DETAILS ===");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  console.error("====================");

  // Choose which error response to send based on environment
  if (config.env === "development") {
    sendErrorDev(err, res);                     // Show everything in development
  } else {
    sendErrorProd(err, res);                    // Hide details in production
  }
};

// Export as default too for backward compatibility
export default errorHandler;