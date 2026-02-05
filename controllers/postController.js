import { User, Post, Comment, Like } from "../models/associations.js";
import redisClient from "../config/redis.js";
import sequelize from "../config/db.js";
import { Op } from "sequelize";
import { successResponse } from "../utils/apiResponse.js";
import { logMetrics } from "../utils/performanceMetrics.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

/* ===========================
   CREATE POST
=========================== */
export const createPost = catchAsync(async (req, res, next) => {
  const { title, content, image } = req.body;
  const userId = req.user.userId;

  const newPost = await Post.create({ title, content, image, userId });

  await redisClient.del("posts:all");

  successResponse(res, "Post created successfully", newPost);
});

/* ===========================
   PAGINATION + SEARCH
=========================== */
export const paginatePosts = catchAsync(async (req, res, next) => {
  // Use validatedQuery if available (from validateQuery middleware), otherwise fallback to query
  const queryParams = req.validatedQuery || req.query;
  let { page = 1, limit = 5, search = "" } = queryParams;
  page = parseInt(page);
  limit = parseInt(limit);

  const offset = (page - 1) * limit;

  const whereCondition = search
    ? { title: { [Op.iLike]: `%${search}%` } }
    : {};

  const { rows: posts, count } = await Post.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    include: [
      {
        model: User,
        attributes: ["id", "username", "email"],
      },
      {
        model: Comment,
        attributes: []  // Don't fetch comment data, just count
      }
    ],
    attributes: {
      include: [
        [sequelize.fn('COUNT', sequelize.col('Comments.id')), 'commentCount']
      ]
    },
    group: ['Post.id', 'User.id'],
    subQuery: false,
    order: [["createdAt", "DESC"]],
  });

  // Format the response to include commentCount as a number
  const formattedPosts = posts.map(post => ({
    ...post.toJSON(),
    commentCount: parseInt(post.dataValues.commentCount) || 0
  }));

  successResponse(res, "Posts fetched successfully", {
    posts: formattedPosts,
    pagination: {
      page,
      limit,
      totalPosts: count.length || count,  // count is an array when using GROUP BY
      totalPages: Math.ceil((count.length || count) / limit),
    },
  });
});

/* ===========================
   GET ALL POSTS (REDIS)
=========================== */
export const getAllPosts = catchAsync(async (req, res, next) => {
  const cachedPosts = await redisClient.get("posts:all");

  if (cachedPosts) {
    logMetrics.redisHits++;
    return res.json(JSON.parse(cachedPosts));
  }

  logMetrics.dbHits++;

  const posts = await Post.findAll({
    include: {
      model: User,
      attributes: ["id", "username", "email"],
    },
    order: [["createdAt", "DESC"]],
  });

  await redisClient.set("posts:all", JSON.stringify(posts), { EX: 60 });

  successResponse(res, "Posts fetched successfully", posts);
});

/* ===========================
   GET POST BY ID
=========================== */
export const getPostById = catchAsync(async (req, res, next) => {
  const post = await Post.findByPk(req.params.id, {
    include: {
      model: User,
      attributes: ["id", "username", "email"],
    },
  });

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  successResponse(res, "Post fetched successfully", post);
});

/* ===========================
   GET POSTS BY USER
=========================== */
export const getUserPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.findAll({
    where: { userId: req.params.id },
    include: {
      model: User,
      attributes: ["id", "username", "email"],
    },
  });

  successResponse(res, "User posts fetched successfully", posts);
});

/* ===========================
   UPDATE POST
=========================== */
export const updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByPk(req.params.id);

  if (!post) return next(new AppError("Post not found", 404));

  if (post.userId !== req.user.userId) {
    return next(new AppError("Unauthorized", 403));
  }

  // Update only provided fields
  if (req.body.title !== undefined) post.title = req.body.title;
  if (req.body.content !== undefined) post.content = req.body.content;
  if (req.body.image !== undefined) post.image = req.body.image;

  await post.save();

  await redisClient.del("posts:all");
  await redisClient.del(`posts:id:${req.params.id}`);

  successResponse(res, "Post updated successfully", post);
});

/* ===========================
   DELETE POST (WITH TRANSACTION)
=========================== */
export const deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByPk(req.params.id);

  if (!post) return next(new AppError("Post not found", 404));

  if (post.userId !== req.user.userId) {
    return next(new AppError("Unauthorized", 403));
  }

  // ---------------------------------------------------------
  // USE TRANSACTION: Delete post + comments + likes together
  // ---------------------------------------------------------
  // Why? If we delete post but comments/likes deletion fails,
  // we'll have orphaned data in the database!

  await sequelize.transaction(async (t) => {
    // Step 1: Delete all comments on this post
    await Comment.destroy({
      where: { postId: req.params.id },
      transaction: t
    });

    // Step 2: Delete all likes on this post
    await Like.destroy({
      where: { postId: req.params.id },
      transaction: t
    });

    // Step 3: Delete the post itself
    await post.destroy({ transaction: t });
  });

  // Clear cache after successful transaction
  await redisClient.del("posts:all");
  await redisClient.del(`posts:id:${req.params.id}`);

  successResponse(res, "Post deleted successfully");
});

/* ===========================
   ADMIN DELETE
=========================== */
export const adminDeletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByPk(req.params.id);

  if (!post) return next(new AppError("Post not found", 404));

  await post.destroy();
  await redisClient.del("posts:all");

  successResponse(res, "Post deleted by admin");
});

/* ===========================
   TOGGLE LIKE (NEW - HANDLES BOTH LIKE AND UNLIKE)
=========================== */
export const toggleLike = catchAsync(async (req, res, next) => {
  const { id: postId } = req.params;
  const userId = req.user.userId;

  // Check if post exists
  const post = await Post.findByPk(postId);
  if (!post) return next(new AppError("Post not found", 404));

  // Check if user already liked (including soft-deleted likes)
  const existingLike = await Like.findOne({
    where: { userId, postId },
    paranoid: false  // Include soft-deleted records
  });

  await sequelize.transaction(async (t) => {
    if (existingLike) {
      if (existingLike.deletedAt) {
        // Like was soft-deleted, restore it
        await existingLike.restore({ transaction: t });
      } else {
        // Like exists, soft-delete it (unlike)
        await existingLike.destroy({ transaction: t });
      }
    } else {
      // No like exists, create new one
      await Like.create({ userId, postId }, { transaction: t });
    }
  });

  // Return the new state
  const isLiked = existingLike ? (existingLike.deletedAt ? true : false) : true;
  const likeCount = await Like.count({ where: { postId } });

  successResponse(res, isLiked ? "Post liked successfully" : "Post unliked successfully", {
    isLiked,
    likeCount
  });
});

// LEGACY ENDPOINTS (Keep for backward compatibility)
// 1. LIKE POST (WITH TRANSACTION)
export const likePost = catchAsync(async (req, res, next) => {
  const { id: postId } = req.params;
  const userId = req.user.userId;

  const post = await Post.findByPk(postId);
  if (!post) return next(new AppError("Post not found", 404));

  // Check if user already liked
  const existingLike = await Like.findOne({ where: { userId, postId } });
  if (existingLike) return next(new AppError("You already liked this post", 400));

  // ---------------------------------------------------------
  // USE TRANSACTION: Create like atomically
  // ---------------------------------------------------------
  await sequelize.transaction(async (t) => {
    await Like.create({ userId, postId }, { transaction: t });
  });

  successResponse(res, "Post liked successfully");
});

// 2. UNLIKE POST (WITH TRANSACTION)
export const unlikePost = catchAsync(async (req, res, next) => {
  const { id: postId } = req.params;
  const userId = req.user.userId;

  const existingLike = await Like.findOne({ where: { userId, postId } });
  if (!existingLike) return next(new AppError("You haven't liked this post yet", 400));

  // ---------------------------------------------------------
  // USE TRANSACTION: Delete like atomically
  // ---------------------------------------------------------
  await sequelize.transaction(async (t) => {
    await existingLike.destroy({ transaction: t });
  });

  successResponse(res, "Post unliked successfully");
});

/* ===========================
   ADVANCED QUERIES - GET POSTS WITH STATS
=========================== */
export const getPostsWithStats = catchAsync(async (req, res, next) => {
  const posts = await Post.findAll({
    include: [
      { model: User, attributes: ['id', 'username', 'email'] },
      { model: Like, attributes: [] },
      { model: Comment, attributes: [] }
    ],
    attributes: [
      'id', 'title', 'content', 'createdAt', 'updatedAt',
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount']
    ],
    group: ['Post.id', 'User.id'],
    order: [['createdAt', 'DESC']]
  });

  successResponse(res, "Posts with stats fetched successfully", posts);
});

/* ===========================
   ADVANCED QUERIES - GET USER STATS
=========================== */
export const getUserStats = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findByPk(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Get counts separately for better reliability and performance
  const [totalPosts, totalLikesReceived, totalCommentsReceived] = await Promise.all([
    Post.count({ where: { userId } }),
    Like.count({
      include: [{
        model: Post,
        where: { userId },
        required: true,
        attributes: []
      }]
    }),
    Comment.count({
      include: [{
        model: Post,
        where: { userId },
        required: true,
        attributes: []
      }]
    })
  ]);

  const stats = {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    totalPosts,
    totalLikesReceived,
    totalCommentsReceived
  };

  successResponse(res, "User stats fetched successfully", stats);
});

/* ===========================
   ADVANCED QUERIES - GET TOP POSTS
=========================== */
export const getTopPosts = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;

  const topPosts = await Post.findAll({
    include: [
      { model: User, attributes: ['id', 'username'] },
      { model: Like, attributes: [] }
    ],
    attributes: [
      'id', 'title', 'content', 'createdAt',
      [sequelize.fn('COUNT', sequelize.col('Likes.id')), 'likeCount']
    ],
    group: ['Post.id', 'User.id'],
    order: [[sequelize.literal('likeCount'), 'DESC']],
    limit: limit
  });

  successResponse(res, `Top ${limit} posts fetched successfully`, topPosts);
});
