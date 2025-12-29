import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  createComment,
  getPostComments,
} from "../controllers/commentController.js";

const router = express.Router();

// Create comment (login required)
router.post("/", authMiddleware, createComment);

// Get comments of a post (public)
router.get("/post/:postId", getPostComments);

export default router;
