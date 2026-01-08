import crypto from "crypto";
import redisClient from "../config/redis.js";

/**
 * Generate a random CSRF token
 * @returns {string} - 64 character hex string
 */
export const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

/**
 * Save CSRF token to Redis with expiry
 * @param {number} userId - User ID
 * @param {string} token - CSRF token
 * @param {number} expirySeconds - Expiry time in seconds (default: 15 minutes)
 */
export const saveCsrfToRedis = async (userId, token, expirySeconds = 15 * 60) => {
    await redisClient.set(
        `csrf:${userId}`,
        token,
        { EX: expirySeconds }
    );
};

/**
 * Get CSRF token from Redis
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} - CSRF token or null if not found
 */
export const getCsrfFromRedis = async (userId) => {
    return await redisClient.get(`csrf:${userId}`);
};

/**
 * Delete CSRF token from Redis
 * @param {number} userId - User ID
 */
export const deleteCsrfFromRedis = async (userId) => {
    await redisClient.del(`csrf:${userId}`);
};
