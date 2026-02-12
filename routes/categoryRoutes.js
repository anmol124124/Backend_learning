// ---------------------------------------------------------
// CATEGORY ROUTES
// ---------------------------------------------------------
// This file defines URL paths for category operations

// Import Express framework
import express from "express";
// Import optional auth (user might or might not be logged in)
import optionalAuth from "../middleware/optionalAuth.js";
// Import category controller functions
import {
    getAllCategories,       // Get list of all categories
    getCategoryBySlug,     // Get a single category by its URL slug
    getPostsByCategory     // Get all posts in a category
} from "../controllers/categoryController.js";

// Create a new Express router
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
// GET /api/v1/categories → Returns list of all available categories
// No auth required - anyone can see categories
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
// GET /api/v1/categories/:slug → Get details of a specific category (e.g., /categories/technology)
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
// GET /api/v1/categories/:slug/posts → Get all posts in a category
// Uses optionalAuth: if logged in, shows like status; if not, still works
router.get("/:slug/posts", optionalAuth, getPostsByCategory);

// Export this router
export default router;
