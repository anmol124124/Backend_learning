import express from "express";
import optionalAuth from "../middleware/optionalAuth.js";
import {
    getAllTags,
    getTrendingTags,
    getPostsByTag
} from "../controllers/tagController.js";

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
router.get("/:slug/posts", optionalAuth, getPostsByTag);

export default router;
