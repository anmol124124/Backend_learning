import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import User from "../models/User.js";
import emailQueue from "../queues/emailQueue.js";
import csrf from "csurf";
import { generateAccessToken, generateRefreshToken } from "../utils/jwtHelper.js";
import { generateCsrfToken, saveCsrfToRedis } from "../utils/csrfHelper.js";
import { setRefreshTokenCookie, setCsrfTokenCookie, clearAuthCookies } from "../utils/cookieHelper.js";
import { successWithData, successResponse } from "../utils/apiResponse.js";
import {
  generateResetToken,
  findUserByResetToken,
  clearResetToken,
  createResetURL
} from "../utils/passwordResetHelper.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";



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
    pdfPath: "/home/user/Downloads/Template-Filled.csv",
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

/* ================================================================
   FORGOT PASSWORD CONTROLLER
   ================================================================
   
   PURPOSE: When user forgets password, send them a reset link via email
   
   FLOW:
   1. User enters their email on "Forgot Password" page
   2. We check if user with this email exists
   3. Generate a random, secure token
   4. Hash the token and save to database with expiry (1 hour)
   5. Send email with reset link containing the UNHASHED token
   6. Return generic message (don't reveal if email exists - security!)
   
   SECURITY:
   - Token is hashed before saving to database
   - Token expires after 1 hour
   - Generic response prevents email enumeration attacks
   
================================================================ */

export const forgotPassword = catchAsync(async (req, res, next) => {
  // ---------------------------------------------------------
  // STEP 1: Get email from request body
  // ---------------------------------------------------------
  const { email } = req.body;
  // Example: email = "john@example.com"

  // ---------------------------------------------------------
  // STEP 2: Find user with this email in database
  // ---------------------------------------------------------
  const user = await User.findOne({ where: { email } });

  // If user doesn't exist, still return success message
  // Why? Security! Don't let attackers know which emails are registered
  if (!user) {
    return successResponse(
      res,
      "If an account with that email exists, a password reset link has been sent"
    );
  }

  // ---------------------------------------------------------
  // STEP 3: Generate random reset token (32 bytes = 64 hex characters)
  // ---------------------------------------------------------
  // This creates a random string like: "a7f3e9d2c1b4a8f6..."
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Example: resetToken = "a7f3e9d2c1b4a8f6e3d2c9b8a7f6e5d4c3b2a1f0..."

  // ---------------------------------------------------------
  // STEP 4: Hash the token before storing in database
  // ---------------------------------------------------------
  // Why hash? If database gets leaked, attackers can't use the tokens!
  // We use SHA-256 hashing algorithm
  const hashedToken = crypto
    .createHash('sha256')                    // Use SHA-256 algorithm
    .update(resetToken)                      // Hash our token
    .digest('hex');                          // Convert to hexadecimal string

  // Example: hashedToken = "c4ca4238a0b923820dcc509a6f75849b..."

  // ---------------------------------------------------------
  // STEP 5: Save hashed token and expiry time to database
  // ---------------------------------------------------------
  user.resetPasswordToken = hashedToken;                  // Save hashed version
  user.resetPasswordExpires = Date.now() + 3600000;      // Expires in 1 hour (3600000 ms)
  await user.save();                                       // Update user in database

  // Why save hashed token? Security! If DB gets hacked, tokens are useless
  // Why 1 hour expiry? Limits time window for attacks

  // ---------------------------------------------------------
  // STEP 6: Create reset URL with UNHASHED token
  // ---------------------------------------------------------
  // Frontend URL where user will reset password
  const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  // Example URL: http://localhost:5173/reset-password/a7f3e9d2c1b4a8f6...

  // IMPORTANT: URL contains UNHASHED token, but DB stores HASHED version
  // When user clicks link, we'll hash the token from URL and compare with DB

  // ---------------------------------------------------------
  // 🔍 TESTING LOGS (Remove in production!)
  // ---------------------------------------------------------
  // Since email might not be configured, log the token for testing
  console.log('\n========================================');
  console.log('🔑 PASSWORD RESET REQUEST');
  console.log('========================================');
  console.log('📧 Email:', user.email);
  console.log('🔗 Reset URL:', resetURL);
  console.log('🎫 Reset Token (use this in Postman):', resetToken);
  console.log('⏰ Expires:', new Date(user.resetPasswordExpires).toLocaleString());
  console.log('========================================\n');

  // ---------------------------------------------------------
  // STEP 6: Send password reset email
  // ---------------------------------------------------------
  await emailQueue.add({
    to: user.email,
    subject: "Password Reset Request",
    message: `
      Hello ${user.username},
      
      You requested to reset your password. Please click the link below:
      
      ${resetURL}
      
      This link will expire in 1 hour.
      
      If you didn't request this, please ignore this email.
      
      Thanks,
      Your Team
    `,
  });

  // ---------------------------------------------------------
  // STEP 8: Return generic success message
  // ---------------------------------------------------------
  // Don't reveal if email exists! This prevents attackers from
  // finding out which emails are registered on your site
  successResponse(
    res,
    "If an account with that email exists, a password reset link has been sent"
  );
});

/* ================================================================
   RESET PASSWORD CONTROLLER
   ================================================================
   
   PURPOSE: Allow user to set new password using the reset token
   
   FLOW:
   1. User clicks reset link in email
   2. Frontend shows "New Password" form
   3. User enters new password and submits with token from URL
   4. We hash the token from URL
   5. Find user with matching hashed token that hasn't expired
   6. Update user's password
   7. Clear reset token fields
   8. Send confirmation email
   
   SECURITY:
   - Token must exactly match the hashed version in database
   - Token must not be expired
   - Token is one-time use (cleared after password reset)
   - New password is hashed before saving
   - Optional: Invalidate all sessions (logout from all devices)
   
================================================================ */

export const resetPassword = catchAsync(async (req, res, next) => {
  // ---------------------------------------------------------
  // STEP 1: Get token and new password from request body
  // ---------------------------------------------------------
  const { token, newPassword } = req.body;
  // token comes from URL: /reset-password/a7f3e9d2c1b4a8f6...
  // newPassword is what user typed in the form

  // ---------------------------------------------------------
  // STEP 2: Hash the token from URL
  // ---------------------------------------------------------
  // Why? Because we stored the HASHED version in database
  // We need to hash incoming token to compare with DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // ---------------------------------------------------------
  // STEP 3: Find user with this token that hasn't expired
  // ---------------------------------------------------------
  const user = await User.findOne({
    where: {
      resetPasswordToken: hashedToken,              // Token must match
      resetPasswordExpires: {                       // AND token must not be expired
        [Op.gt]: Date.now()                         // Op.gt = Greater Than current time
      }
    }
  });

  // If no user found, either:
  // - Token is invalid (wrong token)
  // - Token has expired (more than 1 hour passed)
  // - Token was already used (cleared from database)
  if (!user) {
    return next(new AppError("Invalid or expired reset token", 400));
  }

  // ---------------------------------------------------------
  // STEP 4: Hash the new password
  // ---------------------------------------------------------
  // NEVER store plain passwords! Always hash them
  // bcrypt.hash(password, saltRounds)
  // saltRounds = 10 is good balance between security and speed
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // ---------------------------------------------------------
  // STEP 5: Update user's password and clear reset fields
  // ---------------------------------------------------------
  user.password = hashedPassword;                  // Set new hashed password
  user.resetPasswordToken = null;                  // Clear token (one-time use!)
  user.resetPasswordExpires = null;                // Clear expiry

  // OPTIONAL: Logout user from all devices (invalidate refresh tokens)
  // Uncomment this if you want to force logout after password reset
  // user.refreshToken = null;

  await user.save();                               // Save changes to database

  // ---------------------------------------------------------
  // STEP 6: Send password changed confirmation email
  // ---------------------------------------------------------
  // Let user know their password was successfully changed
  // This is important for security - user knows if someone else reset it
  await emailQueue.add({
    to: user.email,
    subject: "Password Changed Successfully",
    message: `
      Hello ${user.username},
      
      Your password has been successfully changed.
      
      If you didn't make this change, please contact support immediately!
      
      Thanks,
      Your Team
    `,
  });

  // ---------------------------------------------------------
  // STEP 7: Return success message
  // ---------------------------------------------------------
  successResponse(res, "Password reset successful. You can now login with your new password");
});