// ---------------------------------------------------------
// API RESPONSE HELPERS
// ---------------------------------------------------------
// These helper functions create consistent, standardized API responses
// Using these ensures every response has the same format: { success, message, data/errors }

/**
 * Send a successful response (200 OK)
 * Used for: successful fetches, updates, etc.
 */
export const successResponse = (res, message, data = {}) => {
  return res.status(200).json({
    success: true,            // Indicates the request was successful
    message,                  // A human-readable success message
    data,                     // Any data to send back (optional)
  });
};

/**
 * Send an error response (defaults to 500 Internal Server Error)
 * Used for: failed operations, validation errors, etc.
 */
export const errorResponse = (res, message, status = 500, errors = null) => {
  return res.status(status).json({
    success: false,           // Indicates the request failed
    message,                  // A human-readable error message
    errors,                   // Detailed error info (optional)
  });
};

/**
 * Send a success response with custom data and status code
 * Used for: responses where you need to spread data at the top level
 * (e.g., pagination info alongside the actual data)
 */
export const successWithData = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,                  // Spread the data object's properties into the response
  });
};

/**
 * Send an unauthorized response (401)
 * Used for: missing or invalid authentication
 */
export const unauthorized = (res, message = "Unauthorized") => {
  return res.status(401).json({
    success: false,
    message,
  });
};

/**
 * Send a forbidden response (403)
 * Used for: user is logged in but doesn't have permission
 */
export const forbidden = (res, message = "Forbidden") => {
  return res.status(403).json({
    success: false,
    message,
  });
};