// ---------------------------------------------------------
// PASSWORD RESET HELPER FUNCTIONS
// ---------------------------------------------------------
// These functions handle the password reset flow:
// 1. Generate a secure reset token
// 2. Hash it for safe database storage
// 3. Find a user by their reset token
// 4. Clear the token after use
// 5. Build the reset URL for the email

// Import crypto for generating random tokens and hashing
import crypto from "crypto";
// Import Sequelize operators for database queries
import { Op } from "sequelize";
// Import User model to find/update users
import User from "../models/User.js";
// Import custom error class
import AppError from "./AppError.js";

// ================================================================
// 1. GENERATE RESET TOKEN
// ================================================================
// Creates three things:
// - token: the raw token sent to the user's email
// - hashedToken: a hashed version stored safely in the database
// - expiresAt: when the token stops being valid (1 hour)

export const generateResetToken = () => {
    // Generate 32 random bytes and convert to a 64-character hex string
    // Example: "a7f3e9d2c1b4a8f6e3d2c9b8a7f6e5d4..."
    const token = crypto.randomBytes(32).toString('hex');

    // Hash the token using SHA-256 algorithm
    // We store the HASHED version in the database for security
    // (If database is compromised, attackers can't use the hashed token)
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // Set expiry to 1 hour from now (3600000 milliseconds = 1 hour)
    const expiresAt = Date.now() + 3600000;

    // Return all three values
    return {
        token,              // Unhashed version → sent in the email link
        hashedToken,        // Hashed version → stored in the database
        expiresAt          // Expiry timestamp → also stored in database
    };
};

// ================================================================
// 2. HASH TOKEN
// ================================================================
// Hashes a token using SHA-256 (same algorithm as generateResetToken)
// Used when the user submits their token - we hash it to compare with the database

export const hashToken = (token) => {
    return crypto
        .createHash('sha256')          // Use SHA-256 hashing algorithm
        .update(token)                  // Feed in the token to hash
        .digest('hex');                 // Output as hex string
};

// ================================================================
// 3. FIND USER BY RESET TOKEN
// ================================================================
// Looks up a user in the database by their reset token
// Also checks that the token hasn't expired yet

export const findUserByResetToken = async (token) => {
    // First, hash the incoming token (database stores hashed versions)
    const hashedToken = hashToken(token);

    // Search for a user where:
    // 1. Their stored reset token matches the hashed version
    // 2. The token hasn't expired yet (expiry time is in the future)
    const user = await User.findOne({
        where: {
            resetPasswordToken: hashedToken,        // Token must match
            resetPasswordExpires: {
                [Op.gt]: Date.now()                   // Op.gt = "greater than" current time
            }
        }
    });

    // If no user found, the token is invalid or expired
    if (!user) {
        throw new AppError("Invalid or expired reset token", 400);
    }

    // Return the found user
    return user;
};

// ================================================================
// 4. CLEAR RESET TOKEN
// ================================================================
// After a successful password reset, remove the token from the database
// This makes the token single-use (can't be used again)

export const clearResetToken = async (user) => {
    user.resetPasswordToken = null;            // Remove the stored token
    user.resetPasswordExpires = null;          // Remove the expiry time
    await user.save();                         // Save changes to database
};

// ================================================================
// 5. CREATE RESET URL
// ================================================================
// Builds the full URL that the user clicks in their email
// Example: http://localhost:5173/reset-password/a7f3e9d2c1b4a8f6...

export const createResetURL = (token) => {
    // Get the frontend URL from environment variables (defaults to localhost)
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Combine frontend URL with the reset path and token
    return `${frontendURL}/reset-password/${token}`;
};
