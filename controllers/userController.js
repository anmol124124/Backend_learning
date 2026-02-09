// ---------------------------------------------------------
// USER CONTROLLER
// ---------------------------------------------------------
// Handles user profile operations: view, update, change password

import User from "../models/User.js";
import Post from "../models/Post.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";
import bcrypt from "bcrypt";

// ---------------------------------------------------------
// GET MY PROFILE
// ---------------------------------------------------------
// Returns the logged-in user's full profile
export const getMyProfile = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(req.user.userId, {
        attributes: ['id', 'username', 'email', 'avatar', 'bio', 'role', 'createdAt']
    });

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Get user's post count
    const postCount = await Post.count({ where: { userId: user.id } });

    successResponse(res, "Profile fetched successfully", {
        ...user.toJSON(),
        postCount
    });
});

// ---------------------------------------------------------
// GET PUBLIC PROFILE
// ---------------------------------------------------------
// Returns any user's public profile (limited info)
export const getPublicProfile = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findByPk(id, {
        attributes: ['id', 'username', 'avatar', 'bio', 'createdAt']
    });

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Get user's post count
    const postCount = await Post.count({ where: { userId: user.id } });

    successResponse(res, "Profile fetched successfully", {
        ...user.toJSON(),
        postCount
    });
});

// ---------------------------------------------------------
// UPDATE PROFILE
// ---------------------------------------------------------
// Update username, bio, avatar
export const updateProfile = catchAsync(async (req, res, next) => {
    const { username, bio, avatar } = req.body;

    const user = await User.findByPk(req.user.userId);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Update fields if provided
    if (username !== undefined) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // Return updated profile (without sensitive data)
    successResponse(res, "Profile updated successfully", {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role
    });
});

// ---------------------------------------------------------
// CHANGE PASSWORD
// ---------------------------------------------------------
// Verify current password and set new one
export const changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.userId);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Check if user has a password (OAuth users might not)
    if (!user.password) {
        return next(new AppError("Cannot change password for OAuth accounts", 400));
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return next(new AppError("Current password is incorrect", 401));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    successResponse(res, "Password changed successfully");
});

// ---------------------------------------------------------
// UPLOAD AVATAR
// ---------------------------------------------------------
// This is handled by the upload route, but we need to update the user
export const updateAvatar = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError("No file uploaded", 400));
    }

    const user = await User.findByPk(req.user.userId);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Update avatar with Cloudinary URL
    user.avatar = req.file.path;
    await user.save();

    successResponse(res, "Avatar updated successfully", {
        avatar: user.avatar
    });
});
