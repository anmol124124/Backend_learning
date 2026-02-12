// ---------------------------------------------------------
// TAG CONTROLLER
// ---------------------------------------------------------
// This file handles all tag-related operations (listing tags, trending tags, posts by tag)

// Importing the Tag model to interact with the tags table
import Tag from "../models/Tag.js";
// Importing the Post model to interact with the posts table
import Post from "../models/Post.js";
// Importing the PostTag model (join table that connects posts and tags)
import PostTag from "../models/PostTag.js";
// Importing the User model for including author info with posts
import User from "../models/User.js";
// Importing the Like model for counting likes on posts
import Like from "../models/Like.js";
// Importing the Comment model for counting comments on posts
import Comment from "../models/Comment.js";
// Importing error-catching wrapper to handle errors automatically
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class for meaningful error messages
import AppError from "../utils/AppError.js";
// Importing helper for sending consistent success responses
import { successResponse } from "../utils/apiResponse.js";
// Importing database connection for advanced SQL functions
import sequelize from "../config/db.js";

// ---------------------------------------------------------
// GET ALL TAGS
// ---------------------------------------------------------
// This function returns a list of all tags, sorted by most used first
export const getAllTags = catchAsync(async (req, res, next) => {
    // Fetch all tags from the database
    const tags = await Tag.findAll({
        // Sort by usage count (most used first), then alphabetically if tie
        order: [['usageCount', 'DESC'], ['name', 'ASC']],
        // Only return these specific columns
        attributes: ['id', 'name', 'slug', 'usageCount']
    });

    // Send the tags list back to the client
    successResponse(res, "Tags fetched successfully", { tags });
});

// ---------------------------------------------------------
// GET TRENDING TAGS
// ---------------------------------------------------------
// This function returns the most popular tags from the last 30 days
export const getTrendingTags = catchAsync(async (req, res, next) => {
    // Get the limit from query string (default: show top 10 trending tags)
    const { limit = 10 } = req.query;

    // Calculate the date 30 days ago from now
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch tags that have the most posts in the last 30 days
    const trendingTags = await Tag.findAll({
        include: [
            {
                model: Post,                    // Include posts linked to each tag
                as: 'posts',
                attributes: [],                 // Don't fetch post data (just for counting)
                where: {
                    createdAt: {
                        // Only count posts created in the last 30 days
                        [sequelize.Op.gte]: thirtyDaysAgo  // gte = "Greater Than or Equal"
                    }
                },
                through: { attributes: [] }    // Don't include join table data
            }
        ],
        attributes: [
            'id',                               // Tag ID
            'name',                             // Tag name (e.g., "javascript")
            'slug',                             // URL-friendly name (e.g., "javascript")
            'usageCount',                       // Total times this tag has been used
            // Count how many recent posts use this tag
            [sequelize.fn('COUNT', sequelize.col('posts.id')), 'recentPostCount']
        ],
        // Group results by tag to get correct counts
        group: ['Tag.id'],
        // Sort by recent post count (most trending first)
        order: [[sequelize.literal('recentPostCount'), 'DESC']],
        // Only return this many tags
        limit: parseInt(limit),
        // Performance optimization
        subQuery: false
    });

    // Send the trending tags back to the client
    successResponse(res, "Trending tags fetched successfully", { tags: trendingTags });
});

// ---------------------------------------------------------
// GET POSTS BY TAG
// ---------------------------------------------------------
// This function returns all posts that have a specific tag, with pagination
export const getPostsByTag = catchAsync(async (req, res, next) => {
    // Get the tag slug from the URL (e.g., /tags/javascript → slug = "javascript")
    const { slug } = req.params;
    // Get pagination parameters (default: page 1, 10 posts per page)
    const { page = 1, limit = 10 } = req.query;
    // Calculate how many records to skip for pagination
    const offset = (page - 1) * limit;

    // Find the tag by its slug
    const tag = await Tag.findOne({ where: { slug } });

    // If tag doesn't exist, return a 404 error
    if (!tag) {
        return next(new AppError("Tag not found", 404));
    }

    // Fetch all posts that have this tag
    const { rows: posts, count } = await Post.findAndCountAll({
        include: [
            {
                model: User,                        // Include post author info
                attributes: ['id', 'username', 'avatar']
            },
            {
                model: Tag,                          // Include all tags on each post
                as: 'tags',
                attributes: ['id', 'name', 'slug'],
                through: { attributes: [] }         // Don't include join table data
            },
            {
                model: Comment,                      // Include comments (for counting only)
                attributes: []
            },
            {
                model: Like,                         // Include likes (for counting only)
                attributes: []
            }
        ],
        where: {
            // Filter posts where the tag ID matches (uses the join table behind the scenes)
            '$tags.id$': tag.id
        },
        attributes: {
            include: [
                // Count unique comments for each post
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount'],
                // Count unique likes for each post
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount']
            ]
        },
        // Group by these columns to prevent duplicate rows
        group: ['Post.id', 'User.id', 'tags.id', 'tags.PostTag.postId', 'tags.PostTag.tagId'],
        // Show newest posts first
        order: [['createdAt', 'DESC']],
        // Pagination limits
        limit: parseInt(limit),
        offset: parseInt(offset),
        // Performance optimization
        subQuery: false
    });

    // Check if the logged-in user has liked any of these posts
    let postsWithLikeStatus = posts;
    if (req.user) {
        postsWithLikeStatus = await Promise.all(
            posts.map(async (post) => {
                // Check if this user liked this post
                const isLiked = await Like.findOne({
                    where: {
                        userId: req.user.userId,     // Current user's ID
                        postId: post.id              // This post's ID
                    }
                });
                return {
                    ...post.toJSON(),                // Spread all post data
                    isLiked: !!isLiked               // Convert to true/false
                };
            })
        );
    }

    // Get total count of posts with this tag (for pagination)
    const totalCount = await Post.count({
        include: [{
            model: Tag,
            as: 'tags',
            where: { id: tag.id },                   // Only posts with this specific tag
            through: { attributes: [] }
        }]
    });

    // Send response with tag info, posts, and pagination
    successResponse(res, "Posts fetched successfully", {
        tag: {
            id: tag.id,                              // Tag ID
            name: tag.name,                          // Tag name
            slug: tag.slug,                          // Tag slug
            usageCount: tag.usageCount               // Total times tag has been used
        },
        posts: postsWithLikeStatus,                  // Array of posts with like status
        pagination: {
            currentPage: parseInt(page),             // Current page number
            totalPages: Math.ceil(totalCount / limit),  // Total pages
            totalPosts: totalCount,                  // Total posts with this tag
            limit: parseInt(limit)                   // Posts per page
        }
    });
});

// ---------------------------------------------------------
// HELPER: CREATE OR GET TAGS
// ---------------------------------------------------------
// This helper function is used internally when creating posts
// It takes tag names and either finds existing tags or creates new ones
export const createOrGetTags = async (tagNames) => {
    // If no tag names provided, return an empty array
    if (!tagNames || tagNames.length === 0) return [];

    // Process each tag name in parallel
    const tagRecords = await Promise.all(
        tagNames.map(async (name) => {
            // Remove extra spaces from the tag name
            const trimmedName = name.trim();
            // Create a URL-friendly slug (e.g., "Web Dev" → "web-dev")
            const slug = trimmedName.toLowerCase().replace(/\s+/g, '-');

            // Try to find the tag, or create it if it doesn't exist
            const [tag, created] = await Tag.findOrCreate({
                where: { slug },                     // Search by slug
                defaults: {
                    name: trimmedName,               // Display name
                    slug,                            // URL-friendly name
                    usageCount: 0                    // Start with 0 uses
                }
            });

            // Update the usage count
            if (!created) {
                // Tag already existed → increment usage count by 1
                await tag.increment('usageCount');
            } else {
                // Tag was just created → set usage count to 1
                tag.usageCount = 1;
                await tag.save();
            }

            // Return the tag record
            return tag;
        })
    );

    // Return the array of tag records
    return tagRecords;
};
