// ---------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------
import jwt from "jsonwebtoken";              // Token verify karne ke liye



// ---------------------------------------------------------
// AUTH MIDDLEWARE (Protected Route ke liye)
// ---------------------------------------------------------

const authMiddleware = (req, res, next) => {   // Middleware function
  let token = req.headers.authorization;     // Header me token aata hai
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  if (!token) {                                // Agar token missing
    return res.status(401).json({
      message: "Access Denied: Token Missing"
    });
  }

  try {
    const decoded = jwt.verify(token, "mysecretkey"); // Token verify + decode
    req.user = decoded;                                // userId & role ko request me store
    next();                                            // Aage waali API ko call allow

  } catch (error) {                                     // Agar token invalid/expired
    return res.status(401).json({
      message: "Invalid or Expired Token"
    });
  }
};

export default authMiddleware;

