// =========================================================
// APP.JS - MAIN APPLICATION FILE
// =========================================================
// This is the heart of the backend application
// It sets up Express, connects middlewares, routes, database, and starts the server

// ---------------------------------------------------------
// 1) GLOBAL CONFIGURATION
// ---------------------------------------------------------
// Load all configuration (env variables, secrets, etc.)
import config from "./config/index.js";
// Set the timezone for the entire application
process.env.TZ = config.timezone;

// ---------------------------------------------------------
// 2) IMPORTS
// ---------------------------------------------------------
// Import Express framework (the backbone of our web server)
import express from "express";
// Import HTTP module (needed for Socket.IO to work with Express)
import http from "http";
// Import CORS (allows our frontend to communicate with this backend)
import cors from "cors";

// Database & Redis connections
import { connectDB } from "./config/db.js";            // Function to connect to PostgreSQL
import sequelize from "./config/db.js";                  // Sequelize instance
import redisClient, { connectRedis } from "./config/redis.js";  // Redis client and connect function

// Import all route files (each handles a group of API endpoints)
import authRoutes from "./routes/authRoutes.js";         // Login, register, logout, etc.
import postRoutes from "./routes/postRoutes.js";         // Create, read, update, delete posts
import commentRoutes from "./routes/commentRoutes.js";   // Add, edit, delete comments
import uploadRoutes from "./routes/uploadRoutes.js";     // File upload endpoints
import userRoutes from "./routes/userRoutes.js";         // User profile management
import adminRoutes from "./routes/adminRoutes.js";       // Admin-only operations
import tagRoutes from "./routes/tagRoutes.js";           // Tag management
import categoryRoutes from "./routes/categoryRoutes.js"; // Category management
import bookmarkRoutes from "./routes/bookmarkRoutes.js"; // Bookmark/save posts

// Import models (this registers them with Sequelize)
import "./models/User.js";              // User model
import "./models/Post.js";              // Post model
import "./models/associations.js";      // Model relationships (User has many Posts, etc.)

// Import middleware
import errorHandler from "./middleware/errorHandler.js";           // Centralized error handling
import httpLogger from "./middleware/httpLogger.js";               // Log all HTTP requests
import performanceLogger from "./middleware/performanceLogger.js"; // Log slow requests
import queryMonitor from "./middleware/queryMonitor.js";           // Monitor API performance

// Import utilities
import logger from "./utils/logger.js";                            // Winston logger
import { logMetrics } from "./utils/performanceMetrics.js";        // Log CPU/memory usage

// Import workers (background job processors)
import "./workers/emailWorker.js";     // Email sending worker (starts automatically)

// Import Swagger for API documentation
import swaggerUi from "swagger-ui-express";     // UI component for viewing docs
import swaggerSpec from "./config/swagger.js";   // Our Swagger configuration

// Import OAuth (social login)
import passport from "passport";                 // Passport.js authentication library
import "./config/passport.js";                   // Passport strategies (Google, GitHub)

// Import Socket.IO for real-time features
import initSocket from "./socket/index.js";      // Socket initialization function
import { Server } from "socket.io";              // Socket.IO Server class

// Import health check routes
import healthRoutes from "./routes/healthRoutes.js";

// Import CSRF protection dependencies
import cookieParser from "cookie-parser";         // Parse cookies from requests
import csrfRoutes from "./routes/csrfRoutes.js";  // CSRF token endpoints

// Import rate limiter
import { apiLimiter } from "./middleware/rateLimiter.js";

// Import security headers middleware
import { securityMiddleware } from "./middleware/security.js";



// ---------------------------------------------------------
// 3) CREATE THE EXPRESS APP AND HTTP SERVER
// ---------------------------------------------------------
const app = express();                           // Create the Express application
const server = http.createServer(app);           // Wrap Express in an HTTP server (needed for Socket.IO)

// ---------------------------------------------------------
// 4) GLOBAL MIDDLEWARES
// ---------------------------------------------------------
// These run on EVERY request before reaching any route

app.use(express.json());                         // Parse JSON request bodies
app.use(securityMiddleware);                     // Add security headers (Helmet)

// Configure CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: "http://localhost:5173",               // Allow requests from our Vite frontend
  credentials: true,                              // Allow cookies to be sent
  exposedHeaders: ["X-CSRF-Token"]               // Let frontend read this custom header
}));
app.use(httpLogger);                             // Log all HTTP requests with Morgan
app.use(performanceLogger);                       // Log slow requests (>500ms)
app.use(queryMonitor);                            // Monitor and log API performance
app.use(passport.initialize());                   // Initialize Passport for OAuth
app.use(cookieParser());                          // Parse cookies from incoming requests

// Apply rate limiting to ALL /api routes
app.use("/api", apiLimiter);

// ---------------------------------------------------------
// 5) API ROUTES
// ---------------------------------------------------------
// Each line maps a URL prefix to its corresponding route file
app.use("/api/v1/auth", authRoutes);             // /api/v1/auth/login, /register, etc.
app.use("/api/v1/posts", postRoutes);            // /api/v1/posts/create, /getAll, etc.
app.use("/api/v1/comments", commentRoutes);      // /api/v1/comments/add, /delete, etc.
app.use("/api/v1/upload", uploadRoutes);         // /api/v1/upload/image, etc.
app.use("/api/v1/health", healthRoutes);         // /api/v1/health (server status check)
app.use("/api/v1/csrf", csrfRoutes);             // /api/v1/csrf/token
app.use("/api/v1/users", userRoutes);            // /api/v1/users/profile, etc.
app.use("/api/v1/admin", adminRoutes);           // /api/v1/admin/users, etc.
app.use("/api/v1/tags", tagRoutes);              // /api/v1/tags/create, etc.
app.use("/api/v1/categories", categoryRoutes);   // /api/v1/categories/all, etc.
app.use("/api/v1/bookmarks", bookmarkRoutes);    // /api/v1/bookmarks/toggle, etc.

// Swagger API documentation (visit /api-docs in browser)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------------------------------------------------------
// 6) ERROR HANDLER (must be AFTER all routes)
// ---------------------------------------------------------
app.use(errorHandler);


// ---------------------------------------------------------
// 7) SOCKET.IO SETUP
// ---------------------------------------------------------
// Create a Socket.IO server for real-time communication
export const io = new Server(server, {
  cors: {
    origin: "*",                                  // Allow socket connections from anywhere
  },
});

// Make the Socket.IO instance available throughout the app via app.get("io")
app.set("io", io);

// ---------------------------------------------------------
// 8) START THE SERVER
// ---------------------------------------------------------
const startServer = async () => {
  try {
    // Print startup banner
    console.log('\n' + '='.repeat(60));
    console.log('🚀  STARTING SERVER...');
    console.log('='.repeat(60) + '\n');

    // Step 1: Connect to PostgreSQL database
    await connectDB();
    console.log('✅  PostgreSQL connected successfully');
    logger.info("PostgreSQL connected successfully");

    // Step 2: Connect to Redis (for caching, CSRF tokens, queues)
    await connectRedis();
    console.log('✅  Redis connected successfully');
    logger.info("Redis connected successfully");

    // Step 3: Initialize Socket.IO for real-time features
    initSocket(server);
    console.log('⚡  Socket.IO initialized');

    // Step 4: Start listening for HTTP requests
    const PORT = config.port;
    server.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log(`🎉  SERVER RUNNING ON PORT ${PORT}`);
      console.log(`🌐  Local: http://localhost:${PORT}`);
      console.log(`📚  API Docs: http://localhost:${PORT}/api-docs`);
      console.log('='.repeat(60) + '\n');
      logger.info(`Server running on port ${PORT}`);
    });

    // Log performance metrics every ~100 seconds
    setInterval(logMetrics, 100000);
  } catch (error) {
    // If startup fails, log the error and exit
    console.log('\n' + '='.repeat(60));
    console.log('❌  SERVER STARTUP FAILED');
    console.log('='.repeat(60) + '\n');
    logger.error("Server startup failed", error);
    process.exit(1);                              // Exit with error code 1
  }
};

// Call the start function to boot up the server
startServer();
