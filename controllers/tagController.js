// ---------------------------------------------------------
// TAG CONTROLLER
// ---------------------------------------------------------
// Handles tag operations: list, trending, posts by tag

import Tag from "../models/Tag.js";
import Post from "../models/Post.js";
import PostTag from "../models/PostTag.js";
import User from "../models/User.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";
import sequelize from "../config/db.js";

// ---------------------------------------------------------
// GET ALL TAGS
// ---------------------------------------------------------
export const getAllTags = catchAsync(async (req, res, next) => {
    const tags = await Tag.findAll({
        order: [['usageCount', 'DESC'], ['name', 'ASC']],
        attributes: ['id', 'name', 'slug', 'usageCount']
    });

    successResponse(res, "Tags fetched successfully", { tags });
});

// ---------------------------------------------------------
// GET TRENDING TAGS
// ---------------------------------------------------------
// Get most used tags in the last 30 days
export const getTrendingTags = catchAsync(async (req, res, next) => {
    const { limit = 10 } = req.query;

    // Get tags with most posts in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendingTags = await Tag.findAll({
        include: [
            {
                model: Post,
                as: 'posts',
                attributes: [],
                where: {
                    createdAt: {
                        [sequelize.Op.gte]: thirtyDaysAgo
                    }
                },
                through: { attributes: [] }
            }
        ],
        attributes: [
            'id',
            'name',
            'slug',
            'usageCount',
            [sequelize.fn('COUNT', sequelize.col('posts.id')), 'recentPostCount']
        ],
        group: ['Tag.id'],
        order: [[sequelize.literal('recentPostCount'), 'DESC']],
        limit: parseInt(limit),
        subQuery: false
    });

    successResponse(res, "Trending tags fetched successfully", { tags: trendingTags });
});

// ---------------------------------------------------------
// GET POSTS BY TAG
// ---------------------------------------------------------
export const getPostsByTag = catchAsync(async (req, res, next) => {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Find the tag
    const tag = await Tag.findOne({ where: { slug } });

    if (!tag) {
        return next(new AppError("Tag not found", 404));
    }

    // Get posts with this tag
    const { rows: posts, count } = await Post.findAndCountAll({
        include: [
            {
                model: User,
                attributes: ['id', 'username', 'avatar']
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
        where: {
            '$tags.id$': tag.id
        },
        attributes: {
            include: [
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount']
            ]
        },
        group: ['Post.id', 'User.id', 'tags.id', 'tags.PostTag.postId', 'tags.PostTag.tagId'],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        subQuery: false
    });

    // Add isLiked for logged-in users
    let postsWithLikeStatus = posts;
    if (req.user) {
        postsWithLikeStatus = await Promise.all(
            posts.map(async (post) => {
                const isLiked = await Like.findOne({
                    where: {
                        userId: req.user.userId,
                        postId: post.id
                    }
                });
                return {
                    ...post.toJSON(),
                    isLiked: !!isLiked
                };
            })
        );
    }

    const totalCount = await Post.count({
        include: [{
            model: Tag,
            as: 'tags',
            where: { id: tag.id },
            through: { attributes: [] }
        }]
    });

    successResponse(res, "Posts fetched successfully", {
        tag: {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            usageCount: tag.usageCount
        },
        posts: postsWithLikeStatus,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalPosts: totalCount,
            limit: parseInt(limit)
        }
    });
});

// ---------------------------------------------------------
// HELPER: CREATE OR GET TAGS
// ---------------------------------------------------------
// Used internally when creating/updating posts
// Converts tag names to tag IDs
export const createOrGetTags = async (tagNames) => {
    if (!tagNames || tagNames.length === 0) return [];

    const tagRecords = await Promise.all(
        tagNames.map(async (name) => {
            const trimmedName = name.trim();
            const slug = trimmedName.toLowerCase().replace(/\s+/g, '-');

            const [tag, created] = await Tag.findOrCreate({
                where: { slug },
                defaults: {
                    name: trimmedName,
                    slug,
                    usageCount: 0
                }
            });

            // Increment usage count if newly assigned
            if (!created) {
                await tag.increment('usageCount');
            } else {
                tag.usageCount = 1;
                await tag.save();
            }

            return tag;
        })
    );

    return tagRecords;
};
