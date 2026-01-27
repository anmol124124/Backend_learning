import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import passport from "passport";
import csrfProtection from "../middleware/csrfMiddleware.js";
import {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,      // New: validation for forgot password
  resetPasswordSchema        // New: validation for reset password
} from "../validators/authValidator.js";
import {
  register,
  login,
  refreshToken,
  logout,
  oauthSuccess,
  getProfile,
  googleOAuthCallback,
  githubOAuthCallback,
  forgotPassword,            // New: forgot password controller
  resetPassword              // New: reset password controller
} from "../controllers/authController.js";
import verifyCsrf from "../middleware/verifyCsrf.js";
import { authLimiter } from "../middleware/rateLimiter.js";

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
router.get("/profile", authMiddleware, verifyCsrf, getProfile);


/* ---------------- OAUTH ROUTES (NEW) ---------------- */

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Login with Google
 *     tags: [Auth]
 */
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
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login-failed",
  }),
  googleOAuthCallback
);

/**
 * @swagger
 * /api/v1/auth/github:
 *   get:
 *     summary: Login with GitHub
 *     tags: [Auth]
 */
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

/**
 * @swagger
 * /api/v1/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Auth]
 */
router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: "/login-failed",
  }),
  githubOAuthCallback
);

/* ===================================================================
   PASSWORD RESET ROUTES
   ===================================================================
   
   Two endpoints for password reset feature:
   1. /forgot-password - User requests reset link via email
   2. /reset-password  - User sets new password using token from email
   
=================================================================== */

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
router.post(
  "/forgot-password",
  authLimiter,                              // Rate limit to prevent abuse
  validate(forgotPasswordSchema),           // Validate email format
  forgotPassword                            // Controller function
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
router.post(
  "/reset-password",
  authLimiter,                              // Rate limit to prevent brute force
  validate(resetPasswordSchema),            // Validate token and password
  resetPassword                             // Controller function
);

export default router; 