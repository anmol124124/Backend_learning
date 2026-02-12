// ---------------------------------------------------------
// POST ROUTES
// ---------------------------------------------------------
// This file defines all URL paths for post operations (CRUD, likes, stats)

// Import Express framework
import express from "express";
// Import auth middleware (some routes need login)
import authMiddleware from "../middleware/authMiddleware.js";
// Import optional auth (user may or may not be logged in)
import optionalAuth from "../middleware/optionalAuth.js";
// Import role-checking middleware (for admin-only routes)
import { allowRoles } from "../middleware/roleMiddleware.js";
// Import all post controller functions
import {
  createPost,            // Create a new post
  paginatePosts,         // Get posts with pagination and search
  getAllPosts,            // Get all posts (cached with Redis)
  getPostById,           // Get a single post by ID
  getUserPosts,          // Get all posts by a specific user
  updatePost,            // Update a post (owner only)
  deletePost,            // Delete a post (owner only)
  adminDeletePost,       // Delete any post (admin only)
  toggleLike,            // Like or unlike a post (toggle)
  likePost,              // Legacy: like a post
  unlikePost,            // Legacy: unlike a post
  getPostsWithStats,     // Get posts with like/comment counts
  getUserStats,          // Get user statistics
  getTopPosts            // Get most-liked posts
} from "../controllers/postController.js";
// Import validation schemas for post data
import {
  validate,              // Validation middleware wrapper
  validateQuery,         // Query parameter validation wrapper
  createPostSchema,      // Rules for creating a post
  updatePostSchema,      // Rules for updating a post
  paginationSchema       // Rules for pagination parameters
} from "../validators/postValidator.js";
// Import rate limiter to prevent spam
import { createLimiter } from "../middleware/rateLimiter.js";

// Create a new Express router
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Post management APIs
 */

/**
 * @swagger
 * /api/v1/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: My First Post
 *               content:
 *                 type: string
 *                 example: This is my post content
 *     responses:
 *       201:
 *         description: Post created successfully
 *       401:
 *         description: Unauthorized
 */
// POST /api/v1/posts → Create a new blog post
// Pipeline: auth check → rate limit → validate input → create post
router.post("/", authMiddleware, createLimiter, validate(createPostSchema), createPost);

/**
 * @swagger
 * /api/v1/posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: List of all posts
 */
// GET /api/v1/posts → Get all posts (uses Redis cache for speed)
// Optional auth: works for logged-in and anonymous users
router.get("/", optionalAuth, getAllPosts);

/**
 * @swagger
 * /api/v1/posts/paginate:
 *   get:
 *     summary: Get paginated posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Paginated posts list
 */
// GET /api/v1/posts/paginate → Get posts page by page with optional search
// Pipeline: optional auth → validate query params → paginate controller
router.get("/paginate", optionalAuth, validateQuery(paginationSchema), paginatePosts);


/**
 * @swagger
 * /api/v1/posts/users/{id}/posts:
 *   get:
 *     summary: Get posts by user ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: User posts fetched successfully
 */
// GET /api/v1/posts/users/:id/posts → Get all posts by a specific user
router.get("/users/:id/posts", getUserPosts);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Post details
 *       404:
 *         description: Post not found
 */
// GET /api/v1/posts/:id → Get a single post with full details
router.get("/:id", optionalAuth, getPostById);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   put:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       401:
 *         description: Unauthorized
 */
// PUT /api/v1/posts/:id → Update an existing post (only the author can update)
router.put("/:id", authMiddleware, validate(updatePostSchema), updatePost);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   delete:
 *     summary: Delete a post (owner)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 */
// DELETE /api/v1/posts/:id → Delete a post (only the author can delete)
router.delete("/:id", authMiddleware, deletePost);

// POST /api/v1/posts/:id/toggle-like → Like or unlike a post (toggle switch behavior)
router.post("/:id/toggle-like", authMiddleware, toggleLike);
// POST /api/v1/posts/:id/toggle-unlike → Legacy unlike endpoint
router.post("/:id/toggle-unlike", authMiddleware, unlikePost);

/**
 * @swagger
 * /api/v1/posts/admin/delete/{id}:
 *   delete:
 *     summary: Admin delete any post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Post deleted by admin
 *       403:
 *         description: Forbidden
 */
// DELETE /api/v1/posts/admin/delete/:id → Admin can delete ANY post
// Pipeline: auth check → role check (admin/superadmin only) → delete post
router.delete(
  "/admin/delete/:id",
  authMiddleware,
  allowRoles("admin", "superadmin"),  // Only admins and superadmins can use this
  adminDeletePost
);

/**
 * @swagger
 * /api/v1/posts/stats/all:
 *   get:
 *     summary: Get all posts with like and comment counts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Posts with stats fetched successfully
 */
// GET /api/v1/posts/stats/all → Get all posts with aggregated statistics
router.get("/stats/all", getPostsWithStats);

/**
 * @swagger
 * /api/v1/posts/stats/user/{userId}:
 *   get:
 *     summary: Get user statistics (total posts, likes, comments)
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User stats fetched successfully
 *       404:
 *         description: User not found
 */
// GET /api/v1/posts/stats/user/:userId → Get statistics for a specific user
router.get("/stats/user/:userId", getUserStats);

/**
 * @swagger
 * /api/v1/posts/stats/top:
 *   get:
 *     summary: Get top posts by like count
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top posts to return
 *     responses:
 *       200:
 *         description: Top posts fetched successfully
 */
// GET /api/v1/posts/stats/top → Get the most-liked posts (leaderboard)
router.get("/stats/top", getTopPosts);

// Export this router
export default router;
