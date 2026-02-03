import { Sequelize } from "sequelize";
import config from "./index.js";
import logger from "../utils/logger.js";
const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: "postgres",

    // Connection pool configuration for better performance
    pool: {
      max: 10,        // Maximum 10 connections in pool
      min: 2,         // Minimum 2 connections always ready
      acquire: 30000, // Max 30 seconds to get connection
      idle: 10000     // Close connection after 10 seconds idle
    },

    // Query performance logging
    benchmark: true,
    logging: (query, time) => {
      // Log slow queries (>100ms) for optimization
      if (time > 100) {
        logger.warn(`Slow query detected: ${time}ms`, {
          query: query.substring(0, 200) // Log first 200 chars
        });
      }
      // In development, log all queries
      if (process.env.NODE_ENV === 'development' && time) {
        logger.debug(`Query executed in ${time}ms`);
      }
    }
  }
);


// ---------------------------------------------------------
// 3) Test DB connection
// ---------------------------------------------------------
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`Database connected successfully ✔`);
  } catch (error) {
    logger.info(`Database connection failed ❌`, error);
  }
};


// ---------------------------------------------------------
// 4) Export sequelize
// ---------------------------------------------------------
export default sequelize;
