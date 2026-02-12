// ---------------------------------------------------------
// ADMIN CONTROLLER
// ---------------------------------------------------------
// This file handles all admin-only operations like managing users, banning, and viewing analytics

// Importing all the database models we need for admin operations
import { User, Post, Like, Comment, Category } from "../models/associations.js";
// Importing error-catching wrapper so we don't need try-catch in every function
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class for sending proper error responses
import AppError from "../utils/AppError.js";
// Importing helper to send consistent success responses
import { successResponse } from "../utils/apiResponse.js";
// Importing database connection for advanced query features like Op (operators)
import sequelize from "../config/db.js";

// ---------------------------------------------------------
// GET ALL USERS (Admin Only)
// ---------------------------------------------------------
// This function lets admins see a list of all users with search and pagination
export const getAllUsers = catchAsync(async (req, res, next) => {
    // Get page number, results per page, and search term from the URL query string
    const { page = 1, limit = 20, search = '' } = req.query;
    // Calculate how many records to skip for pagination (e.g., page 2 → skip first 20)
    const offset = (page - 1) * limit;

    // Build a search filter: if search term exists, look in username OR email
    const whereClause = search
        ? {
            // Op.or means "match ANY of these conditions"
            [sequelize.Op.or]: [
                // iLike = case-insensitive search, % = wildcard (match anything before/after)
                { username: { [sequelize.Op.iLike]: `%${search}%` } },
                { email: { [sequelize.Op.iLike]: `%${search}%` } }
            ]
        }
        : {};  // If no search term, don't filter (get all users)

    // Fetch users from the database with the search filter applied
    const { rows: users, count } = await User.findAndCountAll({
        where: whereClause,                          // Apply the search filter
        attributes: ['id', 'username', 'email', 'role', 'isBanned', 'createdAt'],  // Only get these columns
        limit: parseInt(limit),                      // How many results per page
        offset: parseInt(offset),                    // How many to skip
        order: [['createdAt', 'DESC']]              // Newest users first
    });

    // For each user, also count how many posts they have written
    const usersWithStats = await Promise.all(
        users.map(async (user) => {
            // Count the total posts by this specific user
            const postCount = await Post.count({ where: { userId: user.id } });
            // Return user data + their post count combined
            return {
                ...user.toJSON(),   // Convert Sequelize object to plain object and spread its data
                postCount           // Add the post count to the user data
            };
        })
    );

    // Send the response with the users list and pagination info
    successResponse(res, "Users fetched successfully", {
        users: usersWithStats,              // Array of users with their post counts
        pagination: {
            currentPage: parseInt(page),    // Which page the admin is viewing
            totalPages: Math.ceil(count / limit),  // Total number of pages
            totalUsers: count,              // Total number of users in the system
            limit: parseInt(limit)          // How many users per page
        }
    });
});

// ---------------------------------------------------------
// UPDATE USER ROLE (Admin Only)
// ---------------------------------------------------------
// This function lets admins change a user's role (e.g., from 'user' to 'admin' or vice versa)
export const updateUserRole = catchAsync(async (req, res, next) => {
    // Get the user ID from the URL (e.g., /admin/users/5/role → id = 5)
    const { id } = req.params;
    // Get the new role from the request body (sent by the admin)
    const { role } = req.body;

    // Find the user in the database by their ID
    const user = await User.findByPk(id);

    // If user doesn't exist, return a 404 error
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Safety check: prevent an admin from demoting themselves to a regular user
    if (parseInt(id) === req.user.userId && role === 'user') {
        return next(new AppError("You cannot demote yourself", 400));
    }

    // Update the user's role to the new value
    user.role = role;
    // Save the changes to the database
    await user.save();

    // Send success response with the updated user info
    successResponse(res, `User role updated to ${role}`, {
        id: user.id,             // User's ID
        username: user.username, // User's name
        role: user.role          // User's new role
    });
});

// ---------------------------------------------------------
// BAN USER (Admin Only)
// ---------------------------------------------------------
// This function lets admins ban a user (block them from using the platform)
export const banUser = catchAsync(async (req, res, next) => {
    // Get the user ID from the URL parameters
    const { id } = req.params;

    // Find the user in the database
    const user = await User.findByPk(id);

    // If user doesn't exist, return an error
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Safety check: prevent an admin from banning themselves
    if (parseInt(id) === req.user.userId) {
        return next(new AppError("You cannot ban yourself", 400));
    }

    // Safety check: prevent banning other admin users
    if (user.role === 'admin') {
        return next(new AppError("Cannot ban admin users", 400));
    }

    // Set the user's banned status to true
    user.isBanned = true;
    // Save the change to the database
    await user.save();

    // Send success response confirming the ban
    successResponse(res, "User banned successfully", {
        id: user.id,               // Banned user's ID
        username: user.username,   // Banned user's name
        isBanned: user.isBanned    // Their banned status (true)
    });
});

// ---------------------------------------------------------
// UNBAN USER (Admin Only)
// ---------------------------------------------------------
// This function lets admins unban (unblock) a previously banned user
export const unbanUser = catchAsync(async (req, res, next) => {
    // Get the user ID from the URL parameters
    const { id } = req.params;

    // Find the user in the database
    const user = await User.findByPk(id);

    // If user doesn't exist, return an error
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Set the user's banned status to false (unban them)
    user.isBanned = false;
    // Save the change to the database
    await user.save();

    // Send success response confirming the unban
    successResponse(res, "User unbanned successfully", {
        id: user.id,               // Unbanned user's ID
        username: user.username,   // Unbanned user's name
        isBanned: user.isBanned    // Their banned status (false now)
    });
});

// ---------------------------------------------------------
// GET DASHBOARD STATS (Admin Only)
// ---------------------------------------------------------
// This function gets analytics/statistics for the admin dashboard
export const getDashboardStats = catchAsync(async (req, res, next) => {
    // Run ALL these database queries at the same time (in parallel) for speed
    const [
        totalUsers,          // Total number of registered users
        totalPosts,          // Total number of posts created
        totalLikes,          // Total number of likes given
        totalComments,       // Total number of comments made
        bannedUsers,         // How many users are currently banned
        adminUsers,          // How many users have admin role
        recentUsers,         // Last 5 users who registered
        recentPosts          // Last 5 posts that were created
    ] = await Promise.all([
        User.count(),                                        // Count all users
        Post.count(),                                        // Count all posts
        Like.count(),                                        // Count all likes
        Comment.count(),                                     // Count all comments
        User.count({ where: { isBanned: true } }),          // Count banned users only
        User.count({ where: { role: 'admin' } }),           // Count admin users only
        User.findAll({                                       // Get 5 most recent users
            limit: 5,                                        // Only 5 results
            order: [['createdAt', 'DESC']],                 // Newest first
            attributes: ['id', 'username', 'email', 'createdAt']  // Only these fields
        }),
        Post.findAll({                                       // Get 5 most recent posts
            limit: 5,                                        // Only 5 results
            order: [['createdAt', 'DESC']],                 // Newest first
            include: [{ model: User, attributes: ['id', 'username'] }],  // Include who wrote it
            attributes: ['id', 'title', 'createdAt']        // Only these fields
        })
    ]);

    // Send all the stats back to the admin dashboard
    successResponse(res, "Dashboard stats fetched successfully", {
        stats: {
            totalUsers,          // e.g., 150 users
            totalPosts,          // e.g., 500 posts
            totalLikes,          // e.g., 2000 likes
            totalComments,       // e.g., 800 comments
            bannedUsers,         // e.g., 3 banned users
            adminUsers           // e.g., 2 admin users
        },
        recentActivity: {
            users: recentUsers,  // Last 5 new user signups
            posts: recentPosts   // Last 5 new posts
        }
    });
});

// ---------------------------------------------------------
// GET ALL POSTS (Admin Only - for content moderation)
// ---------------------------------------------------------
// This function lets admins see ALL posts for moderation purposes
export const getAllPostsAdmin = catchAsync(async (req, res, next) => {
    // Get pagination and search parameters from the URL query string
    const { page = 1, limit = 20, search = '' } = req.query;
    // Calculate how many records to skip for pagination
    const offset = (page - 1) * limit;

    // Build search filter: if search term exists, look in post title OR content
    const whereClause = search
        ? {
            [sequelize.Op.or]: [
                // Search in post titles (case-insensitive)
                { title: { [sequelize.Op.iLike]: `%${search}%` } },
                // Search in post content (case-insensitive)
                { content: { [sequelize.Op.iLike]: `%${search}%` } }
            ]
        }
        : {};  // No search term = get all posts

    // Fetch posts with related data (author, category, comment/like counts)
    const { rows: posts, count } = await Post.findAndCountAll({
        where: whereClause,                          // Apply search filter
        include: [
            { model: User, attributes: ['id', 'username', 'email'] },   // Post author info
            { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },  // Post category
            { model: Comment, attributes: [] },      // Comments (just for counting)
            { model: Like, attributes: [] }           // Likes (just for counting)
        ],
        attributes: {
            include: [
                // Count how many unique comments each post has
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Comments.id'))), 'commentCount'],
                // Count how many unique likes each post has
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Likes.id'))), 'likeCount']
            ]
        },
        // Group results to avoid duplicates from the joins
        group: ['Post.id', 'User.id', 'category.id'],
        limit: parseInt(limit),                      // Results per page
        offset: parseInt(offset),                    // How many to skip
        order: [['createdAt', 'DESC']],             // Newest posts first
        subQuery: false                              // Performance optimization
    });

    // Get the actual total count of posts (separate query for accuracy)
    const totalCount = await Post.count({ where: whereClause });

    // Send the response with posts and pagination details
    successResponse(res, "Posts fetched successfully", {
        posts,                                       // Array of posts with stats
        pagination: {
            currentPage: parseInt(page),             // Current page number
            totalPages: Math.ceil(totalCount / limit),  // Total available pages
            totalPosts: totalCount,                  // Total post count
            limit: parseInt(limit)                   // Posts per page
        }
    });
});
