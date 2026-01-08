import jwt from "jsonwebtoken";

// TODO: Move these to environment variables
const ACCESS_TOKEN_SECRET = "mysecretkey";
const REFRESH_TOKEN_SECRET = "refreshSecretKey";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Generate access token (short-lived)
 * @param {number} userId - User ID
 * @param {string} role - User role (user/admin/superadmin)
 * @returns {string} - JWT access token
 */
export const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

/**
 * Generate refresh token (long-lived)
 * @param {number} userId - User ID
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

/**
 * Verify and decode access token
 * @param {string} token - JWT access token
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyAccessToken = (token) => {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

/**
 * Verify and decode refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
};
