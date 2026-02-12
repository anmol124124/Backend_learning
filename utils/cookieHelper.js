// ---------------------------------------------------------
// COOKIE HELPER FUNCTIONS
// ---------------------------------------------------------
// These functions manage authentication-related cookies
// Cookies are small pieces of data stored in the user's browser

/**
 * Set the refresh token as an httpOnly cookie
 * httpOnly means JavaScript on the page CANNOT read this cookie (security!)
 * Only the server can read it when the browser sends it with requests
 */
export const setRefreshTokenCookie = (res, token) => {
    res.cookie("refreshToken", token, {
        httpOnly: true,        // JavaScript CANNOT access this cookie (prevents XSS attacks)
        sameSite: "lax",       // Cookie sent on same-site requests + top-level navigations
        secure: false,         // Set to true in production (requires HTTPS)
        path: "/",             // Cookie is available on all routes
    });
};

/**
 * Set the CSRF token as a readable cookie
 * Unlike refresh token, this MUST be readable by JavaScript
 * because the frontend needs to include it in request headers
 */
export const setCsrfTokenCookie = (res, token) => {
    res.cookie("csrfToken", token, {
        httpOnly: false,       // JavaScript CAN read this (frontend needs it for headers)
        sameSite: "lax",       // CSRF protection
        secure: false,         // Set to true in production
        path: "/",             // Available on all routes
    });
};

/**
 * Clear all authentication-related cookies (used during logout)
 * Removes refresh token, CSRF token, and legacy CSRF cookie
 */
export const clearAuthCookies = (res) => {
    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });

    // Clear the CSRF token cookie
    res.clearCookie("csrfToken", {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
    });

    // Clear the legacy _csrf cookie (created by the csurf middleware)
    res.clearCookie("_csrf", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });
};
