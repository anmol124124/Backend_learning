import jwt from "jsonwebtoken";
import config from "../config/index.js";

const { accessSecret, refreshSecret, accessExpiry, refreshExpiry } = config.jwt;

/**
 * Generate access token (short-lived)
 * @param {number} userId - User ID
 * @param {string} role - User role (user/admin/superadmin)
 * @returns {string} - JWT access token
 */
export const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        accessSecret,
        { expiresIn: accessExpiry }
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
        refreshSecret,
        { expiresIn: refreshExpiry }
    );
};

/**
 * Verify and decode access token
 * @param {string} token - JWT access token
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyAccessToken = (token) => {
    return jwt.verify(token, accessSecret);
};

/**
 * Verify and decode refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, refreshSecret);
};
