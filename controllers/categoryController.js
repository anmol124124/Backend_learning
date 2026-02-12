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

    // First, find the category by its slug to get its ID
    const category = await Category.findOne({ where: { slug } });

    // If category doesn't exist, return a 404 error
    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    // Now get all posts that belong to this category
    const { rows: posts, count } = await Post.findAndCountAll({
        // Filter posts by this category's ID
        where: { categoryId: category.id },
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

    // Check if the logged-in user has liked any of these posts
    let postsWithLikeStatus = posts;
    // Only check likes if a user is logged in
    if (req.user) {
        postsWithLikeStatus = await Promise.all(
            // Loop through each post and check for likes
            posts.map(async (post) => {
                // Look for a like record from this user for this post
                const isLiked = await Like.findOne({
                    where: {
                        userId: req.user.userId,   // Current user's ID
                        postId: post.id            // This post's ID
                    }
                });
                // Return the post data with the like status added
                return {
                    ...post.toJSON(),              // Spread all existing post data
                    isLiked: !!isLiked             // Convert to true/false (true if liked)
                };
            })
        );
    }

    // Get the total number of posts in this category (for pagination math)
    const totalCount = await Post.count({
        where: { categoryId: category.id }
    });

    // Send the response with category info, posts, and pagination details
    successResponse(res, "Posts fetched successfully", {
        category: {
            id: category.id,                   // Category ID
            name: category.name,               // Category name (e.g., "Technology")
            slug: category.slug,               // URL-friendly name (e.g., "technology")
            description: category.description, // Category description
            icon: category.icon,               // Icon for UI display
            color: category.color,             // Color for UI display
            postCount: category.postCount      // Total posts in this category
        },
        posts: postsWithLikeStatus,            // Array of posts with like status
        pagination: {
            currentPage: parseInt(page),                   // Current page number
            totalPages: Math.ceil(totalCount / limit),     // Total pages available
            totalPosts: totalCount,                        // Total post count
            limit: parseInt(limit)                         // Posts per page
        }
    });
});
