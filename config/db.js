// ---------------------------------------------------------
// 1) Sequelize import
// ---------------------------------------------------------
import { Sequelize } from "sequelize";
import logger from "../utils/logger.js";


// ---------------------------------------------------------
// 2) SEQUELIZE INSTANCE (Environment-based configuration)
// ---------------------------------------------------------
const sequelize = new Sequelize(
  process.env.DB_NAME || "mydatabase",        // Database name
  process.env.DB_USER || "postgres",          // DB user
  process.env.DB_PASSWORD || "admin123",      // DB password
  {
    host: process.env.DB_HOST || "localhost", // DB host

    port: process.env.DB_PORT || 5433,        // DB port
    dialect: "postgres",                      // Dialect set to Postgres
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
