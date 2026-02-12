// --------------------------------------------------
// HEALTH CHECK CONTROLLER
// --------------------------------------------------
// This file provides a health check endpoint to verify if the server and its dependencies are running

// Importing the database connection to test if PostgreSQL is reachable
import sequelize from "../config/db.js";
// Importing the Redis client to test if Redis is reachable
import redisClient from "../config/redis.js";

// This function checks if the server, database, and Redis are all healthy
export const healthCheck = async (req, res) => {
  try {
    // ---------------------------------------------
    // Step 1: Check if the database (PostgreSQL) is connected
    // ---------------------------------------------
    let dbStatus = "disconnected";         // Assume disconnected by default
    try {
      // Try to authenticate (ping) the database
      await sequelize.authenticate();
      dbStatus = "connected";              // If no error, database is connected!
    } catch (err) {
      dbStatus = "disconnected";           // If error, database is not reachable
    }

    // ---------------------------------------------
    // Step 2: Check if Redis is connected
    // ---------------------------------------------
    let redisStatus = "disconnected";      // Assume disconnected by default
    try {
      // Check if the Redis client connection is open
      if (redisClient.isOpen) {
        redisStatus = "connected";         // Redis is connected and running!
      }
    } catch (err) {
      redisStatus = "disconnected";        // If error, Redis is not reachable
    }

    // ---------------------------------------------
    // Step 3: Calculate how long the server has been running
    // ---------------------------------------------
    const uptimeSeconds = process.uptime();                      // Get server uptime in seconds
    const uptime = `${Math.floor(uptimeSeconds / 60)} minutes`; // Convert to minutes for readability

    // ---------------------------------------------
    // Step 4: Send the health check response
    // ---------------------------------------------
    res.status(200).json({
      status: "ok",                        // Overall status: everything is fine
      uptime,                              // How long the server has been running
      database: dbStatus,                  // Is PostgreSQL connected?
      redis: redisStatus,                  // Is Redis connected?
      timestamp: new Date().toLocaleString("en-IN", {  // Current server time in Indian format
        timeZone: "Asia/Kolkata",          // Use Indian Standard Time (IST)
      }),
    });

  } catch (error) {
    // If something went wrong with the health check itself, return an error
    res.status(500).json({
      status: "error",                     // Overall status: something is broken
      message: "Health check failed",      // Generic error message
    });
  }
};
