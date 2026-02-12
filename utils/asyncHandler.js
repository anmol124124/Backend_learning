// ---------------------------------------------------------
// ASYNC HANDLER UTILITY
// ---------------------------------------------------------
// This helper wraps async route handlers to automatically catch errors
// Without this, you'd need to write try/catch in every single controller function
// Same purpose as catchAsync.js, but uses Promise.resolve pattern

/**
 * asyncHandler - Wraps an async function and catches any errors automatically
 * Any error thrown inside the async function will be forwarded to Express error handler
 */
const asyncHandler = (fn) => {
  // fn = the async route handler function (req, res, next)

  // Return a new function that Express will call
  return (req, res, next) => {
    // Promise.resolve ensures that even if fn throws a synchronous error,
    // it gets caught by .catch() and forwarded to Express's error handler via next()
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Export the asyncHandler
export default asyncHandler;
