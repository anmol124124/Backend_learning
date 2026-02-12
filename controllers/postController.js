// Importing all database models needed for post operations
import { User, Post, Comment, Like, Tag, PostTag, Category, Bookmark } from "../models/associations.js";
// Importing Redis client for caching (storing data in fast memory to avoid slow database queries)
import redisClient from "../config/redis.js";
// Importing database connection for advanced SQL functions and transactions
import sequelize from "../config/db.js";
// Importing Sequelize operators like iLike, gt (greater than), etc. for database queries
import { Op } from "sequelize";
// Importing helper for sending consistent success responses
import { successResponse } from "../utils/apiResponse.js";
// Importing performance tracking utility
import { logMetrics } from "../utils/performanceMetrics.js";
// Importing error-catching wrapper to handle errors automatically
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class for meaningful error messages
import AppError from "../utils/AppError.js";
// Importing helper function to create or find existing tags
import { createOrGetTags } from "./tagController.js";

/* ===========================
   CREATE POST
=========================== */
// This function creates a new blog post
export const createPost = catchAsync(async (req, res, next) => {
  // Extract post data from the request body (what the user submitted in the form)
  const { title, content, image, tags } = req.body;
  // Get the logged-in user's ID (they're the author of this post)
  const userId = req.user.userId;

  // Create the new post in the database
  const newPost = await Post.create({ title, content, image, userId });

  // If the user provided tags (e.g., ["javascript", "react"]), attach them to the post
  if (tags && tags.length > 0) {
    // Create new tags or find existing ones in the database
    const tagRecords = await createOrGetTags(tags);
    // Link the tags to this post (creates entries in the PostTag join table)
    await newPost.setTags(tagRecords);
  }

  // Fetch the post again but this time include its tags in the response
  const postWithTags = await Post.findByPk(newPost.id, {
    include: [
      // Include the tags attached to this post
      { model: Tag, as: 'tags', attributes: ['id', 'name', 'slug'], through: { attributes: [] } }
    ]
  });

  // Clear the cached "all posts" from Redis since we added a new post
  await redisClient.del("posts:all");

  // Send success response with the newly created post (including its tags)
  successResponse(res, "Post created successfully", postWithTags);
});

/* ===========================
   PAGINATION + SEARCH
=========================== */
// This function fetches posts with pagination (page by page) and optional search
export const paginatePosts = catchAsync(async (req, res, next) => {
  // Use validated query params if available (from validation middleware), otherwise use raw query
  const queryParams = req.validatedQuery || req.query;
  // Get page number, results per page, and search term (with defaults)
  let { page = 1, limit = 5, search = "" } = queryParams;
  // Convert page and limit from strings to numbers
  page = parseInt(page);
  limit = parseInt(limit);

  // Calculate how many records to skip (e.g., page 3 with 5 per page → skip first 10)
  const offset = (page - 1) * limit;

  // Build search filter: if search term exists, search in post titles (case-insensitive)
  const whereCondition = search
    ? { title: { [Op.iLike]: `%${search}%` } }  // iLike = case-insensitive search
    : {};  // Empty object = no filter (get all posts)

  // Get the current user's ID if they're logged in (used for like/bookmark status)
  const currentUserId = req.user?.userId;

  // Fetch posts from the database with all related data
  const { rows: posts, count } = await Post.findAndCountAll({
    where: whereCondition,          // Apply search filter
    limit,                          // How many posts per page
    offset,                         // How many posts to skip
    include: [
      {
        model: User,                // Include the post's author
        attributes: ["id", "username", "email"],  // Only these author fields
      },
      {
        model: Tag,                 // Include tags attached to the post
        as: 'tags',
        attributes: ['id', 'name', 'slug'],
        through: { attributes: [] }  // Don't include join table data
      },
      {
        model: Category,            // Include the post's category
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color']
      },
      {
        model: Comment,             // Include comments (empty attributes = just for counting)
        attributes: []
      },
      {
        model: Like,                // Include likes (empty attributes = just for counting)
        attributes: []
      }
    ],
    attributes: {
      include: [
        // Count unique comments for each post using SQL COUNT function
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount'],
        // Count unique likes for each post using SQL COUNT function
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount']
      ]
    },
    // Group by these columns to prevent duplicate rows from joins
    group: ['Post.id', 'User.id', 'tags.id', 'tags.PostTag.postId', 'tags.PostTag.tagId', 'category.id'],
    // Performance optimization: don't create a sub-query
    subQuery: false,
    // Show newest posts first
    order: [["createdAt", "DESC"]],
  });

  // For each post, check if the current user has liked and bookmarked it
  const formattedPosts = await Promise.all(posts.map(async (post) => {
    let isLiked = false;          // Default: user hasn't liked this post
    let isBookmarked = false;     // Default: user hasn't bookmarked this post

    // Only check like/bookmark status if a user is logged in
    if (currentUserId) {
      // Check if this user has liked this post
      const userLike = await Like.findOne({
        where: {
          postId: post.id,         // This post
          userId: currentUserId    // This user
        }
      });
      isLiked = !!userLike;       // Convert to true/false

      // Check if this user has bookmarked this post
      const userBookmark = await Bookmark.findOne({
        where: {
          postId: post.id,         // This post
          userId: currentUserId    // This user
        }
      });
      isBookmarked = !!userBookmark;  // Convert to true/false
    }

    // Return a clean post object with all the extra info
    return {
      ...post.toJSON(),                                              // Spread all post data
      commentCount: parseInt(post.dataValues.commentCount) || 0,     // Parse comment count as number
      likeCount: parseInt(post.dataValues.likeCount) || 0,           // Parse like count as number
      isLiked,                                                       // Has current user liked this?
      isBookmarked                                                   // Has current user bookmarked this?
    };
  }));

  // Send the response with posts and pagination metadata
  successResponse(res, "Posts fetched successfully", {
    posts: formattedPosts,            // Array of formatted posts
    pagination: {
      page,                           // Current page number
      limit,                          // Posts per page
      totalPosts: count.length || count,   // Total posts (count is array when using GROUP BY)
      totalPages: Math.ceil((count.length || count) / limit),  // Total pages available
    },
  });
});

/* ===========================
   GET ALL POSTS (WITH REDIS CACHING)
=========================== */
// This function fetches ALL posts, using Redis cache for speed
export const getAllPosts = catchAsync(async (req, res, next) => {
  // Try to get posts from Redis cache first (much faster than database)
  const cachedPosts = await redisClient.get("posts:all");

  // If posts were found in cache, return them immediately
  if (cachedPosts) {
    logMetrics.redisHits++;                // Track that we got a cache hit
    return res.json(JSON.parse(cachedPosts));  // Parse JSON string back to object and send
  }

  // If not in cache, we need to fetch from the database
  logMetrics.dbHits++;                     // Track that we had to hit the database

  // Get current user ID if logged in (for like status)
  const currentUserId = req.user?.userId;

  // Fetch all posts from the database
  const posts = await Post.findAll({
    include: [
      {
        model: User,                       // Include post author info
        attributes: ["id", "username", "email"],
      },
      {
        model: Like,                       // Include like records (to check if user liked)
        attributes: ["userId"]             // Only need the userId from likes
      }
    ],
    order: [["createdAt", "DESC"]],       // Newest posts first
  });

  // Format each post: add isLiked flag and likeCount
  const formattedPosts = posts.map(post => {
    const postData = post.toJSON();        // Convert Sequelize object to plain JavaScript object
    let isLiked = false;                   // Default: not liked

    // If user is logged in and post has likes, check if this user liked it
    if (currentUserId && postData.Likes) {
      // Check if any of the likes belong to the current user
      isLiked = postData.Likes.some(like => like.userId === currentUserId);
    }

    return {
      ...postData,                         // Spread all post data
      likeCount: postData.Likes?.length || 0,  // Count total likes (or 0 if none)
      isLiked,                             // Whether current user liked this post
      Likes: undefined                     // Remove the raw Likes array from the response (not needed)
    };
  });

  // Save the formatted posts to Redis cache for 60 seconds
  // Next time someone requests posts within 60 seconds, it'll be instant!
  await redisClient.set("posts:all", JSON.stringify(formattedPosts), { EX: 60 });

  // Send the posts back to the client
  successResponse(res, "Posts fetched successfully", formattedPosts);
});

/* ===========================
   GET POST BY ID
=========================== */
// This function fetches a single post by its ID (e.g., /posts/5)
export const getPostById = catchAsync(async (req, res, next) => {
  // Get the current user's ID if they're logged in
  const currentUserId = req.user?.userId;

  // Find the post by its ID (from the URL parameter)
  const post = await Post.findByPk(req.params.id, {
    include: [
      {
        model: User,                       // Include post author info
        attributes: ["id", "username", "email", "avatar"],
      },
      {
        model: Tag,                        // Include tags attached to the post
        as: 'tags',
        attributes: ['id', 'name', 'slug'],
        through: { attributes: [] }       // Don't include join table data
      },
      {
        model: Category,                   // Include the post's category
        as: 'category',
        attributes: ['id', 'name', 'icon', 'color']
      },
      {
        model: Like,                       // Include likes (to count and check user's like)
        attributes: ["id", "userId"]
      }
    ],
  });

  // If no post found with this ID, return a 404 error
  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  // Check if the current user has liked this post
  let isLiked = false;
  if (currentUserId && post.Likes) {
    // Check if any of the likes belong to the current user
    isLiked = post.Likes.some(like => like.userId === currentUserId);
  }

  // Convert to plain object and add extra fields
  const postData = post.toJSON();
  const responseData = {
    ...postData,                           // Spread all post data
    likeCount: post.Likes?.length || 0,    // Total number of likes
    isLiked,                               // Whether current user liked this post
    Likes: undefined                       // Remove raw Likes array from response
  };

  // Send the post data back to the client
  successResponse(res, "Post fetched successfully", responseData);
});

/* ===========================
   GET POSTS BY USER
=========================== */
// This function fetches all posts written by a specific user
export const getUserPosts = catchAsync(async (req, res, next) => {
  // Find all posts where the userId matches the ID from the URL parameter
  const posts = await Post.findAll({
    where: { userId: req.params.id },      // Filter by user ID
    include: {
      model: User,                          // Include the author's info
      attributes: ["id", "username", "email"],
    },
  });

  // Send the user's posts back to the client
  successResponse(res, "User posts fetched successfully", posts);
});

/* ===========================
   UPDATE POST
=========================== */
// This function lets a user update their own post
export const updatePost = catchAsync(async (req, res, next) => {
  // Find the post by its ID
  const post = await Post.findByPk(req.params.id);

  // If post doesn't exist, return a 404 error
  if (!post) return next(new AppError("Post not found", 404));

  // Check if the logged-in user is the author of this post
  if (post.userId !== req.user.userId) {
    // If not, they can't edit someone else's post
    return next(new AppError("Unauthorized", 403));
  }

  // Update only the fields that were provided in the request
  if (req.body.title !== undefined) post.title = req.body.title;       // Update title if provided
  if (req.body.content !== undefined) post.content = req.body.content; // Update content if provided
  if (req.body.image !== undefined) post.image = req.body.image;       // Update image if provided

  // Save the changes to the database
  await post.save();

  // Clear the cache since this post was modified
  await redisClient.del("posts:all");                           // Clear all posts cache
  await redisClient.del(`posts:id:${req.params.id}`);          // Clear this specific post's cache

  // Send the updated post back to the client
  successResponse(res, "Post updated successfully", post);
});

/* ===========================
   DELETE POST (WITH TRANSACTION)
=========================== */
// This function lets a user delete their own post (along with its comments and likes)
export const deletePost = catchAsync(async (req, res, next) => {
  // Find the post by its ID
  const post = await Post.findByPk(req.params.id);

  // If post doesn't exist, return a 404 error
  if (!post) return next(new AppError("Post not found", 404));

  // Check if the logged-in user is the author of this post
  if (post.userId !== req.user.userId) {
    // If not, they can't delete someone else's post
    return next(new AppError("Unauthorized", 403));
  }

  // ---------------------------------------------------------
  // USE TRANSACTION: Delete post + comments + likes all together
  // ---------------------------------------------------------
  // Why a transaction? If we delete the post but comments fail to delete,
  // we'd have orphaned comments in the database with no parent post!
  // A transaction ensures ALL deletions succeed or NONE do.

  await sequelize.transaction(async (t) => {
    // Step 1: Delete all comments on this post first
    await Comment.destroy({
      where: { postId: req.params.id },    // Delete comments for this post
      transaction: t                        // Link to the transaction
    });

    // Step 2: Delete all likes on this post
    await Like.destroy({
      where: { postId: req.params.id },    // Delete likes for this post
      transaction: t                        // Link to the transaction
    });

    // Step 3: Finally, delete the post itself
    await post.destroy({ transaction: t });
  });

  // Clear the cache after successful deletion
  await redisClient.del("posts:all");                           // Clear all posts cache
  await redisClient.del(`posts:id:${req.params.id}`);          // Clear this specific post's cache

  // Send success response
  successResponse(res, "Post deleted successfully");
});

/* ===========================
   ADMIN DELETE POST
=========================== */
// This function lets an admin delete ANY post (regardless of who wrote it)
export const adminDeletePost = catchAsync(async (req, res, next) => {
  // Find the post by its ID
  const post = await Post.findByPk(req.params.id);

  // If post doesn't exist, return a 404 error
  if (!post) return next(new AppError("Post not found", 404));

  // Admin can delete any post, no ownership check needed
  await post.destroy();
  // Clear the all posts cache
  await redisClient.del("posts:all");

  // Send success response
  successResponse(res, "Post deleted by admin");
});

/* ===========================
   TOGGLE LIKE (Handles both Like and Unlike in one function)
=========================== */
// This function lets a user like or unlike a post (toggle behavior - like a switch)
export const toggleLike = catchAsync(async (req, res, next) => {
  // Get post ID from URL and rename 'id' to 'postId' for clarity
  const { id: postId } = req.params;
  // Get the logged-in user's ID
  const userId = req.user.userId;

  // Check if the post exists
  const post = await Post.findByPk(postId);
  if (!post) return next(new AppError("Post not found", 404));

  // Check if the user already liked this post (including soft-deleted likes)
  const existingLike = await Like.findOne({
    where: { userId, postId },
    paranoid: false  // Include soft-deleted records (likes that were "removed" but not permanently deleted)
  });

  // Use a transaction to ensure the like/unlike operation is atomic
  await sequelize.transaction(async (t) => {
    if (existingLike) {
      // A like record exists for this user-post combination
      if (existingLike.deletedAt) {
        // The like was soft-deleted (user unliked before) → Restore it (re-like)
        await existingLike.restore({ transaction: t });
      } else {
        // The like is active → Soft-delete it (unlike)
        await existingLike.destroy({ transaction: t });
      }
    } else {
      // No like record exists at all → Create a new like
      await Like.create({ userId, postId }, { transaction: t });
    }
  });

  // Clear the cache since like count changed
  await redisClient.del("posts:all");

  // Determine the new like state after the toggle
  // If like existed and was soft-deleted → now restored → isLiked = true
  // If like existed and was active → now soft-deleted → isLiked = false
  // If no like existed → now created → isLiked = true
  const isLiked = existingLike ? (existingLike.deletedAt ? true : false) : true;
  // Count the total likes for this post
  const likeCount = await Like.count({ where: { postId } });

  // Send response with the new like state and count
  successResponse(res, isLiked ? "Post liked successfully" : "Post unliked successfully", {
    isLiked,      // Whether the post is now liked by this user
    likeCount     // Total number of likes on this post
  });
});

// LEGACY ENDPOINTS (Kept for backward compatibility with older frontend versions)
// 1. LIKE POST (WITH TRANSACTION) - Old way: separate like endpoint
export const likePost = catchAsync(async (req, res, next) => {
  // Get post ID from URL parameter
  const { id: postId } = req.params;
  // Get the logged-in user's ID
  const userId = req.user.userId;

  // Check if the post exists
  const post = await Post.findByPk(postId);
  if (!post) return next(new AppError("Post not found", 404));

  // Check if user already liked this post
  const existingLike = await Like.findOne({ where: { userId, postId } });
  // If already liked, return an error (can't like twice)
  if (existingLike) return next(new AppError("You already liked this post", 400));

  // ---------------------------------------------------------
  // USE TRANSACTION: Create the like atomically (all-or-nothing)
  // ---------------------------------------------------------
  await sequelize.transaction(async (t) => {
    // Create a new like record in the database
    await Like.create({ userId, postId }, { transaction: t });
  });

  // Send success response
  successResponse(res, "Post liked successfully");
});

// 2. UNLIKE POST (WITH TRANSACTION) - Old way: separate unlike endpoint
export const unlikePost = catchAsync(async (req, res, next) => {
  // Get post ID from URL parameter
  const { id: postId } = req.params;
  // Get the logged-in user's ID
  const userId = req.user.userId;

  // Check if the user actually liked this post
  const existingLike = await Like.findOne({ where: { userId, postId } });
  // If no like found, they can't unlike what they never liked
  if (!existingLike) return next(new AppError("You haven't liked this post yet", 400));

  // ---------------------------------------------------------
  // USE TRANSACTION: Delete the like atomically (all-or-nothing)
  // ---------------------------------------------------------
  await sequelize.transaction(async (t) => {
    // Remove the like record from the database
    await existingLike.destroy({ transaction: t });
  });

  // Send success response
  successResponse(res, "Post unliked successfully");
});

/* ===========================
   ADVANCED QUERIES - GET POSTS WITH STATS
=========================== */
// This function fetches all posts with their like and comment counts (analytics view)
export const getPostsWithStats = catchAsync(async (req, res, next) => {
  // Fetch all posts with aggregated statistics
  const posts = await Post.findAll({
    include: [
      { model: User, attributes: ['id', 'username', 'email'] },  // Post author info
      { model: Like, attributes: [] },                             // Likes (for counting only)
      { model: Comment, attributes: [] }                           // Comments (for counting only)
    ],
    attributes: [
      'id', 'title', 'content', 'createdAt', 'updatedAt',        // Post fields
      // Count unique likes using SQL COUNT(DISTINCT) function
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount'],
      // Count unique comments using SQL COUNT(DISTINCT) function
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount']
    ],
    // Group by post and user to get correct counts
    group: ['Post.id', 'User.id'],
    // Show newest posts first
    order: [['createdAt', 'DESC']]
  });

  // Send the posts with their statistics
  successResponse(res, "Posts with stats fetched successfully", posts);
});

/* ===========================
   ADVANCED QUERIES - GET USER STATS
=========================== */
// This function fetches statistics for a specific user (total posts, likes received, comments received)
export const getUserStats = catchAsync(async (req, res, next) => {
  // Get the user ID from the URL parameter
  const { userId } = req.params;

  // Find the user in the database
  const user = await User.findByPk(userId);
  // If user doesn't exist, return a 404 error
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Run all three count queries at the same time (in parallel) for speed
  const [totalPosts, totalLikesReceived, totalCommentsReceived] = await Promise.all([
    // Count how many posts this user has written
    Post.count({ where: { userId } }),
    // Count how many likes this user's posts have received
    Like.count({
      include: [{
        model: Post,
        where: { userId },          // Only count likes on posts by THIS user
        required: true,              // Inner join (only count likes that have matching posts)
        attributes: []               // Don't fetch post data, just count
      }]
    }),
    // Count how many comments this user's posts have received
    Comment.count({
      include: [{
        model: Post,
        where: { userId },          // Only count comments on posts by THIS user
        required: true,              // Inner join
        attributes: []               // Don't fetch post data, just count
      }]
    })
  ]);

  // Build the stats object
  const stats = {
    id: user.id,                     // User's ID
    username: user.username,         // User's display name
    email: user.email,               // User's email
    createdAt: user.createdAt,       // When the user registered
    totalPosts,                      // How many posts they've written
    totalLikesReceived,              // How many likes their posts got
    totalCommentsReceived            // How many comments their posts got
  };

  // Send the user stats back to the client
  successResponse(res, "User stats fetched successfully", stats);
});

/* ===========================
   ADVANCED QUERIES - GET TOP POSTS
=========================== */
// This function fetches the most-liked posts (leaderboard style)
export const getTopPosts = catchAsync(async (req, res, next) => {
  // Get the limit from query string (default: top 10 posts)
  const limit = parseInt(req.query.limit) || 10;

  // Fetch posts ordered by the number of likes (most liked first)
  const topPosts = await Post.findAll({
    include: [
      { model: User, attributes: ['id', 'username'] },  // Include post author
      { model: Like, attributes: [] }                     // Include likes (for counting only)
    ],
    attributes: [
      'id', 'title', 'content', 'createdAt',             // Post fields
      // Count total likes for each post
      [sequelize.fn('COUNT', sequelize.col('Likes.id')), 'likeCount']
    ],
    // Group by post and user to get correct counts
    group: ['Post.id', 'User.id'],
    // Sort by like count in descending order (most likes first)
    order: [[sequelize.literal('likeCount'), 'DESC']],
    // Only return this many posts
    limit: limit
  });

  // Send the top posts back to the client
  successResponse(res, `Top ${limit} posts fetched successfully`, topPosts);
});
