import { User, Comment, Post } from "../models/associations.js";
import sequelize from "../config/db.js";  // For transactions
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";

/* ===========================
   CREATE COMMENT (WITH TRANSACTION)
=========================== */
export const createComment = catchAsync(async (req, res, next) => {
  const { postId, content, parentCommentId } = req.body;
  const userId = req.user.userId;

  // Check if post exists
  const post = await Post.findByPk(postId);
  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  // ---------------------------------------------------------
  // USE TRANSACTION: Create comment atomically
  // ---------------------------------------------------------
  const newComment = await sequelize.transaction(async (t) => {
    const comment = await Comment.create({
      content,
      userId,
      postId,
      parentCommentId: parentCommentId || null,
    }, { transaction: t });

    return comment;
  });

  successResponse(res, "Comment added successfully", newComment);
});

/* ===========================
   GET COMMENTS OF A POST
=========================== */
export const getPostComments = catchAsync(async (req, res, next) => {
  const { postId } = req.params;

  const comments = await Comment.findAll({
    where: { postId },
    include: [
      {
        model: Comment,
        as: "replies",
      },
      {
        model: User,
        attributes: ["id", "username"]  // Only fetch needed fields
      }
    ],
    order: [['createdAt', 'ASC']]  // Oldest comments first
  });

  successResponse(res, "All comments fetched successfully", comments);
});
