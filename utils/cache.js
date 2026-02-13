// ---------------------------------------------------------
// REDIS CACHE UTILITY
// ---------------------------------------------------------
// This file contains simple helper functions to make caching
// easy throughout the application. Think of this as a 
// "Digital Sticky Note" system for our database.

import redisClient from "../config/redis.js";
import logger from "./logger.js";

/**
 * Save data to the cache (The "Sticky Note" writer)
 * @param {string} key - The unique name for this piece of data (e.g., "posts:page:1")
 * @param {any} value - The data we want to save (will be turned into a string)
 * @param {number} ttl - "Time To Live" in seconds (defaults to 1 hour/3600s)
 */
export const setCache = async (key, value, ttl = 3600) => {
    try {
        // Convert the JavaScript object/array into a text string so Redis can store it
        const stringValue = JSON.stringify(value);
        // Save it to Redis with an expiration timer (EX)
        await redisClient.set(key, stringValue, { EX: ttl });
    } catch (error) {
        logger.error(`Redis setCache Error for key ${key}:`, error);
    }
};

/**
 * Get data from the cache (The "Sticky Note" reader)
 * @param {string} key - The unique name of the data we're looking for
 * @returns {any|null} - The parsed data if found, otherwise null
 */
export const getCache = async (key) => {
    try {
        // Look for the string in Redis
        const cachedData = await redisClient.get(key);
        // If nothing was found, return null
        if (!cachedData) return null;
        // Turn the text string back into a JavaScript object/array
        return JSON.parse(cachedData);
    } catch (error) {
        logger.error(`Redis getCache Error for key ${key}:`, error);
        return null; // Return null if Redis crashes so the app keeps working
    }
};

/**
 * Delete data from the cache (The "Sticky Note" eraser)
 * @param {string} pattern - A pattern like "posts:*" to delete many keys at once
 */
export const clearCache = async (pattern) => {
    try {
        // Find all keys that match this pattern (e.g., "posts:feed:*")
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            // Delete all of them at once
            await redisClient.del(keys);
            logger.info(`Cleared ${keys.length} cache keys matching: ${pattern}`);
        }
    } catch (error) {
        logger.error(`Redis clearCache Error for pattern ${pattern}:`, error);
    }
};
