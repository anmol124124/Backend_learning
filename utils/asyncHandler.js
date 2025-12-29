// ---------------------------------------------------------
// asyncHandler.js
// ---------------------------------------------------------
// Ye helper function hai jo hume bar-bar try/catch
// likhne se bachata hai
// ---------------------------------------------------------

const asyncHandler = (fn) => {
  // fn = async route function (req, res, next)

  return (req, res, next) => {
    // Promise.resolve ensure karta hai ki
    // agar async function me error aaye
    // to wo automatically next(error) me chala jaye
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
