// ---------------------------------------------------------
// OPTIONAL AUTH MIDDLEWARE
// ---------------------------------------------------------
// This middleware is like authMiddleware, but OPTIONAL
// If user is logged in → attach their info to the request
// If user is NOT logged in → still allow the request (don't block it)
// Used for features like showing "isLiked" status on public post pages

// Import JWT library for verifying tokens
import jwt from "jsonwebtoken";
// Import app config to get the JWT secret key
import config from "../config/index.js";

// The middleware function
const optionalAuth = (req, res, next) => {
    try {
        // Get the Authorization header from the request
        const authHeader = req.headers.authorization;

        // If header exists and has the right format
        if (authHeader && authHeader.startsWith("Bearer ")) {
            // Extract the token (remove "Bearer " prefix)
            const token = authHeader.split(" ")[1];

            // If a token was actually found
            if (token) {
                // Try to verify the token and decode it
                const decoded = jwt.verify(token, config.jwt.accessSecret || "mysecretkey");
                // Attach the user data to the request (userId, role, etc.)
                req.user = decoded;
            }
        }
    } catch (error) {
        // Token is invalid or expired - that's OK for optional auth!
        // Just set user to null and let the request continue
        req.user = null;
    }

    // Always continue to the next handler (never block the request)
    next();
};

// Export this middleware
export default optionalAuth;
