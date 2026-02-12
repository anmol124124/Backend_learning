// ---------------------------------------------------------
// JWT HELPER FUNCTIONS
// ---------------------------------------------------------
// JWT (JSON Web Tokens) are used for authentication
// This file provides functions to create and verify both:
// - Access tokens (short-lived, 15 min) - used for API requests
// - Refresh tokens (long-lived, 7 days) - used to get new access tokens

// Import the JWT library
import jwt from "jsonwebtoken";
// Import config to get JWT secrets and expiry times
import config from "../config/index.js";

// Destructure JWT settings from config for easy access
const { accessSecret, refreshSecret, accessExpiry, refreshExpiry } = config.jwt;

/**
 * Generate an access token (expires quickly for security)
 * Contains user ID and role so the server knows who's making requests
 */
export const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { userId, role },          // Payload: data stored inside the token
        accessSecret,              // Secret key used to sign the token
        { expiresIn: accessExpiry } // Expiry time (e.g., "15m")
    );
};

/**
 * Generate a refresh token (lasts longer)
 * Used to get a new access token when the old one expires
 * Only contains userId (not role) for minimal data exposure
 */
export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },                 // Payload: just the user ID
        refreshSecret,              // Different secret key for refresh tokens
        { expiresIn: refreshExpiry } // Expiry time (e.g., "7d")
    );
};

/**
 * Verify and decode an access token
 * Returns the decoded payload (userId, role) if token is valid
 * Throws an error if token is invalid or expired
 */
export const verifyAccessToken = (token) => {
    return jwt.verify(token, accessSecret);
};

/**
 * Verify and decode a refresh token
 * Returns the decoded payload (userId) if token is valid
 * Throws an error if token is invalid or expired
 */
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, refreshSecret);
};
