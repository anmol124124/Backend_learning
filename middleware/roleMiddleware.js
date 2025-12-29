// ---------------------------------------------------------
// roleMiddleware.js
// ---------------------------------------------------------
// Ye middleware check karta hai ki user ka role (token me jo mila)
// kya allowed roles ki list me present hai ya nahi.
// Agar present nahi → access deny kar deta hai.
// ---------------------------------------------------------

// allowedRoles = ["admin", "superadmin"] etc.
export const allowRoles = (...allowedRoles) => {

  // Ye actual middleware function return karta hai
  return (req, res, next) => {

    // Token decode hone ke baad authMiddleware ne req.user.role set kiya tha
    const userRole = req.user.role;   // Example → "admin", "user", "superadmin"

    // -----------------------------------------------------
    // CHECK:
    // Kya allowedRoles ke array me userRole present hai?
    // Example:
    // allowedRoles = ["admin", "superadmin"]
    // userRole = "user"
    // → "user" is NOT included → access denied
    // -----------------------------------------------------
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "You do not have permission to access this"
      });
    }

    // ✔ Agar role match ho gaya → next handler ko call karein
    next();
  };
};
