// Importing bcrypt library to hash and compare passwords securely
import bcrypt from "bcrypt";
// Importing crypto module (built into Node.js) for generating random tokens
import crypto from "crypto";
// Importing jsonwebtoken library to create and verify JWT tokens
import jwt from "jsonwebtoken";
// Importing Sequelize operators (like greater-than, less-than) for database queries
import { Op } from "sequelize";
// Importing the User model to interact with the users table in the database
import User from "../models/User.js";
// Importing the email queue to send emails in the background (not blocking the response)
import emailQueue from "../queues/emailQueue.js";
// Importing CSRF protection module (Cross-Site Request Forgery prevention)
import csrf from "csurf";
// Importing helpers to generate access tokens (short-lived) and refresh tokens (long-lived)
import { generateAccessToken, generateRefreshToken } from "../utils/jwtHelper.js";
// Importing helpers to generate and save CSRF tokens (prevents fake form submissions)
import { generateCsrfToken, saveCsrfToRedis } from "../utils/csrfHelper.js";
// Importing helpers to set/clear cookies in the user's browser
import { setRefreshTokenCookie, setCsrfTokenCookie, clearAuthCookies } from "../utils/cookieHelper.js";
// Importing helpers for sending consistent API responses
import { successWithData, successResponse } from "../utils/apiResponse.js";
// Importing password reset utility functions
import {
  generateResetToken,      // Creates a random reset token
  findUserByResetToken,    // Finds user by their reset token
  clearResetToken,         // Removes reset token after use
  createResetURL           // Builds the password reset URL
} from "../utils/passwordResetHelper.js";
// Importing error-catching wrapper so we don't need try-catch blocks
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class for meaningful error messages
import AppError from "../utils/AppError.js";



/* ===========================
   REGISTER CONTROLLER
=========================== */
// This function handles new user registration (sign up)
export const register = catchAsync(async (req, res, next) => {
  // Extract user details from the request body (what the user typed in the form)
  const { username, email, password, role } = req.body;

  // Check if someone already registered with this email
  const existingUser = await User.findOne({ where: { email } });
  // If email already exists, return an error (no duplicate accounts allowed)
  if (existingUser) {
    return next(new AppError("Email already exists", 400));
  }

  // Hash (encrypt) the password before saving - NEVER store plain text passwords!
  // The number 10 is the "salt rounds" (how many times to scramble the password)
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the new user in the database with the hashed password
  const newUser = await User.create({
    username,                    // User's display name
    email,                       // User's email address
    password: hashedPassword,    // The encrypted password (not the original!)
    role: role || "user",        // Default role is "user" unless specified
  });

  // 📧 Add a welcome email to the background queue (sent asynchronously)
  await emailQueue.add({
    to: email,                                            // Send to the new user's email
    subject: "Welcome to our app",                        // Email subject line
    message: `Hello ${username}, welcome to our app.`,    // Email body text
    pdfPath: "/home/user/Downloads/Template-Filled.csv",  // Optional attachment
  });

  // Send success response back to the client with the new user's ID
  successResponse(res, "User registered successfully, Thanks for joining us", {
    userId: newUser.id,  // Return the newly created user's ID
  });
});

/* ===========================
   LOGIN CONTROLLER
=========================== */
// This function handles user login (authentication)
export const login = catchAsync(async (req, res, next) => {
  // Get email and password from the login form
  const { email, password } = req.body;

  // Look up the user by their email in the database
  const user = await User.findOne({ where: { email } });
  // If user doesn't exist OR password doesn't match, return an error
  // We don't say which one is wrong for security (prevents email guessing)
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Generate a short-lived access token (expires in ~15 minutes)
  const accessToken = generateAccessToken(user.id, user.role);
  // Generate a long-lived refresh token (used to get new access tokens)
  const refreshToken = generateRefreshToken(user.id);

  // Save the refresh token to the user's record in the database
  user.refreshToken = refreshToken;
  // Save the changes to the database
  await user.save();

  // Generate a CSRF token (protects against cross-site request forgery attacks)
  const csrfToken = generateCsrfToken();

  // Save the CSRF token in Redis (fast in-memory database) linked to this user
  await saveCsrfToRedis(user.id, csrfToken);

  // Set the refresh token as an HTTP-only cookie in the user's browser
  setRefreshTokenCookie(res, refreshToken);

  // Set the CSRF token as a cookie in the user's browser
  setCsrfTokenCookie(res, csrfToken);

  // Also send CSRF token in the response header so frontend JavaScript can read it
  res.setHeader('X-CSRF-Token', csrfToken);

  // Send success response with the access token and refresh token
  successResponse(res, "Login successful", {
    accessToken,     // Frontend will store this and send with every request
    refreshToken,    // Used to get a new access token when the current one expires
  });
});





/* ===========================
   REFRESH TOKEN
=========================== */
// This function gives users a new access token using their refresh token
// (Used when the access token expires but the user is still logged in)
export const refreshToken = catchAsync(async (req, res, next) => {
  // Get the refresh token from the request body
  const { refreshToken } = req.body;
  // If no refresh token was provided, return an error
  if (!refreshToken) {
    return next(new AppError("Refresh token required", 400));
  }

  // Find the user who owns this refresh token
  const user = await User.findOne({ where: { refreshToken } });
  // If no user found with this token, it's invalid
  if (!user) {
    return next(new AppError("Invalid refresh token", 401));
  }

  // Verify the refresh token is valid and hasn't expired
  jwt.verify(refreshToken, "refreshSecretKey", (err) => {
    // If verification fails (token expired or tampered), return an error
    if (err) {
      return next(new AppError("Token expired", 401));
    }

    // Create a brand new access token for this user
    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },  // Data stored inside the token
      "mysecretkey",                          // Secret key to sign the token
      { expiresIn: "15m" }                    // Token expires in 15 minutes
    );

    // Send back the new access token
    successResponse(res, "Token refreshed successfully", { accessToken: newAccessToken });
  });
});

/* ===========================
   LOGOUT
=========================== */
// This function handles user logout (clears tokens and cookies)
export const logout = catchAsync(async (req, res, next) => {
  // 🔹 Step 1: Read the refresh token from the browser cookies (not from body)
  const refreshToken = req.cookies?.refreshToken;

  // If no refresh token cookie found, the user wasn't logged in properly
  if (!refreshToken) {
    return next(new AppError("Refresh token missing", 400));
  }

  // 🔹 Step 2: Find the user who owns this refresh token in the database
  const user = await User.findOne({
    where: { refreshToken },
  });

  // If no user found with this token, it's already invalid
  if (!user) {
    return next(new AppError("Invalid refresh token", 400));
  }

  // 🔹 Step 3: Remove the refresh token from the database (invalidate it)
  user.refreshToken = null;
  // Save the change to the database
  await user.save();

  // 🔹 Step 4: Clear all authentication cookies from the user's browser
  clearAuthCookies(res);

  // 🔹 Step 5: Send success response confirming logout
  successResponse(res, "Logged out successfully");
});

// This function handles successful OAuth login (Google/GitHub)
export const oauthSuccess = async (req, res) => {
  // Get the authenticated user object from passport (set by OAuth middleware)
  const user = req.user;

  // 🔑 Generate an access token for the OAuth user
  const accessToken = generateAccessToken(user.id, user.role);

  // Send the access token back as JSON response
  res.json({
    message: "OAuth login successful",
    accessToken,   // Frontend will use this for authenticated requests
  });
};

/**
 * Get user profile
 * @route GET /api/v1/auth/profile
 * @access Private (requires authMiddleware + verifyCsrf)
 */
// This function returns the currently logged-in user's profile info
export const getProfile = catchAsync(async (req, res, next) => {
  // Send back the user ID from the JWT token (set by auth middleware)
  successWithData(res, "Profile fetched successfully", {
    userId: req.user.userId,  // The authenticated user's ID
  });
});

/**
 * Google OAuth callback handler
 * @route GET /api/v1/auth/google/callback
 * @access Public (via passport.authenticate)
 */
// This function runs after Google sends the user back to our app
export const googleOAuthCallback = catchAsync(async (req, res, next) => {
  // Get the authenticated user from passport (Google verified them)
  const user = req.user;

  // 🔑 Generate access token (short-lived) and refresh token (long-lived)
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Save the refresh token to the user's database record
  user.refreshToken = refreshToken;
  await user.save();

  // Generate a CSRF token for this OAuth session
  const csrfToken = generateCsrfToken();
  // Store the CSRF token in Redis linked to this user
  await saveCsrfToRedis(user.id, csrfToken);

  // Set authentication cookies in the user's browser
  setRefreshTokenCookie(res, refreshToken);   // Refresh token cookie
  setCsrfTokenCookie(res, csrfToken);         // CSRF token cookie

  // Redirect the user to the frontend with tokens in the URL
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  // The frontend will grab these tokens from the URL and store them
  res.redirect(`${frontendURL}/oauth/callback?token=${accessToken}&csrf=${csrfToken}&provider=google`);
});

/**
 * GitHub OAuth callback handler
 * @route GET /api/v1/auth/github/callback
 * @access Public (via passport.authenticate)
 */
// This function runs after GitHub sends the user back to our app
export const githubOAuthCallback = catchAsync(async (req, res, next) => {
  // Get the authenticated user from passport (GitHub verified them)
  const user = req.user;

  // Generate access token (short-lived) and refresh token (long-lived)
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Save the refresh token to the user's database record
  user.refreshToken = refreshToken;
  await user.save();

  // Generate a CSRF token for this OAuth session
  const csrfToken = generateCsrfToken();
  // Store the CSRF token in Redis linked to this user
  await saveCsrfToRedis(user.id, csrfToken);

  // Set authentication cookies in the user's browser
  setRefreshTokenCookie(res, refreshToken);   // Refresh token cookie
  setCsrfTokenCookie(res, csrfToken);         // CSRF token cookie

  // Redirect the user to the frontend with tokens in the URL
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  // The frontend will grab these tokens from the URL and store them
  res.redirect(`${frontendURL}/oauth/callback?token=${accessToken}&csrf=${csrfToken}&provider=github`);
});

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

// This function handles the "I forgot my password" request
export const forgotPassword = catchAsync(async (req, res, next) => {
  // ---------------------------------------------------------
  // STEP 1: Get the email address from the request body
  // ---------------------------------------------------------
  const { email } = req.body;
  // Example: email = "john@example.com"

  // ---------------------------------------------------------
  // STEP 2: Find a user with this email in the database
  // ---------------------------------------------------------
  const user = await User.findOne({ where: { email } });

  // If no user exists with this email, still return a success message
  // Why? Security! Don't let attackers figure out which emails are registered
  if (!user) {
    return successResponse(
      res,
      "If an account with that email exists, a password reset link has been sent"
    );
  }

  // ---------------------------------------------------------
  // STEP 3: Generate a random reset token (32 bytes = 64 hex characters)
  // ---------------------------------------------------------
  // This creates a random string like: "a7f3e9d2c1b4a8f6..."
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Example: resetToken = "a7f3e9d2c1b4a8f6e3d2c9b8a7f6e5d4c3b2a1f0..."

  // ---------------------------------------------------------
  // STEP 4: Hash the token before storing in the database
  // ---------------------------------------------------------
  // Why hash it? If the database gets hacked, attackers can't use the raw tokens!
  // We use SHA-256 hashing algorithm (one-way encryption)
  const hashedToken = crypto
    .createHash('sha256')                    // Use SHA-256 algorithm
    .update(resetToken)                      // Feed our token into the algorithm
    .digest('hex');                          // Output the result as a hexadecimal string

  // Example: hashedToken = "c4ca4238a0b923820dcc509a6f75849b..."

  // ---------------------------------------------------------
  // STEP 5: Save the hashed token and expiry time to the database
  // ---------------------------------------------------------
  user.resetPasswordToken = hashedToken;                  // Save the hashed version (not the original!)
  user.resetPasswordExpires = Date.now() + 3600000;      // Set expiry to 1 hour from now (3600000 ms = 1 hour)
  await user.save();                                       // Save these changes to the database

  // Why save hashed token? If database gets leaked, attackers still can't reset passwords
  // Why 1 hour expiry? Limits the time window for potential attacks

  // ---------------------------------------------------------
  // STEP 6: Create the reset URL with the UNHASHED token
  // ---------------------------------------------------------
  // This is the link the user will click in their email
  const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  // Example URL: http://localhost:5173/reset-password/a7f3e9d2c1b4a8f6...

  // IMPORTANT: The URL has the UNHASHED token, but the database stores the HASHED version
  // When user clicks the link, we'll hash the token from the URL and compare with the database

  // ---------------------------------------------------------
  // 🔍 TESTING LOGS (Remove these in production!)
  // ---------------------------------------------------------
  // Since email might not be set up yet, log the token for testing
  console.log('\n========================================');
  console.log('🔑 PASSWORD RESET REQUEST');
  console.log('========================================');
  console.log('📧 Email:', user.email);
  console.log('🔗 Reset URL:', resetURL);
  console.log('🎫 Reset Token (use this in Postman):', resetToken);
  console.log('⏰ Expires:', new Date(user.resetPasswordExpires).toLocaleString());
  console.log('========================================\n');

  // ---------------------------------------------------------
  // STEP 7: Send the password reset email via the background queue
  // ---------------------------------------------------------
  await emailQueue.add({
    to: user.email,                          // Send to the user's email
    subject: "Password Reset Request",       // Email subject line
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
  // STEP 8: Return a generic success message
  // ---------------------------------------------------------
  // Don't reveal if email exists! This prevents attackers from
  // figuring out which emails are registered on your site
  successResponse(
    res,
    "If an account with that email exists, a password reset link has been sent"
  );
});

/* ================================================================
   RESET PASSWORD CONTROLLER
   ================================================================
   
   PURPOSE: Allow user to set a new password using the reset token
   
   FLOW:
   1. User clicks reset link in their email
   2. Frontend shows a "New Password" form
   3. User enters new password and submits (token comes from the URL)
   4. We hash the token from the URL
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

// This function handles setting a new password after the user clicked the reset link
export const resetPassword = catchAsync(async (req, res, next) => {
  // ---------------------------------------------------------
  // STEP 1: Get the token and the new password from the request body
  // ---------------------------------------------------------
  const { token, newPassword } = req.body;
  // token comes from the URL: /reset-password/a7f3e9d2c1b4a8f6...
  // newPassword is what the user typed in the form

  // ---------------------------------------------------------
  // STEP 2: Hash the token from the URL
  // ---------------------------------------------------------
  // We stored the HASHED version in the database, so we need to hash this one too to compare
  const hashedToken = crypto
    .createHash('sha256')      // Use SHA-256 algorithm (same as when we saved it)
    .update(token)             // Hash the token from the URL
    .digest('hex');            // Convert to hexadecimal string

  // ---------------------------------------------------------
  // STEP 3: Find a user with this hashed token that hasn't expired yet
  // ---------------------------------------------------------
  const user = await User.findOne({
    where: {
      resetPasswordToken: hashedToken,              // Token must match what's in the database
      resetPasswordExpires: {                       // AND the token must not be expired
        [Op.gt]: Date.now()                         // Op.gt = "Greater Than" current time
      }
    }
  });

  // If no user found, either:
  // - The token is wrong (invalid)
  // - The token has expired (more than 1 hour has passed)
  // - The token was already used (it was cleared from the database)
  if (!user) {
    return next(new AppError("Invalid or expired reset token", 400));
  }

  // ---------------------------------------------------------
  // STEP 4: Hash the new password before saving
  // ---------------------------------------------------------
  // NEVER store plain text passwords! Always hash them
  // bcrypt.hash(password, saltRounds) - saltRounds of 10 is a good balance
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // ---------------------------------------------------------
  // STEP 5: Update the user's password and clear the reset token fields
  // ---------------------------------------------------------
  user.password = hashedPassword;                  // Set the new hashed password
  user.resetPasswordToken = null;                  // Clear the reset token (one-time use only!)
  user.resetPasswordExpires = null;                // Clear the expiry time

  // OPTIONAL: Logout user from all devices (invalidate all refresh tokens)
  // Uncomment the line below if you want to force logout after password reset
  // user.refreshToken = null;

  await user.save();                               // Save all changes to the database

  // ---------------------------------------------------------
  // STEP 6: Send a confirmation email that the password was changed
  // ---------------------------------------------------------
  // This is important for security - if someone else reset the password, the user will know
  await emailQueue.add({
    to: user.email,                                  // Send to the user's email
    subject: "Password Changed Successfully",        // Email subject
    message: `
      Hello ${user.username},
      
      Your password has been successfully changed.
      
      If you didn't make this change, please contact support immediately!
      
      Thanks,
      Your Team
    `,
  });

  // ---------------------------------------------------------
  // STEP 7: Return success message so the user knows they can log in now
  // ---------------------------------------------------------
  successResponse(res, "Password reset successful. You can now login with your new password");
});