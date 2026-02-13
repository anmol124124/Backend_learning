// ---------------------------------------------------------
// ADMIN ROUTES
// ---------------------------------------------------------
// This file defines all the URL paths (routes) for admin-only functionality
// All routes here require admin authentication

// Import Express framework for creating routes
import express from "express";
// Import authentication middleware (checks if user is logged in)
import authMiddleware from "../middleware/authMiddleware.js";
// Import role-checking middleware (checks if user has the right role)
import { allowRoles } from "../middleware/roleMiddleware.js";
// Import the controller functions that handle each admin action
import {
    getAllUsers,           // Get list of all users
    updateUserRole,       // Change a user's role (user → admin)
    banUser,              // Ban a user from the platform
    unbanUser,            // Unban a previously banned user
    getDashboardStats,    // Get dashboard analytics (total users, posts, etc.)
    getAllPostsAdmin       // Get all posts for moderation
} from "../controllers/adminController.js";
// Import validation schemas (check if request data is valid before processing)
import {
    validate,             // Validation middleware wrapper
    updateRoleSchema,     // Rules for role update requests
    banSchema             // Rules for ban requests
} from "../validators/adminValidator.js";

// Create a new Express router (a mini-app that handles routes)
const router = express.Router();

// ---------------------------------------------------------
// APPLY MIDDLEWARE TO ALL ADMIN ROUTES
// ---------------------------------------------------------
// These middleware run BEFORE every route below:
router.use(authMiddleware);              // Step 1: Check if user is logged in
router.use(allowRoles('admin'));         // Step 2: Check if user has "admin" role

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin panel APIs (Admin only)
 */

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats fetched successfully
 *       403:
 *         description: Forbidden - Admin only
 */
// GET /api/v1/admin/stats → Returns dashboard stats (total users, posts, likes, etc.)
router.get("/stats", getDashboardStats);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (with pagination)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users fetched successfully
 */
// GET /api/v1/admin/users → Returns list of all users with search & pagination
router.get("/users", getAllUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   put:
 *     summary: Update user role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User role updated successfully
 */
// PUT /api/v1/admin/users/:id/role → Change a user's role (validate input first)
router.put("/users/:id/role", validate(updateRoleSchema), updateUserRole);

/**
 * @swagger
 * /api/v1/admin/users/{id}/ban:
 *   put:
 *     summary: Ban user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User banned successfully
 */
// PUT /api/v1/admin/users/:id/ban → Ban a user (validate input first)
router.put("/users/:id/ban", validate(banSchema), banUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/unban:
 *   put:
 *     summary: Unban user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User unbanned successfully
 */
// PUT /api/v1/admin/users/:id/unban → Unban a previously banned user
router.put("/users/:id/unban", unbanUser);

/**
 * @swagger
 * /api/v1/admin/posts:
 *   get:
 *     summary: Get all posts for moderation
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Posts fetched successfully
 */
// GET /api/v1/admin/posts → Returns all posts for admin moderation
router.get("/posts", getAllPostsAdmin);

// Export this router so it can be mounted in the main app.js file
export default router;
