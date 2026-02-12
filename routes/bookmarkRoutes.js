// ---------------------------------------------------------
// BOOKMARK ROUTES
// ---------------------------------------------------------
// This file defines URL paths for bookmark operations (save/unsave posts)

// Import Express framework for creating routes
import express from "express";
// Import bookmark controller functions
import { toggleBookmark, getUserBookmarks } from "../controllers/bookmarkController.js";
// Import auth middleware (bookmarks require login)
import authMiddleware from "../middleware/authMiddleware.js";

// Create a new Express router
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
// POST /api/v1/bookmarks/:postId/toggle → Add or remove bookmark (like a switch)
// Requires login (authMiddleware) to know WHICH user is bookmarking
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
// GET /api/v1/bookmarks/my-bookmarks → Get all posts the logged-in user has saved
// Requires login to know which user's bookmarks to fetch
router.get("/my-bookmarks", authMiddleware, getUserBookmarks);

// Export this router so it can be mounted in the main app.js
export default router;
