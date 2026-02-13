// ---------------------------------------------------------
// CATEGORY CONTROLLER
// ---------------------------------------------------------
// This file handles all category-related operations (listing categories, getting posts by category)

// Importing all the database models we need for category operations
import { Category, Post, User, Like, Comment, Tag } from "../models/associations.js";
// Importing error-catching wrapper so we don't need try-catch blocks
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class for proper error responses
import AppError from "../utils/AppError.js";
// Importing helper for sending consistent success responses
import { successResponse } from "../utils/apiResponse.js";
// Importing database connection for advanced SQL functions (like COUNT)
import sequelize from "../config/db.js";
// Importing our new cache helpers (setCache = save, getCache = read)
import { setCache, getCache, clearCache } from "../utils/cache.js";

// ---------------------------------------------------------
// GET ALL CATEGORIES
// ---------------------------------------------------------
// This function returns a list of all available categories (e.g., Technology, Sports, etc.)
export const getAllCategories = catchAsync(async (req, res, next) => {
    // Fetch all categories from the database
    const categories = await Category.findAll({
        // Only get these specific columns (not everything)
        attributes: ['id', 'name', 'slug', 'description', 'icon', 'color', 'postCount'],
        // Sort alphabetically by name (A → Z)
        order: [['name', 'ASC']]
    });

    // Send the categories list back to the client
    successResponse(res, "Categories fetched successfully", { categories });
});

// ---------------------------------------------------------
// GET CATEGORY BY SLUG
// ---------------------------------------------------------
// This function finds a single category by its URL-friendly slug (e.g., "web-development")
export const getCategoryBySlug = catchAsync(async (req, res, next) => {
    // Get the slug from the URL parameter (e.g., /categories/web-development → slug = "web-development")
    const { slug } = req.params;

    // Find the category in the database that matches this slug
    const category = await Category.findOne({
        where: { slug },  // Filter by slug
        // Only return these specific columns
        attributes: ['id', 'name', 'slug', 'description', 'icon', 'color', 'postCount']
    });

    // If no category found with this slug, return a 404 error
    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    // Send the category details back to the client
    successResponse(res, "Category fetched successfully", { category });
});

// ---------------------------------------------------------
// GET POSTS BY CATEGORY
// ---------------------------------------------------------
// This function returns all posts that belong to a specific category, with pagination
export const getPostsByCategory = catchAsync(async (req, res, next) => {
    // Get the category slug from the URL
    const { slug } = req.params;
    // Get pagination parameters (default: page 1, 10 posts per page)
    const { page = 1, limit = 10 } = req.query;
    // Calculate how many records to skip (page 2 with 10 per page → skip first 10)
    const offset = (page - 1) * limit;

    // --- STEP 1: CACHE CHECK ---
    // Save this category's posts under a unique name (e.g., "category:posts:tech:1:10")
    const cacheKey = `category:posts:${slug}:${page}:${limit}`;
    let cachedData = await getCache(cacheKey);
    let posts, totalCount;

    if (cachedData) {
        // If we've loaded this category page recently, use the memory!
        posts = cachedData.posts;
        totalCount = cachedData.totalCount;
    } else {
        // --- STEP 2: DATABASE FETCH ---
        // First, find the category by its slug to get its ID
        const categoryResult = await Category.findOne({ where: { slug } });

        // If category doesn't exist, return a 404 error
        if (!categoryResult) {
            return next(new AppError("Category not found", 404));
        }

        // Now get all posts that belong to this category
        const result = await Post.findAndCountAll({
            // Filter posts by this category's ID
            where: { categoryId: categoryResult.id },
            // Include related data alongside each post
            include: [
                {
                    model: User,                                    // Include post author info
                    attributes: ['id', 'username', 'avatar']       // Only these fields
                },
                {
                    model: Category,                                // Include category info
                    as: 'category',
                    attributes: ['id', 'name', 'slug', 'icon', 'color']
                },
                {
                    model: Tag,                                     // Include tags attached to the post
                    as: 'tags',
                    attributes: ['id', 'name', 'slug'],
                    through: { attributes: [] }                    // Don't include join table data
                },
                {
                    model: Comment,                                 // Include comments (for counting only)
                    attributes: []
                },
                {
                    model: Like,                                    // Include likes (for counting only)
                    attributes: []
                }
            ],
            attributes: {
                include: [
                    // Count how many unique comments each post has
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount'],
                    // Count how many unique likes each post has
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount']
                ]
            },
            // Group results by these columns to avoid duplicate rows from joins
            group: ['Post.id', 'User.id', 'category.id', 'tags.id', 'tags.PostTag.postId', 'tags.PostTag.tagId'],
            // Show newest posts first
            order: [['createdAt', 'DESC']],
            // Pagination: how many posts per page
            limit: parseInt(limit),
            // Pagination: how many posts to skip
            offset: parseInt(offset),
            // Performance: don't create a sub-query
            subQuery: false
        });

        posts = result.rows.map(p => p.toJSON());
        totalCount = await Post.count({ where: { categoryId: categoryResult.id } });

        // Save for 5 minutes (300 seconds)
        await setCache(cacheKey, { posts, totalCount }, 300);
    }

    // --- STEP 3: USER-SPECIFIC DATA (Likes) ---
    // Patch in "isLiked" status based on who is currently looking at the page
    let userLikes = new Set();
    if (req.user && posts.length > 0) {
        const postIds = posts.map(p => p.id);
        const likes = await Like.findAll({
            where: { userId: req.user.userId, postId: postIds },
            attributes: ['postId']
        });
        userLikes = new Set(likes.map(l => l.postId));
    }

    // Merge cached posts with user's specific like status
    const postsWithLikeStatus = posts.map(post => ({
        ...post,
        commentCount: parseInt(post.commentCount) || 0,
        likeCount: parseInt(post.likeCount) || 0,
        isLiked: userLikes.has(post.id)
    }));

    // Send the response with category info, posts, and pagination details
    const finalCategory = posts[0]?.category || cachedData?.category || {
        id: posts[0]?.categoryId,
        name: slug,
        slug: slug
    };

    successResponse(res, "Posts fetched successfully", {
        category: finalCategory,
        posts: postsWithLikeStatus,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalPosts: totalCount,
            limit: parseInt(limit)
        }
    });
});
