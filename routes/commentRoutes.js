import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  createComment,
  getPostComments,
} from "../controllers/commentController.js";

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
router.post("/", authMiddleware, createComment);

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
router.get("/post/:postId", getPostComments);

export default router;
