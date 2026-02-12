// Importing database models needed for comment operations
import { User, Comment, Post } from "../models/associations.js";
// Importing database connection for using transactions (all-or-nothing operations)
import sequelize from "../config/db.js";
// Importing error-catching wrapper to handle errors automatically
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class for meaningful error messages
import AppError from "../utils/AppError.js";
// Importing helper to send consistent success responses
import { successResponse } from "../utils/apiResponse.js";

/* ===========================
   CREATE COMMENT (WITH TRANSACTION)
=========================== */
// This function creates a new comment on a post
export const createComment = catchAsync(async (req, res, next) => {
  // Extract comment data from the request body
  const { postId, content, parentCommentId } = req.body;
  // Get the logged-in user's ID (set by auth middleware)
  const userId = req.user.userId;

  // Check if the post we're commenting on actually exists
  const post = await Post.findByPk(postId);
  // If post doesn't exist, send a 404 error
  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  // ---------------------------------------------------------
  // USE TRANSACTION: Create comment atomically (all-or-nothing)
  // ---------------------------------------------------------
  // A transaction ensures the comment is fully created or not at all
  const newComment = await sequelize.transaction(async (t) => {
    // Create the comment in the database
    const comment = await Comment.create({
      content,                                    // The comment text
      userId,                                     // Who wrote the comment
      postId,                                     // Which post it's on
      parentCommentId: parentCommentId || null,   // If replying to another comment (null if top-level)
    }, { transaction: t });                       // Link this to the transaction

    // Return the created comment
    return comment;
  });

  // Send success response with the newly created comment
  successResponse(res, "Comment added successfully", newComment);
});

/* ===========================
   GET COMMENTS OF A POST
=========================== */
// This function fetches all comments for a specific post
export const getPostComments = catchAsync(async (req, res, next) => {
  // Get the post ID from the URL parameter (e.g., /comments/post/5 → postId = 5)
  const { postId } = req.params;

  // Fetch all comments that belong to this post
  const comments = await Comment.findAll({
    where: { postId },                        // Filter by post ID
    include: [
      {
        model: Comment,                       // Include replies (nested comments)
        as: "replies",                        // Alias for child comments
      },
      {
        model: User,                          // Include the commenter's info
        attributes: ["id", "username"]        // Only fetch ID and username (not email, password, etc.)
      }
    ],
    order: [['createdAt', 'ASC']]            // Show oldest comments first (chronological order)
  });

  // Send the comments list back to the client
  successResponse(res, "All comments fetched successfully", comments);
});
