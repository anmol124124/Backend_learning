import { getCsrfFromRedis, refreshCsrfExpiry } from "../utils/csrfHelper.js";

const verifyCsrf = async (req, res, next) => {
  try {
    const csrfToken = req.headers["x-csrf-token"];
    const userId = req.user?.userId;

    if (!csrfToken || !userId) {
      return res.status(403).json({ message: "CSRF token missing" });
    }
    //comapring csrf token from header with saved token
    // Comparing csrf token from header with saved token
    const savedToken = await getCsrfFromRedis(userId);

    if (!savedToken || savedToken !== csrfToken) {
      console.log(`❌ CSRF token mismatch for user ${userId}`);
      return res.status(403).json({ message: "Invalid CSRF token" });
    }

    console.log(`✅ CSRF token verified successfully for user ${userId}`);

    // 🔄 Refresh CSRF token expiry (sliding expiration)
    // Reset TTL to 15 minutes on every protected route access
    await refreshCsrfExpiry(userId);

    next();
  } catch (err) {
    console.error("❌ CSRF verification error:", err);
    return res.status(500).json({ message: "CSRF verification failed" });
  }
};

export default verifyCsrf;

