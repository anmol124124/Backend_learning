import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import {
    getAllUsers,
    updateUserRole,
    banUser,
    unbanUser,
    getDashboardStats,
    getAllPostsAdmin
} from "../controllers/adminController.js";
import {
    validate,
    updateRoleSchema,
    banSchema
} from "../validators/adminValidator.js";

const router = express.Router();

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(allowRoles('admin'));  // Pass string directly, not array

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
router.get("/posts", getAllPostsAdmin);

export default router;
