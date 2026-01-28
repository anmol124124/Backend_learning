import Post from "../models/Post.js";
import User from "../models/User.js";
import redisClient from "../config/redis.js";
import { Op } from "sequelize";
import { successResponse } from "../utils/apiResponse.js";
import { logMetrics } from "../utils/performanceMetrics.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { Like } from "../models/associations.js";
/* ===========================
   CREATE POST
=========================== */
export const createPost = catchAsync(async (req, res, next) => {
  const { title, content } = req.body;
  const userId = req.user.userId;

  const newPost = await Post.create({ title, content, userId });

  await redisClient.del("posts:all");

  successResponse(res, "Post created successfully", newPost);
});

/* ===========================
   PAGINATION + SEARCH
=========================== */
export const paginatePosts = catchAsync(async (req, res, next) => {
  let { page = 1, limit = 5, search = "" } = req.query;
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
    include: {
      model: User,
      attributes: ["id", "username", "email"],
    },
    order: [["createdAt", "DESC"]],
  });

  successResponse(res, "Posts fetched successfully", {
    posts,
    pagination: {
      page,
      limit,
      totalPosts: count,
      totalPages: Math.ceil(count / limit),
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

  post.title = req.body.title;
  post.content = req.body.content;
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
//for like and unlike posts
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