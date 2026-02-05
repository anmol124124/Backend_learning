// ---------------------------------------------------------
// OPTIONAL AUTH MIDDLEWARE
// ---------------------------------------------------------
// This middleware tries to extract user info from JWT token if present
// but does NOT block the request if no token is provided.
// Used for endpoints that need optional user context (like checking isLiked)

import jwt from "jsonwebtoken";
import config from "../config/index.js";

const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];

            if (token) {
                // Try to verify and decode the token
                const decoded = jwt.verify(token, config.jwt.accessSecret || "mysecretkey");
                req.user = decoded; // Attach user info to request
            }
        }
    } catch (error) {
        // Token invalid or expired - that's OK, just continue without user
        // Don't block the request, just don't set req.user
        req.user = null;
    }

    next();
};

export default optionalAuth;
