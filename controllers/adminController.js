// ---------------------------------------------------------
// ADMIN CONTROLLER
// ---------------------------------------------------------
// Handles admin operations: user management, content moderation, analytics

import User from "../models/User.js";
import Post from "../models/Post.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";
import sequelize from "../config/db.js";

// ---------------------------------------------------------
// GET ALL USERS (Admin)
// ---------------------------------------------------------
// List all users with pagination and search
export const getAllUsers = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search
        ? {
            [sequelize.Op.or]: [
                { username: { [sequelize.Op.iLike]: `%${search}%` } },
                { email: { [sequelize.Op.iLike]: `%${search}%` } }
            ]
        }
        : {};

    const { rows: users, count } = await User.findAndCountAll({
        where: whereClause,
        attributes: ['id', 'username', 'email', 'role', 'isBanned', 'createdAt'],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
    });

    // Get post counts for each user
    const usersWithStats = await Promise.all(
        users.map(async (user) => {
            const postCount = await Post.count({ where: { userId: user.id } });
            return {
                ...user.toJSON(),
                postCount
            };
        })
    );

    successResponse(res, "Users fetched successfully", {
        users: usersWithStats,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalUsers: count,
            limit: parseInt(limit)
        }
    });
});

// ---------------------------------------------------------
// UPDATE USER ROLE (Admin)
// ---------------------------------------------------------
// Change user role between 'user' and 'admin'
export const updateUserRole = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Prevent demoting yourself
    if (parseInt(id) === req.user.userId && role === 'user') {
        return next(new AppError("You cannot demote yourself", 400));
    }

    user.role = role;
    await user.save();

    successResponse(res, `User role updated to ${role}`, {
        id: user.id,
        username: user.username,
        role: user.role
    });
});

// ---------------------------------------------------------
// BAN USER (Admin)
// ---------------------------------------------------------
export const banUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Prevent banning yourself
    if (parseInt(id) === req.user.userId) {
        return next(new AppError("You cannot ban yourself", 400));
    }

    // Prevent banning other admins
    if (user.role === 'admin') {
        return next(new AppError("Cannot ban admin users", 400));
    }

    user.isBanned = true;
    await user.save();

    successResponse(res, "User banned successfully", {
        id: user.id,
        username: user.username,
        isBanned: user.isBanned
    });
});

// ---------------------------------------------------------
// UNBAN USER (Admin)
// ---------------------------------------------------------
export const unbanUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    user.isBanned = false;
    await user.save();

    successResponse(res, "User unbanned successfully", {
        id: user.id,
        username: user.username,
        isBanned: user.isBanned
    });
});

// ---------------------------------------------------------
// GET DASHBOARD STATS (Admin)
// ---------------------------------------------------------
// Analytics: total users, posts, likes, comments
export const getDashboardStats = catchAsync(async (req, res, next) => {
    const [
        totalUsers,
        totalPosts,
        totalLikes,
        totalComments,
        bannedUsers,
        adminUsers,
        recentUsers,
        recentPosts
    ] = await Promise.all([
        User.count(),
        Post.count(),
        Like.count(),
        Comment.count(),
        User.count({ where: { isBanned: true } }),
        User.count({ where: { role: 'admin' } }),
        User.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'username', 'email', 'createdAt']
        }),
        Post.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, attributes: ['id', 'username'] }],
            attributes: ['id', 'title', 'createdAt']
        })
    ]);

    successResponse(res, "Dashboard stats fetched successfully", {
        stats: {
            totalUsers,
            totalPosts,
            totalLikes,
            totalComments,
            bannedUsers,
            adminUsers
        },
        recentActivity: {
            users: recentUsers,
            posts: recentPosts
        }
    });
});

// ---------------------------------------------------------
// GET ALL POSTS (Admin)
// ---------------------------------------------------------
// List all posts for moderation with pagination
export const getAllPostsAdmin = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search
        ? {
            [sequelize.Op.or]: [
                { title: { [sequelize.Op.iLike]: `%${search}%` } },
                { content: { [sequelize.Op.iLike]: `%${search}%` } }
            ]
        }
        : {};

    const { rows: posts, count } = await Post.findAndCountAll({
        where: whereClause,
        include: [
            { model: User, attributes: ['id', 'username', 'email'] },
        ],
        attributes: {
            include: [
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount']
            ]
        },
        include: [
            { model: User, attributes: ['id', 'username', 'email'] },
            { model: Comment, attributes: [] },
            { model: Like, attributes: [] }
        ],
        group: ['Post.id', 'User.id'],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        subQuery: false
    });

    const totalCount = await Post.count({ where: whereClause });

    successResponse(res, "Posts fetched successfully", {
        posts,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalPosts: totalCount,
            limit: parseInt(limit)
        }
    });
});
