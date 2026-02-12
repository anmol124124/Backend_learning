// ---------------------------------------------------------
// APP ERROR CLASS
// ---------------------------------------------------------
// Custom error class for creating predictable, operational errors
// Examples: "Post not found" (404), "Invalid password" (400)
// These are errors we EXPECT might happen, unlike programming bugs

/**
 * AppError - A custom Error class for handling expected errors
 * Unlike regular errors, these are "operational" (predictable and safe to show to users)
 */
class AppError extends Error {
    // Constructor takes an error message and HTTP status code
    constructor(message, statusCode) {
        // Call the parent Error class with the message
        super(message);

        // Set the HTTP status code (e.g., 404, 400, 500)
        this.statusCode = statusCode;
        // If status code starts with 4 (like 400, 404), it's a "fail"; otherwise it's an "error"
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        // Mark this as an operational error (safe to show message to users)
        this.isOperational = true;

        // Capture the stack trace (shows where the error happened in the code)
        Error.captureStackTrace(this, this.constructor);
    }
}

// Export the AppError class
export default AppError;
