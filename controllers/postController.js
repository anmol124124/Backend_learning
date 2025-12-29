import Post from "../models/Post.js";
import User from "../models/User.js";
import redisClient from "../config/redis.js";
import { Op } from "sequelize";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { logMetrics } from "../utils/performanceMetrics.js";

/* ===========================
   CREATE POST
=========================== */
export const createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.userId;

    const newPost = await Post.create({ title, content, userId });

    await redisClient.del("posts:all");

    successResponse(res, "Post created successfully", newPost);
  } catch (error) {
    console.log("CREATE POST ERROR:", error);
    errorResponse(res, "Internal server error", 500);
  }
};

/* ===========================
   PAGINATION + SEARCH
=========================== */
export const paginatePosts = async (req, res) => {
  try {
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
  } catch (error) {
    console.log("PAGINATION ERROR:", error);
    errorResponse(res, "Internal server error", 500);
  }
};

/* ===========================
   GET ALL POSTS (REDIS)
=========================== */
export const getAllPosts = async (req, res) => {
  try {
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
  } catch (error) {
    console.log("GET POSTS ERROR:", error);
    errorResponse(res, "Internal server error", 500);
  }
};

/* ===========================
   GET POST BY ID
=========================== */
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: {
        model: User,
        attributes: ["id", "username", "email"],
      },
    });

    if (!post) {
      return errorResponse(res, "Post not found", 404);
    }

    successResponse(res, "Post fetched successfully", post);
  } catch (error) {
    console.log("FETCH POST ERROR:", error);
    errorResponse(res, "Internal server error", 500);
  }
};

/* ===========================
   GET POSTS BY USER
=========================== */
export const getUserPosts = async (req, res) => {
  try {
    const posts = await Post.findAll({
      where: { userId: req.params.id },
      include: {
        model: User,
        attributes: ["id", "username", "email"],
      },
    });

    successResponse(res, "User posts fetched successfully", posts);
  } catch (error) {
    console.log("USER POSTS ERROR:", error);
    errorResponse(res, "Internal server error", 500);
  }
};

/* ===========================
   UPDATE POST
=========================== */
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) return errorResponse(res, "Post not found", 404);

    if (post.userId !== req.user.userId) {
      return errorResponse(res, "Unauthorized", 403);
    }

    post.title = req.body.title;
    post.content = req.body.content;
    await post.save();

    await redisClient.del("posts:all");
    await redisClient.del(`posts:id:${req.params.id}`);

    successResponse(res, "Post updated successfully", post);
  } catch (error) {
    console.log("UPDATE ERROR:", error);
    errorResponse(res, "Internal server error", 500);
  }
};

/* ===========================
   DELETE POST
=========================== */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) return errorResponse(res, "Post not found", 404);

    if (post.userId !== req.user.userId) {
      return errorResponse(res, "Unauthorized", 403);
    }

    await post.destroy();
    await redisClient.del("posts:all");

    successResponse(res, "Post deleted successfully");
  } catch (error) {
    console.log("DELETE ERROR:", error);
    errorResponse(res, "Internal server error", 500);
  }
};

/* ===========================
   ADMIN DELETE
=========================== */
export const adminDeletePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) return errorResponse(res, "Post not found", 404);

    await post.destroy();
    await redisClient.del("posts:all");

    successResponse(res, "Post deleted by admin");
  } catch (error) {
    console.log("ADMIN DELETE ERROR:", error);
    errorResponse(res, "Internal server error", 500);
  }
};
