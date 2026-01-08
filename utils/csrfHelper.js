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
    try {
        await redisClient.set(
            `csrf:${userId}`,
            token,
            { EX: expirySeconds }
        );
        console.log(`✅ CSRF token saved to Redis for user ${userId}, expires in ${expirySeconds}s`);
    } catch (error) {
        console.error(`❌ Failed to save CSRF token to Redis for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Get CSRF token from Redis
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} - CSRF token or null if not found
 */
export const getCsrfFromRedis = async (userId) => {
    const token = await redisClient.get(`csrf:${userId}`);
    if (token) {
        console.log(`✅ CSRF token retrieved from Redis for user ${userId}`);
    } else {
        console.log(`⚠️ No CSRF token found in Redis for user ${userId} (may be expired)`);
    }
    return token;
};

/**
 * Delete CSRF token from Redis
 * @param {number} userId - User ID
 */
export const deleteCsrfFromRedis = async (userId) => {
    await redisClient.del(`csrf:${userId}`);
    console.log(`🗑️ CSRF token deleted from Redis for user ${userId}`);
};

/**
 * Refresh CSRF token expiry (sliding expiration)
 * Resets the TTL to 15 minutes every time a protected route is accessed
 * @param {number} userId - User ID
 * @param {number} expirySeconds - New expiry time in seconds (default: 15 minutes)
 */
export const refreshCsrfExpiry = async (userId, expirySeconds = 15 * 60) => {
    const result = await redisClient.expire(`csrf:${userId}`, expirySeconds);
    if (result === 1) {
        console.log(`🔄 CSRF token expiry refreshed for user ${userId}, reset to ${expirySeconds}s`);
    } else {
        console.log(`⚠️ Failed to refresh CSRF token expiry for user ${userId} (token may not exist)`);
    }
    return result;
};
