import redisClient from "../config/redis.js";

const verifyCsrf = async (req, res, next) => {
  try {
    const csrfToken = req.headers["x-csrf-token"];
    const userId = req.user?.userId;

    if (!csrfToken || !userId) {
      return res.status(403).json({ message: "CSRF token missing" });
    }

    const savedToken = await redisClient.get(`csrf:${userId}`);

    if (!savedToken || savedToken !== csrfToken) {
      return res.status(403).json({ message: "Invalid CSRF token" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "CSRF verification failed" });
  }
};

export default verifyCsrf;

