// ---------------------------------------------------------
// BOOKMARK CONTROLLER
// ---------------------------------------------------------
// Handles bookmark operations: toggle, get user bookmarks

import { User, Post, Bookmark, Like, Comment, Tag, Category } from "../models/associations.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";
import sequelize from "../config/db.js";

// ---------------------------------------------------------
// TOGGLE BOOKMARK
// ---------------------------------------------------------
// Add or remove bookmark (like the toggle-like pattern)
export const toggleBookmark = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const userId = req.user.userId;

    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
        return next(new AppError("Post not found", 404));
    }

    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({
        where: { userId, postId }
    });

    if (existingBookmark) {
        // Remove bookmark
        await existingBookmark.destroy();
        successResponse(res, "Bookmark removed", {
            isBookmarked: false,
            postId: parseInt(postId)
        });
    } else {
        // Add bookmark
        await Bookmark.create({ userId, postId });
        successResponse(res, "Post bookmarked", {
            isBookmarked: true,
            postId: parseInt(postId)
        });
    }
});

// ---------------------------------------------------------
// GET USER BOOKMARKS
// ---------------------------------------------------------
// Get paginated list of user's saved posts
export const getUserBookmarks = catchAsync(async (req, res, next) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get user's bookmarked posts with full post details
    const { rows: bookmarks, count } = await Bookmark.findAndCountAll({
        where: { userId },
        include: [
            {
                model: Post,
                as: 'Post',
                include: [
                    {
                        model: User,
                        attributes: ['id', 'username', 'avatar']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'icon', 'color']
                    },
                    {
                        model: Tag,
                        as: 'tags',
                        attributes: ['id', 'name', 'slug'],
                        through: { attributes: [] }
                    },
                    {
                        model: Comment,
                        attributes: []
                    },
                    {
                        model: Like,
                        attributes: []
                    }
                ],
                attributes: {
                    include: [
                        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Post.Comments.id'))), 'commentCount'],
                        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Post.Likes.id'))), 'likeCount']
                    ]
                }
            }
        ],
        group: ['Bookmark.id', 'Post.id', 'Post.User.id', 'Post.category.id', 'Post.tags.id', 'Post.tags.PostTag.postId', 'Post.tags.PostTag.tagId'],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        subQuery: false,
        distinct: true
    });

    // Extract posts from bookmarks and add isBookmarked flag
    const posts = await Promise.all(bookmarks.map(async (bookmark) => {
        const post = bookmark.Post.toJSON();

        // Check if current user has liked this post
        const userLike = await Like.findOne({
            where: {
                postId: post.id,
                userId: userId
            }
        });

        return {
            ...post,
            isBookmarked: true, // Always true since we're in saved posts
            isLiked: !!userLike
        };
    }));

    const totalCount = await Bookmark.count({ where: { userId } });

    successResponse(res, "Bookmarks fetched successfully", {
        posts,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalBookmarks: totalCount,
            limit: parseInt(limit)
        }
    });
});
