// ---------------------------------------------------------
// AUTHENTICATION ROUTES
// ---------------------------------------------------------
// This file defines all URL paths for login, registration, OAuth, and password reset

// Import Express framework for creating routes
import express from "express";
// Import auth middleware to protect routes that need login
import authMiddleware from "../middleware/authMiddleware.js";
// Import Passport.js for OAuth authentication (Google, GitHub)
import passport from "passport";
// Import CSRF protection middleware
import csrfProtection from "../middleware/csrfMiddleware.js";
// Import validation schemas to check if request data is properly formatted
import {
  validate,                   // Validation middleware wrapper
  registerSchema,             // Rules for registration (username, email, password)
  loginSchema,                // Rules for login (email, password)
  refreshTokenSchema,         // Rules for token refresh
  forgotPasswordSchema,       // Rules for forgot password (email)
  resetPasswordSchema         // Rules for reset password (token, new password)
} from "../validators/authValidator.js";
// Import controller functions that handle each auth action
import {
  register,                   // Handle new user registration
  login,                      // Handle user login
  refreshToken,               // Handle JWT token refresh
  logout,                     // Handle user logout
  oauthSuccess,               // Handle successful OAuth login
  getProfile,                 // Get logged-in user's profile
  googleOAuthCallback,        // Handle Google OAuth callback
  githubOAuthCallback,        // Handle GitHub OAuth callback
  forgotPassword,             // Send password reset email
  resetPassword               // Reset password with token
} from "../controllers/authController.js";
// Import CSRF verification middleware
import verifyCsrf from "../middleware/verifyCsrf.js";
// Import rate limiter to prevent brute-force attacks on login/register
import { authLimiter } from "../middleware/rateLimiter.js";

// Create a new Express router
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and authorization APIs
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: anmol
 *               email:
 *                 type: string
 *                 example: anmol@gmail.com
 *               password:
 *                 type: string
 *                 example: StrongPassword@123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
// POST /api/v1/auth/register → Create a new user account
// Pipeline: rate limit → validate input → register controller
router.post("/register", authLimiter, validate(registerSchema), register);


/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: anmol@gmail.com
 *               password:
 *                 type: string
 *                 example: StrongPassword@123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
// POST /api/v1/auth/login → Log in with email and password
// Pipeline: rate limit → validate input → login controller
router.post("/login", authLimiter, validate(loginSchema), login);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
// POST /api/v1/auth/refresh-token → Get a new access token using your refresh token
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
// POST /api/v1/auth/logout → Log out (clears cookies and refresh token)
router.post("/logout", logout);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized
 */
// GET /api/v1/auth/profile → Get the current user's profile
// Pipeline: auth check → CSRF check → get profile controller
router.get("/profile", authMiddleware, verifyCsrf, getProfile);


/* ===========================
   OAUTH ROUTES (Social Login)
=========================== */

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Login with Google
 *     tags: [Auth]
 */
// GET /api/v1/auth/google → Redirect user to Google's login page
// Passport handles the OAuth flow - asks for user's profile and email
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 */
// GET /api/v1/auth/google/callback → Google redirects back here after user logs in
// Passport verifies the response, then our callback controller handles token creation
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,                        // Don't create a session (we use JWT tokens instead)
    failureRedirect: "/login-failed",      // Where to go if authentication fails
  }),
  googleOAuthCallback                      // Handle successful Google login
);

/**
 * @swagger
 * /api/v1/auth/github:
 *   get:
 *     summary: Login with GitHub
 *     tags: [Auth]
 */
// GET /api/v1/auth/github → Redirect user to GitHub's login page
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })  // Request access to user's email
);

/**
 * @swagger
 * /api/v1/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Auth]
 */
// GET /api/v1/auth/github/callback → GitHub redirects back here after user logs in
router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,                        // We use JWT, not sessions
    failureRedirect: "/login-failed",      // Where to go if auth fails
  }),
  githubOAuthCallback                      // Handle successful GitHub login
);

/* ===========================
   PASSWORD RESET ROUTES
=========================== */
// Two-step process:
// 1. User requests a reset link via email (forgot-password)
// 2. User clicks the link and sets a new password (reset-password)

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Auth]
 *     description: |
 *       Send password reset link to user's email.
 *       Returns generic message for security (doesn't reveal if email exists).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: anmol@gmail.com
 *                 description: Email address of the account
 *     responses:
 *       200:
 *         description: Generic success message (sent regardless of whether email exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: If an account with that email exists, a password reset link has been sent
 *       400:
 *         description: Validation error (invalid email format)
 */
// POST /api/v1/auth/forgot-password → Send reset link to user's email
// Pipeline: rate limit (prevent abuse) → validate email → send reset email
router.post(
  "/forgot-password",
  authLimiter,                              // Rate limit to prevent spam/abuse
  validate(forgotPasswordSchema),           // Validate that email format is correct
  forgotPassword                            // Controller: generates token and sends email
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     description: |
 *       Set new password using the reset token received via email.
 *       Token must be valid and not expired (1 hour expiry).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: a7f3e9d2c1b4a8f6e3d2c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8
 *                 description: Reset token from email URL (64 character hex string)
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewSecurePass123!
 *                 description: New password (min 8 chars, must have uppercase, lowercase, number)
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset successful. You can now login with your new password
 *       400:
 *         description: Invalid or expired token, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid or expired reset token
 */
// POST /api/v1/auth/reset-password → Set new password using token from email
// Pipeline: rate limit (prevent brute force) → validate token + password → reset password
router.post(
  "/reset-password",
  authLimiter,                              // Rate limit to prevent brute force attacks
  validate(resetPasswordSchema),            // Validate token format and password strength
  resetPassword                             // Controller: verifies token and updates password
);

// Export this router so it can be mounted in the main app.js file
export default router;