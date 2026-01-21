import bcrypt from "bcrypt";
import User from "../models/User.js";
import emailQueue from "../queues/emailQueue.js";
import csrf from "csurf";
import { generateAccessToken, generateRefreshToken } from "../utils/jwtHelper.js";
import { generateCsrfToken, saveCsrfToRedis } from "../utils/csrfHelper.js";
import { setRefreshTokenCookie, setCsrfTokenCookie, clearAuthCookies } from "../utils/cookieHelper.js";
import { successWithData, successResponse } from "../utils/apiResponse.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import jwt from "jsonwebtoken";



/* ===========================
   REGISTER CONTROLLER
=========================== */
export const register = catchAsync(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return next(new AppError("Email already exists", 400));
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

  successResponse(res, "User registered successfully", {
    userId: newUser.id,
  });
});

/* ===========================
   LOGIN CONTROLLER
=========================== */
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Generate JWT tokens using helper
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  user.refreshToken = refreshToken;
  await user.save();

  const csrfToken = generateCsrfToken();

  await saveCsrfToRedis(user.id, csrfToken);

  setRefreshTokenCookie(res, refreshToken);

  setCsrfTokenCookie(res, csrfToken);

  res.setHeader('X-CSRF-Token', csrfToken);

  successResponse(res, "Login successful", {
    accessToken,
    refreshToken,
  });
});





/* ===========================
   REFRESH TOKEN
=========================== */
export const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(new AppError("Refresh token required", 400));
  }

  const user = await User.findOne({ where: { refreshToken } });
  if (!user) {
    return next(new AppError("Invalid refresh token", 401));
  }

  jwt.verify(refreshToken, "refreshSecretKey", (err) => {
    if (err) {
      return next(new AppError("Token expired", 401));
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      "mysecretkey",
      { expiresIn: "15m" }
    );

    successResponse(res, "Token refreshed successfully", { accessToken: newAccessToken });
  });
});

/* ===========================
   LOGOUT
=========================== */
export const logout = catchAsync(async (req, res, next) => {
  // 🔹 1. Read refresh token from cookies (NOT body)
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return next(new AppError("Refresh token missing", 400));
  }

  // 🔹 2. Find user by refresh token
  const user = await User.findOne({
    where: { refreshToken },
  });

  if (!user) {
    return next(new AppError("Invalid refresh token", 400));
  }

  // 🔹 3. Remove refresh token from DB
  user.refreshToken = null;
  await user.save();

  // 🔹 4. Clear all auth cookies using helper
  clearAuthCookies(res);

  // 🔹 6. Final response
  successResponse(res, "Logged out successfully");
});

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
export const getProfile = catchAsync(async (req, res, next) => {
  successWithData(res, "Profile fetched successfully", {
    userId: req.user.userId,
  });
});

/**
 * Google OAuth callback handler
 * @route GET /api/v1/auth/google/callback
 * @access Public (via passport.authenticate)
 */
export const googleOAuthCallback = catchAsync(async (req, res, next) => {
  const user = req.user;

  // 🔑 Generate access token using helper
  const accessToken = generateAccessToken(user.id, user.role);

  successResponse(res, "OAuth login successful", {
    accessToken,
  });
});

/**
 * GitHub OAuth callback handler
 * @route GET /api/v1/auth/github/callback
 * @access Public (via passport.authenticate)
 */
export const githubOAuthCallback = (req, res) => {
  const user = req.user;

  // Generate access token using helper
  const accessToken = generateAccessToken(user.id, user.role);

  res.json({
    success: true,
    message: "GitHub OAuth login successful",
    accessToken,
  });
};