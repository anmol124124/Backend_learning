// ---------------------------------------------------------
// CATCH ASYNC UTILITY
// ---------------------------------------------------------
// A simpler version of asyncHandler - wraps async functions
// so you don't need try/catch blocks in every controller
// If the async function throws an error, it's automatically passed to next()

/**
 * catchAsync - Takes an async function and returns a wrapped version
 * that automatically catches errors and passes them to Express error handler
 */
export default (fn) => {
    // Return a new function that Express will call with req, res, next
    return (req, res, next) => {
        // Call the original async function and catch any errors
        // .catch(next) sends the error to the global error handler
        fn(req, res, next).catch(next);
    };
};
