import express from "express";
import sequelize from "../config/db.js";
import redisClient from "../config/redis.js";

const router = express.Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get("/", async (req, res) => {
  const health = {
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: "DOWN",
      redis: "DOWN",
    },
  };

  // ---------------------------
  // Check Database
  // ---------------------------
  try {
    await sequelize.authenticate();
    health.services.database = "UP";
  } catch (err) {
    health.services.database = "DOWN";
  }

  // ---------------------------
  // Check Redis
  // ---------------------------
  try {
    await redisClient.ping();
    health.services.redis = "UP";
  } catch (err) {
    health.services.redis = "DOWN";
  }

  return res.status(200).json(health);
});

export default router;
