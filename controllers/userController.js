// ---------------------------------------------------------
// USER CONTROLLER
// ---------------------------------------------------------
// This file handles user profile operations (view profile, update, change password, upload avatar)

// Importing the User model for database operations on users
import User from "../models/User.js";
// Importing the Post model to count user's posts
import Post from "../models/Post.js";
// Importing error-catching wrapper to auto-handle errors
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class for sending proper error messages
import AppError from "../utils/AppError.js";
// Importing helper for consistent success responses
import { successResponse } from "../utils/apiResponse.js";
// Importing bcrypt for hashing and comparing passwords securely
import bcrypt from "bcrypt";

// ---------------------------------------------------------
// GET MY PROFILE
// ---------------------------------------------------------
// Returns the full profile of the currently logged-in user
export const getMyProfile = catchAsync(async (req, res, next) => {
    // Find the user by their ID (from the auth token, set by auth middleware)
    const user = await User.findByPk(req.user.userId, {
        // Only return these specific fields (exclude sensitive ones like password)
        attributes: ['id', 'username', 'email', 'avatar', 'bio', 'role', 'createdAt']
    });

    // If user not found in database (unlikely but defensive), return 404
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Count how many posts this user has written
    const postCount = await Post.count({ where: { userId: user.id } });

    // Send the profile data along with their post count
    successResponse(res, "Profile fetched successfully", {
        ...user.toJSON(),  // Spread all user data (id, username, email, etc.)
        postCount          // Add the total post count
    });
});

// ---------------------------------------------------------
// GET PUBLIC PROFILE
// ---------------------------------------------------------
// Returns a user's public profile (limited info, anyone can view)
export const getPublicProfile = catchAsync(async (req, res, next) => {
    // Get the user ID from the URL parameter (e.g., /users/5 → id = 5)
    const { id } = req.params;

    // Find the user by ID with only public-facing fields
    const user = await User.findByPk(id, {
        // Only return public info (no email, no password, no role)
        attributes: ['id', 'username', 'avatar', 'bio', 'createdAt']
    });

    // If user doesn't exist, return a 404 error
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Count how many posts this user has written
    const postCount = await Post.count({ where: { userId: user.id } });

    // Send the public profile with post count
    successResponse(res, "Profile fetched successfully", {
        ...user.toJSON(),  // Spread public user data
        postCount          // Add post count
    });
});

// ---------------------------------------------------------
// UPDATE PROFILE
// ---------------------------------------------------------
// Lets the logged-in user update their username, bio, or avatar
export const updateProfile = catchAsync(async (req, res, next) => {
    // Get the updated fields from the request body
    const { username, bio, avatar } = req.body;

    // Find the current user in the database
    const user = await User.findByPk(req.user.userId);

    // If user not found, return a 404 error
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Only update fields that were actually provided (undefined = not sent)
    if (username !== undefined) user.username = username;  // Update display name
    if (bio !== undefined) user.bio = bio;                 // Update bio/about text
    if (avatar !== undefined) user.avatar = avatar;        // Update profile picture URL

    // Save changes to the database
    await user.save();

    // Send back the updated profile (without sensitive data like password)
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
// Lets the logged-in user change their password (requires current password)
export const changePassword = catchAsync(async (req, res, next) => {
    // Get the current and new passwords from the request body
    const { currentPassword, newPassword } = req.body;

    // Find the user in the database
    const user = await User.findByPk(req.user.userId);

    // If user not found, return a 404 error
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Check if the user has a password (OAuth users like Google/GitHub might not have one)
    if (!user.password) {
        return next(new AppError("Cannot change password for OAuth accounts", 400));
    }

    // Verify the current password is correct by comparing with the hashed version
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    // If password doesn't match, return an error
    if (!isMatch) {
        return next(new AppError("Current password is incorrect", 401));
    }

    // Generate a salt (random data) for hashing the new password
    const salt = await bcrypt.genSalt(10);
    // Hash the new password with the salt (making it secure)
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password with the new hashed version
    user.password = hashedPassword;
    // Save the change to the database
    await user.save();

    // Send success response
    successResponse(res, "Password changed successfully");
});

// ---------------------------------------------------------
// UPLOAD AVATAR
// ---------------------------------------------------------
// This handler updates the user's avatar after a file upload
export const updateAvatar = catchAsync(async (req, res, next) => {
    // Check if a file was uploaded (set by multer middleware)
    if (!req.file) {
        return next(new AppError("No file uploaded", 400));
    }

    // Find the user in the database
    const user = await User.findByPk(req.user.userId);

    // If user not found, return a 404 error
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Update the avatar field with the Cloudinary URL of the uploaded image
    user.avatar = req.file.path;
    // Save the change to the database
    await user.save();

    // Send success response with the new avatar URL
    successResponse(res, "Avatar updated successfully", {
        avatar: user.avatar  // The new avatar URL
    });
});
