// ---------------------------------------------------------
// CATEGORY CONTROLLER
// ---------------------------------------------------------
// Handles category operations: list, get by slug, posts by category

import { Category, Post, User, Like, Comment, Tag } from "../models/associations.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";
import sequelize from "../config/db.js";

// ---------------------------------------------------------
// GET ALL CATEGORIES
// ---------------------------------------------------------
export const getAllCategories = catchAsync(async (req, res, next) => {
    const categories = await Category.findAll({
        attributes: ['id', 'name', 'slug', 'description', 'icon', 'color', 'postCount'],
        order: [['name', 'ASC']]
    });

    successResponse(res, "Categories fetched successfully", { categories });
});

// ---------------------------------------------------------
// GET CATEGORY BY SLUG
// ---------------------------------------------------------
export const getCategoryBySlug = catchAsync(async (req, res, next) => {
    const { slug } = req.params;

    const category = await Category.findOne({
        where: { slug },
        attributes: ['id', 'name', 'slug', 'description', 'icon', 'color', 'postCount']
    });

    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    successResponse(res, "Category fetched successfully", { category });
});

// ---------------------------------------------------------
// GET POSTS BY CATEGORY
// ---------------------------------------------------------
export const getPostsByCategory = catchAsync(async (req, res, next) => {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Find the category
    const category = await Category.findOne({ where: { slug } });

    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    // Get posts in this category
    const { rows: posts, count } = await Post.findAndCountAll({
        where: { categoryId: category.id },
        include: [
            {
                model: User,
                attributes: ['id', 'username', 'avatar']
            },
            {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug', 'icon', 'color']
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
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount']
            ]
        },
        group: ['Post.id', 'User.id', 'category.id', 'tags.id', 'tags.PostTag.postId', 'tags.PostTag.tagId'],
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
        where: { categoryId: category.id }
    });

    successResponse(res, "Posts fetched successfully", {
        category: {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            icon: category.icon,
            color: category.color,
            postCount: category.postCount
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
