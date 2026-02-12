// ---------------------------------------------------------
// HEALTH CHECK ROUTES
// ---------------------------------------------------------
// This file defines the health check endpoint to monitor server status

// Import Express framework
import express from "express";
// Import database connection to check if PostgreSQL is connected
import sequelize from "../config/db.js";
// Import Redis client to check if Redis is connected
import redisClient from "../config/redis.js";
// Import error-catching wrapper
import catchAsync from "../utils/catchAsync.js";

// Create a new Express router
const router = express.Router();

/**
 * GET /api/v1/health
 * Health check endpoint - used by monitoring tools to verify the server is running
 */
// GET /api/v1/health → Check if the server, database, and Redis are all healthy
router.get("/", catchAsync(async (req, res, next) => {
  // Build the initial health status object
  const health = {
    status: "OK",                              // Overall server status
    uptime: process.uptime(),                  // How long the server has been running (in seconds)
    timestamp: new Date().toISOString(),        // Current time in ISO format
    services: {
      database: "DOWN",                        // Default: assume database is down
      redis: "DOWN",                           // Default: assume Redis is down
    },
  };

  // ---------------------------
  // Check if PostgreSQL database is connected
  // ---------------------------
  try {
    await sequelize.authenticate();            // Try to ping the database
    health.services.database = "UP";           // If no error, database is connected!
  } catch (err) {
    health.services.database = "DOWN";         // If error, database is unreachable
  }

  // ---------------------------
  // Check if Redis is connected
  // ---------------------------
  try {
    await redisClient.ping();                  // Try to ping Redis
    health.services.redis = "UP";              // If no error, Redis is connected!
  } catch (err) {
    health.services.redis = "DOWN";            // If error, Redis is unreachable
  }

  // Send the health status back as JSON with 200 OK status
  return res.status(200).json(health);
}));

// Export this router
export default router;
