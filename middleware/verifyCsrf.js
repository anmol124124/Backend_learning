// ---------------------------------------------------------
// CSRF TOKEN VERIFICATION MIDDLEWARE
// ---------------------------------------------------------
// This middleware verifies the CSRF token sent by the frontend
// It checks the token against what's stored in Redis for that user
// Also implements "sliding expiration" - resets the timer on each use

// Import helper functions for Redis CSRF operations
import { getCsrfFromRedis, refreshCsrfExpiry } from "../utils/csrfHelper.js";

// The CSRF verification middleware function
const verifyCsrf = async (req, res, next) => {
  try {
    // Get the CSRF token from the request header (sent by frontend)
    const csrfToken = req.headers["x-csrf-token"];
    // Get the user ID from the decoded JWT (set by authMiddleware earlier)
    const userId = req.user?.userId;

    // If either the token or user ID is missing, deny the request
    if (!csrfToken || !userId) {
      return res.status(403).json({ message: "CSRF token missing" });
    }

    // Get the saved CSRF token from Redis for this user
    const savedToken = await getCsrfFromRedis(userId);

    // Compare the token from the header with the one stored in Redis
    if (!savedToken || savedToken !== csrfToken) {
      console.log(`❌ CSRF token mismatch for user ${userId}`);
      return res.status(403).json({ message: "Invalid CSRF token" });
    }

    console.log(`✅ CSRF token verified successfully for user ${userId}`);

    // Refresh the CSRF token's expiry time (sliding expiration)
    // Every time a protected route is accessed, reset the timer to 15 minutes
    await refreshCsrfExpiry(userId);

    // Token is valid → continue to the next handler
    next();
  } catch (err) {
    // If anything goes wrong during verification
    console.error("❌ CSRF verification error:", err);
    return res.status(500).json({ message: "CSRF verification failed" });
  }
};

// Export this middleware
export default verifyCsrf;
