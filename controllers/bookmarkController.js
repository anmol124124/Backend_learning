// ---------------------------------------------------------
// BOOKMARK CONTROLLER
// ---------------------------------------------------------
// This file handles all bookmark (save post) related operations

// Importing all the database models we need (User, Post, Bookmark, etc.)
import { User, Post, Bookmark, Like, Comment, Tag, Category } from "../models/associations.js";
// Importing a helper that automatically catches errors so we don't have to write try-catch everywhere
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class to throw meaningful error messages
import AppError from "../utils/AppError.js";
// Importing helper to send consistent success responses to the client
import { successResponse } from "../utils/apiResponse.js";
// Importing the database connection so we can use raw SQL functions like COUNT
import sequelize from "../config/db.js";

// ---------------------------------------------------------
// TOGGLE BOOKMARK (Add or Remove)
// ---------------------------------------------------------
// This function lets a user save or unsave a post (like a light switch - on/off)
export const toggleBookmark = catchAsync(async (req, res, next) => {
    // Grab the post ID from the URL (e.g., /bookmarks/5 → postId = 5)
    const { postId } = req.params;
    // Get the logged-in user's ID from the request (set by auth middleware)
    const userId = req.user.userId;

    // Look up the post in the database to make sure it actually exists
    const post = await Post.findByPk(postId);
    // If no post was found, send a "Post not found" error and stop here
    if (!post) {
        return next(new AppError("Post not found", 404));
    }

    // Check if this user already bookmarked this post
    const existingBookmark = await Bookmark.findOne({
        // Search by both the user's ID and the post's ID
        where: { userId, postId }
    });

    // If a bookmark already exists, it means the user wants to REMOVE it
    if (existingBookmark) {
        // Delete the bookmark from the database
        await existingBookmark.destroy();
        // Send back a success message saying bookmark was removed
        successResponse(res, "Bookmark removed", {
            isBookmarked: false,          // Tell frontend: this post is NOT bookmarked anymore
            postId: parseInt(postId)      // Send back the post ID as a number
        });
    } else {
        // If no bookmark exists, create a NEW one (user is saving the post)
        await Bookmark.create({ userId, postId });
        // Send back a success message saying post was bookmarked
        successResponse(res, "Post bookmarked", {
            isBookmarked: true,           // Tell frontend: this post IS now bookmarked
            postId: parseInt(postId)      // Send back the post ID as a number
        });
    }
});

// ---------------------------------------------------------
// GET USER BOOKMARKS (Saved Posts List)
// ---------------------------------------------------------
// This function fetches all the posts a user has saved, with pagination
export const getUserBookmarks = catchAsync(async (req, res, next) => {
    // Get the logged-in user's ID
    const userId = req.user.userId;
    // Get page number and limit from query string (defaults: page 1, 10 posts per page)
    const { page = 1, limit = 10 } = req.query;
    // Calculate how many records to skip (e.g., page 2 with limit 10 → skip first 10)
    const offset = (page - 1) * limit;

    // Fetch bookmarks from database along with full post details
    const { rows: bookmarks, count } = await Bookmark.findAndCountAll({
        // Only get bookmarks belonging to this user
        where: { userId },
        // Also fetch related data (the actual post, its author, category, tags, etc.)
        include: [
            {
                model: Post,             // Include the full Post data
                as: 'Post',
                include: [
                    {
                        model: User,     // Include the post's author info
                        attributes: ['id', 'username', 'avatar']  // Only get these 3 fields
                    },
                    {
                        model: Category, // Include the post's category
                        as: 'category',
                        attributes: ['id', 'name', 'icon', 'color']  // Only get these fields
                    },
                    {
                        model: Tag,      // Include any tags attached to the post
                        as: 'tags',
                        attributes: ['id', 'name', 'slug'],  // Only get these fields
                        through: { attributes: [] }   // Don't include the join table data
                    },
                    {
                        model: Comment,  // Include comments (just for counting, no actual data)
                        attributes: []
                    },
                    {
                        model: Like,     // Include likes (just for counting, no actual data)
                        attributes: []
                    }
                ],
                attributes: {
                    include: [
                        // Count how many unique comments this post has
                        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Post.Comments.id'))), 'commentCount'],
                        // Count how many unique likes this post has
                        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Post.Likes.id'))), 'likeCount']
                    ]
                }
            }
        ],
        // Group results to avoid duplicate rows caused by multiple joins
        group: ['Bookmark.id', 'Post.id', 'Post.User.id', 'Post.category.id', 'Post.tags.id', 'Post.tags.PostTag.postId', 'Post.tags.PostTag.tagId'],
        // Show newest bookmarks first (most recently saved on top)
        order: [['createdAt', 'DESC']],
        // Only return this many results per page
        limit: parseInt(limit),
        // Skip this many results (for pagination)
        offset: parseInt(offset),
        // Prevent Sequelize from creating a sub-query (performance optimization)
        subQuery: false,
        // Ensure correct count when using joins
        distinct: true
    });

    // Loop through each bookmark and build a clean post object for the response
    const posts = await Promise.all(bookmarks.map(async (bookmark) => {
        // Convert the post from a Sequelize object to a plain JavaScript object
        const post = bookmark.Post.toJSON();

        // Check if this user has liked this particular post
        const userLike = await Like.findOne({
            where: {
                postId: post.id,    // Match the post ID
                userId: userId      // Match the current user's ID
            }
        });

        // Return the post with extra flags for the frontend
        return {
            ...post,                    // Spread (copy) all existing post data
            isBookmarked: true,         // Always true because we're viewing saved posts
            isLiked: !!userLike         // Convert to true/false (true if like record exists)
        };
    }));

    // Get total number of bookmarks for this user (needed for pagination math)
    const totalCount = await Bookmark.count({ where: { userId } });

    // Send the final response with posts array and pagination details
    successResponse(res, "Bookmarks fetched successfully", {
        posts,                                              // The array of bookmarked posts
        pagination: {
            currentPage: parseInt(page),                    // Which page the user is currently on
            totalPages: Math.ceil(totalCount / limit),      // Total number of pages available
            totalBookmarks: totalCount,                     // Total bookmarks this user has saved
            limit: parseInt(limit)                          // How many posts are shown per page
        }
    });
});
