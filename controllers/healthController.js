// --------------------------------------------------
// HEALTH CHECK CONTROLLER
// --------------------------------------------------

import sequelize from "../config/db.js";
import redisClient from "../config/redis.js";

export const healthCheck = async (req, res) => {
  try {
    // ---------------------------------------------
    // Database health
    // ---------------------------------------------
    let dbStatus = "disconnected";
    try {
      await sequelize.authenticate();
      dbStatus = "connected";
    } catch (err) {
      dbStatus = "disconnected";
    }

    // ---------------------------------------------
    // Redis health
    // ---------------------------------------------
    let redisStatus = "disconnected";
    try {
      if (redisClient.isOpen) {
        redisStatus = "connected";
      }
    } catch (err) {
      redisStatus = "disconnected";
    }

    // ---------------------------------------------
    // Server uptime
    // ---------------------------------------------
    const uptimeSeconds = process.uptime();
    const uptime = `${Math.floor(uptimeSeconds / 60)} minutes`;

    // ---------------------------------------------
    // Final response
    // ---------------------------------------------
    res.status(200).json({
      status: "ok",
      uptime,
      database: dbStatus,
      redis: redisStatus,
      timestamp: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    });

  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Health check failed",
    });
  }
};
