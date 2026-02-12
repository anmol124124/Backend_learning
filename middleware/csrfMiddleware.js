// ---------------------------------------------------------
// CSRF MIDDLEWARE
// ---------------------------------------------------------
// CSRF (Cross-Site Request Forgery) protection prevents attackers
// from making fake requests using a victim's logged-in session

// Import the csurf library for CSRF protection
import csrf from "csurf";

// Configure CSRF protection using cookies to store the CSRF secret
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,        // JavaScript on the page CANNOT access this cookie (security!)
    sameSite: "strict",    // Cookie only sent on same-site requests (blocks cross-site attacks)
    secure: false,         // Set to true in production (requires HTTPS)
  },
});

// Export the configured CSRF middleware
export default csrfProtection;
