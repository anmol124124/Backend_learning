import { createClient } from "redis";


const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
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
