// ---------------------------------------------------------
// SOCKET AUTHENTICATION MIDDLEWARE
// ---------------------------------------------------------
// This middleware verifies the JWT token for socket connections
// Similar to authMiddleware.js but for Socket.IO instead of HTTP

// Import JWT library for token verification
import jwt from "jsonwebtoken";
// Import config to get the JWT secret key
import config from "../config/index.js";

/**
 * Socket Authentication Middleware
 * Verifies the JWT token sent during socket connection
 * If valid, attaches user info to the socket object
 */
const socketAuth = (socket, next) => {
  try {
    // Get the authentication token from the socket handshake
    // Client sends this when connecting: io({ auth: { token: "..." } })
    const token = socket.handshake.auth?.token;

    // If no token was provided, reject the connection
    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Attach user info to the socket so event handlers can access it
    socket.user = {
      userId: decoded.userId,             // The user's ID
      role: decoded.role,                 // The user's role (admin, user, etc.)
    };

    // Token is valid → allow the connection to proceed
    next();
  } catch (error) {
    // Token is invalid or expired → reject the connection
    next(new Error("Invalid token"));
  }
};

// Export the middleware
export default socketAuth;
