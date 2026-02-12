// ---------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ---------------------------------------------------------
// This middleware checks if the user is logged in before allowing access
// It verifies the JWT token sent in the request header

// Import the JSON Web Token library for verifying tokens
import jwt from "jsonwebtoken";

// The middleware function - runs BEFORE the actual route handler
const authMiddleware = (req, res, next) => {
  // Get the token from the Authorization header (format: "Bearer <token>")
  let token = req.headers.authorization;

  // If the header exists and starts with "Bearer ", extract just the token part
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);    // Remove "Bearer " prefix (7 characters)
  }

  // If no token was found, the user is not logged in → deny access
  if (!token) {
    return res.status(401).json({
      message: "Access Denied: Token Missing"   // 401 = Unauthorized
    });
  }

  try {
    // Verify the token is valid and decode its contents (userId, role, etc.)
    const decoded = jwt.verify(token, "mysecretkey");
    // Attach the decoded user data to the request so controllers can access it
    req.user = decoded;                        // Now req.user.userId and req.user.role are available
    // Token is valid → allow the request to continue to the next handler
    next();

  } catch (error) {
    // Token is invalid or expired → deny access
    return res.status(401).json({
      message: "Invalid or Expired Token"
    });
  }
};

// Export this middleware so route files can use it
export default authMiddleware;
