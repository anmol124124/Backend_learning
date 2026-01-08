import { successWithData } from "../utils/apiResponse.js";

/**
 * Get CSRF token
 * @route GET /api/v1/csrf/token
 * @access Public (with csrfProtection middleware)
 */
export const getCsrfToken = (req, res) => {
    successWithData(res, "CSRF token generated", {
        csrfToken: req.csrfToken(),
    });
};
