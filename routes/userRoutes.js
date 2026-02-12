// ---------------------------------------------------------
// USER ROUTES
// ---------------------------------------------------------
// This file defines URL paths for user profile operations

// Import Express framework
import express from "express";
// Import auth middleware (most user routes require login)
import authMiddleware from "../middleware/authMiddleware.js";
// Import file upload middleware for avatar uploads
import upload from "../middleware/upload.js";
// Import user controller functions
import {
    getMyProfile,          // Get the logged-in user's own profile
    getPublicProfile,      // Get any user's public profile
    updateProfile,         // Update username, bio, avatar
    changePassword,        // Change the user's password
    updateAvatar           // Upload a new profile picture
} from "../controllers/userController.js";
// Import validation schemas for user data
import {
    validate,                 // Validation middleware wrapper
    updateProfileSchema,      // Rules for profile updates
    changePasswordSchema      // Rules for password changes
} from "../validators/userValidator.js";

// Create a new Express router
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management APIs
 */

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized
 */
// GET /api/v1/users/profile → Get your own profile (requires login)
router.get("/profile", authMiddleware, getMyProfile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
// PUT /api/v1/users/profile → Update your profile (username, bio, avatar URL)
// Pipeline: auth check → validate input → update controller
router.put("/profile", authMiddleware, validate(updateProfileSchema), updateProfile);

/**
 * @swagger
 * /api/v1/users/avatar:
 *   post:
 *     summary: Upload profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
// POST /api/v1/users/avatar → Upload a new profile picture
// Pipeline: auth check → multer processes file → update avatar in database
router.post("/avatar", authMiddleware, upload.single("file"), updateAvatar);

/**
 * @swagger
 * /api/v1/users/change-password:
 *   put:
 *     summary: Change password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
// PUT /api/v1/users/change-password → Change your password (requires current password)
router.put("/change-password", authMiddleware, validate(changePasswordSchema), changePassword);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user's public profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       404:
 *         description: User not found
 */
// GET /api/v1/users/:id → Get any user's public profile (no login required)
router.get("/:id", getPublicProfile);

// Export this router
export default router;
