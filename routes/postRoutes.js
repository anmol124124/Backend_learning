import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

import {
  createPost,
  paginatePosts,
  getAllPosts,
  getPostById,
  getUserPosts,
  updatePost,
  deletePost,
  adminDeletePost,
  toggleLike,          // New: Toggle like/unlike
  likePost,
  unlikePost,
  getPostsWithStats,    // New: Advanced query
  getUserStats,         // New: Advanced query
  getTopPosts          // New: Advanced query
} from "../controllers/postController.js";
import {
  validate,
  validateQuery,
  createPostSchema,
  updatePostSchema,
  paginationSchema
} from "../validators/postValidator.js";
import { createLimiter } from "../middleware/rateLimiter.js";

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
router.delete("/:id", authMiddleware, deletePost);
router.post("/:id/toggle-like", authMiddleware, toggleLike);  // Toggle like/unlike
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
router.delete(
  "/admin/delete/:id",
  authMiddleware,
  allowRoles("admin", "superadmin"),
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
router.get("/stats/top", getTopPosts);

export default router;
