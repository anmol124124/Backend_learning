// ---------------------------------------------------------
// COMMENT ROUTES
// ---------------------------------------------------------
// This file defines URL paths for comment operations

// Import Express framework
import express from "express";
// Import auth middleware (creating comments requires login)
import authMiddleware from "../middleware/authMiddleware.js";
// Import comment controller functions
import {
  createComment,       // Create a new comment on a post
  getPostComments,     // Get all comments for a specific post
} from "../controllers/commentController.js";
// Import validation for comment creation
import { validate, createCommentSchema } from "../validators/commentValidator.js";
// Import rate limiter to prevent comment spam
import { createLimiter } from "../middleware/rateLimiter.js";

// Create a new Express router
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comment management APIs
 */

/**
 * @swagger
 * /api/v1/comments:
 *   post:
 *     summary: Create a comment on a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - comment
 *             properties:
 *               postId:
 *                 type: integer
 *                 example: 10
 *               comment:
 *                 type: string
 *                 example: This is a great post!
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       401:
 *         description: Unauthorized
 */
// POST /api/v1/comments → Create a new comment
// Pipeline: auth check → rate limit → validate input → create comment
router.post("/", authMiddleware, createLimiter, validate(createCommentSchema), createComment);


/**
 * @swagger
 * /api/v1/comments/post/{postId}:
 *   get:
 *     summary: Get all comments of a post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Comments fetched successfully
 */
// GET /api/v1/comments/post/:postId → Get all comments for a specific post
// No auth required - anyone can read comments
router.get("/post/:postId", getPostComments);

// Export this router
export default router;
