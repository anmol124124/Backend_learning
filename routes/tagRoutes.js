// ---------------------------------------------------------
// TAG ROUTES
// ---------------------------------------------------------
// This file defines URL paths for tag operations

// Import Express framework
import express from "express";
// Import optional auth (tags are public, but auth adds like status to posts)
import optionalAuth from "../middleware/optionalAuth.js";
// Import tag controller functions
import {
    getAllTags,           // Get list of all tags
    getTrendingTags,     // Get most popular tags from last 30 days
    getPostsByTag        // Get all posts with a specific tag
} from "../controllers/tagController.js";

// Create a new Express router
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: Tag management APIs
 */

/**
 * @swagger
 * /api/v1/tags:
 *   get:
 *     summary: Get all tags
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: Tags fetched successfully
 */
// GET /api/v1/tags → Returns list of all tags sorted by usage
router.get("/", getAllTags);

/**
 * @swagger
 * /api/v1/tags/trending:
 *   get:
 *     summary: Get trending tags (last 30 days)
 *     tags: [Tags]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Trending tags fetched successfully
 */
// GET /api/v1/tags/trending → Returns most popular tags from the last 30 days
router.get("/trending", getTrendingTags);

/**
 * @swagger
 * /api/v1/tags/{slug}/posts:
 *   get:
 *     summary: Get posts by tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Posts fetched successfully
 *       404:
 *         description: Tag not found
 */
// GET /api/v1/tags/:slug/posts → Get all posts that have a specific tag
// Uses optionalAuth: if logged in, shows like status on posts
router.get("/:slug/posts", optionalAuth, getPostsByTag);

// Export this router
export default router;
