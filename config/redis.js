// ---------------------------------------------------------
// REDIS CONFIGURATION
// ---------------------------------------------------------
// Redis is an in-memory data store used for:
// - Caching (storing frequently accessed data for speed)
// - CSRF tokens (storing security tokens temporarily)
// - Session data

// Import the Redis client library
import { createClient } from "redis";
// Import our centralized config for Redis URL
import config from "./index.js";

// Create a Redis client connection using the configured URL
const redisClient = createClient({
  url: config.redis.url                     // Redis connection URL (e.g., "redis://localhost:6379")
});

// Event: When Redis successfully connects
redisClient.on("connect", () => {
  console.log("Redis connected successfully ✅");
});

// Event: When Redis encounters an error
redisClient.on("error", (err) => {
  console.error("Redis Error ❌", err);
});

// Function to connect to Redis (called during app startup)
// Only connects if not already connected
export const connectRedis = async () => {
  if (!redisClient.isOpen) {               // Check if Redis is not already connected
    await redisClient.connect();           // Establish the connection
  }
};

// Export the Redis client for use throughout the app
export default redisClient;
