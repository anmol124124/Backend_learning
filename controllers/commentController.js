import Comment from "../models/Comment.js";
import Post from "../models/Post.js";

/* ===========================
   CREATE COMMENT
=========================== */
export const createComment = async (req, res) => {
  try {
    const { postId, content, parentCommentId } = req.body;
    const userId = req.user.userId;

    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = await Comment.create({
      content,
      userId,
      postId,
      parentCommentId: parentCommentId || null,
    });

    res.json({
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    console.log("COMMENT CREATE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================
   GET COMMENTS OF A POST
=========================== */
export const getPostComments = async (req, res) => {
  try {
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

    res.json({
      message: "All comments fetched successfully",
      comments,
    });
  } catch (error) {
    console.log("FETCH COMMENTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
