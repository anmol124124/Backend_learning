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
