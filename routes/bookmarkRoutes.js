import express from "express";
import { toggleBookmark, getUserBookmarks } from "../controllers/bookmarkController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Bookmarks
 *   description: Bookmark management endpoints
 */

/**
 * @swagger
 * /bookmarks/{postId}/toggle:
 *   post:
 *     summary: Toggle bookmark on a post
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post to bookmark/unbookmark
 *     responses:
 *       200:
 *         description: Bookmark toggled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.post("/:postId/toggle", authMiddleware, toggleBookmark);

/**
 * @swagger
 * /bookmarks/my-bookmarks:
 *   get:
 *     summary: Get user's bookmarked posts
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of bookmarks per page
 *     responses:
 *       200:
 *         description: Bookmarks fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/my-bookmarks", authMiddleware, getUserBookmarks);

export default router;
