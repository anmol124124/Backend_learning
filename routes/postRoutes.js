import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
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
} from "../controllers/postController.js";

const router = express.Router();

// Create
router.post("/", authMiddleware, createPost);

// Read
router.get("/", getAllPosts);
router.get("/paginate", paginatePosts);
router.get("/users/:id/posts", getUserPosts);
router.get("/:id", getPostById);

// Update
router.put("/:id", authMiddleware, updatePost);

// Delete
router.delete("/:id", authMiddleware, deletePost);
router.delete(
  "/admin/delete/:id",
  authMiddleware,
  allowRoles("admin", "superadmin"),
  adminDeletePost
);

export default router;
