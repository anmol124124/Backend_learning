// ---------------------------------------------------------
// CSRF HELPER FUNCTIONS
// ---------------------------------------------------------
// CSRF (Cross-Site Request Forgery) tokens prevent attackers
// from making fake requests. These functions manage CSRF tokens in Redis.
// Redis stores tokens temporarily with automatic expiry.

// Import crypto for generating random tokens
import crypto from "crypto";
// Import Redis client for storing/retrieving tokens
import redisClient from "../config/redis.js";

/**
 * Generate a random CSRF token
 * Creates a 64-character hexadecimal string (very hard to guess)
 */
export const generateCsrfToken = () => {
    // Generate 32 random bytes and convert to a hex string (64 characters)
    return crypto.randomBytes(32).toString("hex");
};

/**
 * Save a CSRF token to Redis with an expiry time
 * The token is stored with a key like "csrf:123" (where 123 is the user ID)
 * Default expiry: 15 minutes
 */
export const saveCsrfToRedis = async (userId, token, expirySeconds = 15 * 60) => {
    try {
        // Store the token in Redis with the key "csrf:{userId}"
        await redisClient.set(
            `csrf:${userId}`,              // Redis key
            token,                          // The CSRF token value
            { EX: expirySeconds }           // EX = expire after this many seconds
        );
        console.log(`✅ CSRF token saved to Redis for user ${userId}, expires in ${expirySeconds}s`);
    } catch (error) {
        console.error(`❌ Failed to save CSRF token to Redis for user ${userId}:`, error);
        throw error;                        // Re-throw so the caller knows it failed
    }
};

/**
 * Get a CSRF token from Redis for a specific user
 * Returns the token string if found, or null if expired/missing
 */
export const getCsrfFromRedis = async (userId) => {
    // Look up the token using the key "csrf:{userId}"
    const token = await redisClient.get(`csrf:${userId}`);
    if (token) {
        console.log(`✅ CSRF token retrieved from Redis for user ${userId}`);
    } else {
        console.log(`⚠️ No CSRF token found in Redis for user ${userId} (may be expired)`);
    }
    return token;                           // Returns the token or null
};

/**
 * Delete a CSRF token from Redis (used during logout)
 * Removes the token so it can't be used anymore
 */
export const deleteCsrfFromRedis = async (userId) => {
    // Delete the Redis key "csrf:{userId}"
    await redisClient.del(`csrf:${userId}`);
    console.log(`🗑️ CSRF token deleted from Redis for user ${userId}`);
};

/**
 * Refresh the CSRF token's expiry time (sliding expiration)
 * Every time a protected route is used, reset the timer to 15 minutes
 * This keeps the token alive as long as the user is active
 */
export const refreshCsrfExpiry = async (userId, expirySeconds = 15 * 60) => {
    // Reset the TTL (Time To Live) for the Redis key
    const result = await redisClient.expire(`csrf:${userId}`, expirySeconds);
    if (result === 1) {
        console.log(`🔄 CSRF token expiry refreshed for user ${userId}, reset to ${expirySeconds}s`);
    } else {
        console.log(`⚠️ Failed to refresh CSRF token expiry for user ${userId} (token may not exist)`);
    }
    return result;                          // 1 = success, 0 = key doesn't exist
};
