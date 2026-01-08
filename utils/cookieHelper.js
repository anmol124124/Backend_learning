/**
 * Set refresh token cookie (httpOnly, secure)
 * @param {Object} res - Express response object
 * @param {string} token - Refresh token
 */
export const setRefreshTokenCookie = (res, token) => {
    res.cookie("refreshToken", token, {
        httpOnly: true,        // Cannot be accessed by JavaScript
        sameSite: "lax",       // CSRF protection
        secure: false,         // Set to true in production (HTTPS)
        path: "/",             // Available on all routes
    });
};

/**
 * Set CSRF token cookie (readable by JavaScript)
 * @param {Object} res - Express response object
 * @param {string} token - CSRF token
 */
export const setCsrfTokenCookie = (res, token) => {
    res.cookie("csrfToken", token, {
        httpOnly: false,       // Needs to be readable by JavaScript
        sameSite: "lax",       // CSRF protection
        secure: false,         // Set to true in production (HTTPS)
        path: "/",             // Available on all routes
    });
};

/**
 * Clear all authentication-related cookies
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
    // Clear refresh token
    res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });

    // Clear CSRF token
    res.clearCookie("csrfToken", {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
    });

    // Clear legacy _csrf cookie (from csurf middleware)
    res.clearCookie("_csrf", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });
};
