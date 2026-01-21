import { createClient } from "redis";
import config from "./index.js";

const redisClient = createClient({
  url: config.redis.url
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully ✅");
});

redisClient.on("error", (err) => {
  console.error("Redis Error ❌", err);
});

// 👉 THIS FUNCTION MUST EXIST
export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export default redisClient;
