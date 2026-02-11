import express from "express";
import optionalAuth from "../middleware/optionalAuth.js";
import {
    getAllCategories,
    getCategoryBySlug,
    getPostsByCategory
} from "../controllers/categoryController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management APIs
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 */
router.get("/", getAllCategories);

/**
 * @swagger
 * /api/v1/categories/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category fetched successfully
 *       404:
 *         description: Category not found
 */
router.get("/:slug", getCategoryBySlug);

/**
 * @swagger
 * /api/v1/categories/{slug}/posts:
 *   get:
 *     summary: Get posts by category
 *     tags: [Categories]
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
 *         description: Category not found
 */
router.get("/:slug/posts", optionalAuth, getPostsByCategory);

export default router;
