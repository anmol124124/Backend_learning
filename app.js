// ---------------------------------------------------------
// 1) GLOBAL CONFIG
// ---------------------------------------------------------
import config from "./config/index.js";
process.env.TZ = config.timezone;

// ---------------------------------------------------------
// 2) IMPORTS
// ---------------------------------------------------------
import express from "express";
import http from "http";
import cors from "cors";

// DB & Redis
import { connectDB } from "./config/db.js";
import sequelize from "./config/db.js";
import redisClient, { connectRedis } from "./config/redis.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// Models
import "./models/User.js";
import "./models/Post.js";
import "./models/associations.js";

// Middlewares
import errorHandler from "./middleware/errorHandler.js";
import httpLogger from "./middleware/httpLogger.js";
import performanceLogger from "./middleware/performanceLogger.js";
import queryMonitor from "./middleware/queryMonitor.js";

// Utils
import logger from "./utils/logger.js";
import { logMetrics } from "./utils/performanceMetrics.js";

// Workers
import "./workers/emailWorker.js";

// Swagger
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

// OAuth
import passport from "passport";
import "./config/passport.js";

// Socket
import initSocket from "./socket/index.js";
import { Server } from "socket.io";

//health
import healthRoutes from "./routes/healthRoutes.js";

//csrf
import cookieParser from "cookie-parser";
import csrfRoutes from "./routes/csrfRoutes.js";

//api limiter
import { apiLimiter } from "./middleware/rateLimiter.js";

//security header
import { securityMiddleware } from "./middleware/security.js";




// ---------------------------------------------------------
// 3) EXPRESS APP CREATE
// ---------------------------------------------------------
const app = express();
const server = http.createServer(app); // 👈 IMPORTANT

// ---------------------------------------------------------
// 4) GLOBAL MIDDLEWARES
// ---------------------------------------------------------

app.use(express.json());
app.use(securityMiddleware);

app.use(cors({
  origin: "http://localhost:5173", // Vite default port
  credentials: true,
  exposedHeaders: ["X-CSRF-Token"] // Allow frontend to read this header
}));
app.use(httpLogger);
app.use(performanceLogger);
app.use(queryMonitor);  // Track API request performance
app.use(passport.initialize());
app.use(cookieParser());

// Rate limiting for all API routes
app.use("/api", apiLimiter);

// ---------------------------------------------------------
// 5) API ROUTES
// ---------------------------------------------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/csrf", csrfRoutes);


// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------------------------------------------------------
// 6) ERROR HANDLER
// ---------------------------------------------------------
app.use(errorHandler);


// attach socket.io
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// make io globally available
app.set("io", io);
// ---------------------------------------------------------
// 7) START SERVER + SOCKET
// ---------------------------------------------------------
const startServer = async () => {
  try {
    await connectDB();
    logger.info("PostgreSQL connected successfully");

    await connectRedis();
    logger.info("Redis connected successfully");

    // initialize socket
    initSocket(server);

    // start server
    const PORT = config.port;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    setInterval(logMetrics, 100000);
  } catch (error) {
    logger.error("Server startup failed", error);
    process.exit(1);
  }
};

startServer();
