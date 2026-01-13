import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import passport from "passport";
import csrfProtection from "../middleware/csrfMiddleware.js";
import {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema
} from "../validators/authValidator.js";
import {
  register,
  login,
  refreshToken,
  logout,
  oauthSuccess,
  getProfile,
  googleOAuthCallback,
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


export default router;

