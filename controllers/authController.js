import bcrypt from "bcrypt";
import User from "../models/User.js";
import emailQueue from "../queues/emailQueue.js";
import csrf from "csurf";
import { generateAccessToken, generateRefreshToken } from "../utils/jwtHelper.js";
import { generateCsrfToken, saveCsrfToRedis } from "../utils/csrfHelper.js";
import { setRefreshTokenCookie, setCsrfTokenCookie, clearAuthCookies } from "../utils/cookieHelper.js";
import { successWithData } from "../utils/apiResponse.js";

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,      // frontend JS cannot read
    sameSite: "strict",  // blocks cross-site
    secure: false,       // true in production (HTTPS)
  },
});


/* ===========================
   REGISTER CONTROLLER
=========================== */
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    // 📧 Email Queue
    await emailQueue.add({
      to: email,
      subject: "Welcome to our app",
      message: `Hello ${username}, welcome to our app.`,
      pdfPath: "/home/user/Downloads/Template-1 (11).pdf",
    });

    res.json({
      message: "User registered successfully",
      userId: newUser.id,
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================
   LOGIN CONTROLLER
=========================== */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 🔑 Generate JWT tokens using helper
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    user.refreshToken = refreshToken;
    await user.save();

    // 🔐 Generate CSRF token using helper
    const csrfToken = generateCsrfToken();

    // 🧠 Save CSRF in Redis (15 min) using helper
    await saveCsrfToRedis(user.id, csrfToken);

    // 🍪 Set cookies using helper
    setRefreshTokenCookie(res, refreshToken);
    setCsrfTokenCookie(res, csrfToken);

    // 🔒 Send CSRF token in response header (best practice)
    res.setHeader('X-CSRF-Token', csrfToken);

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      // csrfToken removed from body - now sent via header
    });

  } catch (error) {
    console.log("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};





/* ===========================
   REFRESH TOKEN
=========================== */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const user = await User.findOne({ where: { refreshToken } });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    jwt.verify(refreshToken, "refreshSecretKey", (err) => {
      if (err) {
        return res.status(401).json({ message: "Token expired" });
      }

      const newAccessToken = jwt.sign(
        { userId: user.id, role: user.role },
        "mysecretkey",
        { expiresIn: "15m" }
      );

      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    console.log("REFRESH ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================
   LOGOUT
=========================== */
export const logout = async (req, res) => {
  try {
    // 🔹 1. Read refresh token from cookies (NOT body)
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    // 🔹 2. Find user by refresh token
    const user = await User.findOne({
      where: { refreshToken },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // 🔹 3. Remove refresh token from DB
    user.refreshToken = null;
    await user.save();

    // 🔹 4. Clear all auth cookies using helper
    clearAuthCookies(res);

    // 🔹 6. Final response
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    console.log("LOGOUT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const oauthSuccess = async (req, res) => {
  const user = req.user;

  // 🔑 Generate access token using helper
  const accessToken = generateAccessToken(user.id, user.role);

  res.json({
    message: "OAuth login successful",
    accessToken,
  });
};

/**
 * Get user profile
 * @route GET /api/v1/auth/profile
 * @access Private (requires authMiddleware + verifyCsrf)
 */
export const getProfile = (req, res) => {
  successWithData(res, "Profile fetched successfully", {
    userId: req.user.userId,
  });
};

/**
 * Google OAuth callback handler
 * @route GET /api/v1/auth/google/callback
 * @access Public (via passport.authenticate)
 */
export const googleOAuthCallback = (req, res) => {
  const user = req.user;

  // 🔑 Generate access token using helper
  const accessToken = generateAccessToken(user.id, user.role);

  res.json({
    success: true,
    message: "OAuth login successful",
    accessToken,
  });
};
