// ---------------------------------------------------------
// PASSWORD RESET HELPER FUNCTIONS
// ---------------------------------------------------------
// Purpose: Reusable functions for password reset feature
// Used by: authController.js (forgotPassword, resetPassword)
// ---------------------------------------------------------

import crypto from "crypto";
import { Op } from "sequelize";
import User from "../models/User.js";
import AppError from "./AppError.js";

// ================================================================
// 1. GENERATE RESET TOKEN
// ================================================================
// Purpose: Create a random token and its hashed version
// Returns: { token, hashedToken, expiresAt }

export const generateResetToken = () => {
    // ---------------------------------------------------------
    // STEP 1: Generate random token (32 bytes = 64 hex chars)
    // ---------------------------------------------------------
    // This creates a random string like: "a7f3e9d2c1b4a8f6..."
    const token = crypto.randomBytes(32).toString('hex');

    // ---------------------------------------------------------
    // STEP 2: Hash the token using SHA-256
    // ---------------------------------------------------------
    // Why? So if database leaks, attackers can't use the tokens
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // ---------------------------------------------------------
    // STEP 3: Calculate expiry time (1 hour from now)
    // ---------------------------------------------------------
    const expiresAt = Date.now() + 3600000; // 3600000 ms = 1 hour

    // Return all three values
    return {
        token,              // Unhashed - send in email
        hashedToken,        // Hashed - store in database
        expiresAt          // When token expires
    };
};

// ================================================================
// 2. HASH TOKEN
// ================================================================
// Purpose: Hash a token (used when user submits reset token)
// Why? We store hashed tokens in DB, so we need to hash incoming token to compare

export const hashToken = (token) => {
    // Use same SHA-256 algorithm as generateResetToken
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};

// ================================================================
// 3. FIND USER BY RESET TOKEN
// ================================================================
// Purpose: Find user with matching token that hasn't expired
// Returns: User object or null
// Throws: AppError if token invalid/expired

export const findUserByResetToken = async (token) => {
    // ---------------------------------------------------------
    // STEP 1: Hash the incoming token
    // ---------------------------------------------------------
    const hashedToken = hashToken(token);

    // ---------------------------------------------------------
    // STEP 2: Find user with this hashed token
    // ---------------------------------------------------------
    // Also check that token hasn't expired
    const user = await User.findOne({
        where: {
            resetPasswordToken: hashedToken,        // Token must match
            resetPasswordExpires: {                 // AND not expired
                [Op.gt]: Date.now()                   // Op.gt = Greater Than now
            }
        }
    });

    // ---------------------------------------------------------
    // STEP 3: Throw error if no user found
    // ---------------------------------------------------------
    if (!user) {
        throw new AppError("Invalid or expired reset token", 400);
    }

    return user;
};

// ================================================================
// 4. CLEAR RESET TOKEN
// ================================================================
// Purpose: Clear reset token fields after successful password reset
// Why? Makes token one-time use only (security)

export const clearResetToken = async (user) => {
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
};

// ================================================================
// 5. CREATE RESET URL
// ================================================================
// Purpose: Generate the reset password URL with token
// Returns: Full URL string

export const createResetURL = (token) => {
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${frontendURL}/reset-password/${token}`;
};
