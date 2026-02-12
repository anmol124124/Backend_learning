// ---------------------------------------------------------
// ROLE MIDDLEWARE
// ---------------------------------------------------------
// This middleware checks if a logged-in user has the right role
// to access a specific route (e.g., only admins can access admin routes)
// It runs AFTER authMiddleware (which sets req.user)

// Create a middleware factory that accepts a list of allowed roles
// Example usage: allowRoles("admin", "superadmin")
export const allowRoles = (...allowedRoles) => {

  // Return the actual middleware function
  return (req, res, next) => {

    // Get the user's role from the decoded JWT token (set by authMiddleware)
    const userRole = req.user.role;   // e.g., "admin", "user", "superadmin"

    // Check if the user's role is in the list of allowed roles
    // Example: allowedRoles = ["admin", "superadmin"], userRole = "user"
    // → "user" is NOT in ["admin", "superadmin"] → access denied
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "You do not have permission to access this"   // 403 = Forbidden
      });
    }

    // If the user's role IS in the allowed list → let them through
    next();
  };
};
