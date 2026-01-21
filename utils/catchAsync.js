/**
 * catchAsync Wrapper
 * Eliminates the need for try-catch blocks in async express routes/controllers
 */
export default (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
