// Importing helper to send consistent success responses with data
import { successWithData } from "../utils/apiResponse.js";

/**
 * Get CSRF token
 * @route GET /api/v1/csrf/token
 * @access Public (with csrfProtection middleware)
 */
// This function generates and sends a CSRF token to the frontend
// CSRF tokens prevent attackers from making fake requests using your login session
export const getCsrfToken = (req, res) => {
    // Send a success response with the generated CSRF token
    // req.csrfToken() is provided by the CSRF middleware and creates a unique token
    successWithData(res, "CSRF token generated", {
        csrfToken: req.csrfToken(),  // Generate and return the CSRF token
    });
};
