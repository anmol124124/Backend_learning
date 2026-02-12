// ---------------------------------------------------------
// DATABASE CONFIGURATION (PostgreSQL + Sequelize)
// ---------------------------------------------------------
// This file sets up the connection to our PostgreSQL database
// It also configures connection pooling and query logging

// Import Sequelize ORM (Object-Relational Mapper) for database operations
import { Sequelize } from "sequelize";
// Import our centralized config for database credentials
import config from "./index.js";
// Import our Winston logger for logging database events
import logger from "../utils/logger.js";

// Create a new Sequelize connection instance with our database credentials
const sequelize = new Sequelize(
  config.db.name,          // Database name (e.g., "mydatabase")
  config.db.user,          // Database username (e.g., "postgres")
  config.db.password,      // Database password
  {
    host: config.db.host,  // Database host (e.g., "localhost")
    port: config.db.port,  // Database port (e.g., 5433)
    dialect: "postgres",   // We're using PostgreSQL

    // Connection pool - keeps multiple database connections ready
    // This improves performance by reusing connections instead of creating new ones
    pool: {
      max: 10,             // Maximum 10 connections at the same time
      min: 2,              // Always keep at least 2 connections ready
      acquire: 30000,      // Wait max 30 seconds to get a connection before erroring
      idle: 10000          // Close a connection if unused for 10 seconds
    },

    // Enable query timing (how long each query takes)
    benchmark: true,
    // Custom logging function for database queries
    logging: (query, time) => {
      // Log a warning if any query takes more than 100ms (it's slow!)
      if (time > 100) {
        logger.warn(`Slow query detected: ${time}ms`, {
          query: query.substring(0, 200)   // Only log first 200 chars of the query
        });
      }
      // In development mode, log ALL queries for debugging
      if (process.env.NODE_ENV === 'development' && time) {
        logger.debug(`Query executed in ${time}ms`);
      }
    }
  }
);


// ---------------------------------------------------------
// Connect to the database and sync models
// ---------------------------------------------------------
export const connectDB = async () => {
  try {
    // Test if the database is reachable
    await sequelize.authenticate();
    logger.info(`Database connected successfully ✔`);

    // Sync all models with the database
    // alter: true means it will update tables to match model definitions
    await sequelize.sync({ alter: true });
    logger.info(`Database models synced successfully 🔄`);
  } catch (error) {
    // Log the error if connection fails
    logger.info(`Database connection failed ❌`, error);
  }
};


// ---------------------------------------------------------
// Export the sequelize instance for use throughout the app
// ---------------------------------------------------------
export default sequelize;
