import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";

/* ===========================
   CREATE COMMENT
=========================== */
export const createComment = catchAsync(async (req, res, next) => {
  const { postId, content, parentCommentId } = req.body;
  const userId = req.user.userId;

  // Check if post exists
  const post = await Post.findByPk(postId);
  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  const newComment = await Comment.create({
    content,
    userId,
    postId,
    parentCommentId: parentCommentId || null,
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
    ],
  });

  successResponse(res, "All comments fetched successfully", comments);
});
