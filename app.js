// ---------------------------------------------------------
// 1) GLOBAL CONFIG
// ---------------------------------------------------------

// Load environment variables first
import 'dotenv/config';

process.env.TZ = "Asia/Kolkata";

// ---------------------------------------------------------
// 2) IMPORTS
// ---------------------------------------------------------

import express from "express";

// DB & Redis
import { connectDB } from "./config/db.js";
import sequelize from "./config/db.js";
import redisClient, { connectRedis } from "./config/redis.js";

// Routes (sirf routes import honge, controllers nahi)
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// Models (order important)
import "./models/User.js";
import "./models/Post.js";
import "./models/associations.js";

// Middlewares
import errorHandler from "./middleware/errorHandler.js";
import httpLogger from "./middleware/httpLogger.js";
import performanceLogger from "./middleware/performanceLogger.js";

// Utils
import logger from "./utils/logger.js";
import { logMetrics } from "./utils/performanceMetrics.js";

// Workers
import "./workers/emailWorker.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import passport from "passport";
import "./config/passport.js"; // 👈 OAuth strategies load



// ---------------------------------------------------------
// 3) EXPRESS APP CREATE
// ---------------------------------------------------------

const app = express();

// ---------------------------------------------------------
// 4) GLOBAL MIDDLEWARES
// ---------------------------------------------------------

app.use(express.json()); // JSON body parser

// 🔥 Logging (routes se pehle)
app.use(httpLogger);
app.use(performanceLogger);

// ---------------------------------------------------------
// 5) API ROUTES (VERSIONED)
// ---------------------------------------------------------

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use(passport.initialize());



// Swagger route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// ---------------------------------------------------------
// 6) ERROR HANDLER (ALWAYS LAST)
// ---------------------------------------------------------

app.use(errorHandler);

// ---------------------------------------------------------
// 7) DATABASE & REDIS CONNECTION
// ---------------------------------------------------------

const startServer = async () => {
  try {
    // DB
    await connectDB();
    logger.info("PostgreSQL connected successfully");

    // Redis
    await connectRedis();
    logger.info("Redis connected successfully");

    // Redis test
    await redisClient.set("test_key", "hello redis");
    const value = await redisClient.get("test_key");
    logger.info(`Redis test value: ${value}`);

    // Server start
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });

    // ⏱ Performance metrics
    setInterval(logMetrics, 100000);

  } catch (error) {
    logger.error("Server startup failed", error);
    process.exit(1);
  }
};

startServer();
