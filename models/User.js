// ---------------------------------------------------------
// USER MODEL
// ---------------------------------------------------------
// This file defines the "Users" table in the database
// Users are people who register and use the application

// Importing DataTypes to define what kind of data each column stores
import { DataTypes } from "sequelize";
// Importing the database connection instance
import sequelize from "../config/db.js";

// Define the User model (creates the "Users" table in the database)
const User = sequelize.define("User", {

  // Primary key: unique ID for each user
  id: {
    type: DataTypes.INTEGER,                    // Number type
    autoIncrement: true,                        // Automatically increases (1, 2, 3...)
    primaryKey: true                            // Main unique identifier for each user
  },

  // User's display name (shown on posts and comments)
  username: {
    type: DataTypes.STRING,                     // Short text type
    allowNull: false                            // Username is required
  },

  // User's email address (used for login)
  email: {
    type: DataTypes.STRING,                     // Short text type
    allowNull: false,                           // Email is required
    unique: true                                // No two users can have the same email
  },

  // User's role in the system (controls what they can do)
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "user"                        // Default: regular user (can also be "admin")
  },

  // User's hashed password (NEVER stored as plain text!)
  password: {
    type: DataTypes.STRING,                     // Stores the bcrypt hashed password
    allowNull: true                             // Allowed to be null for OAuth users (Google/GitHub login)
  },

  // Refresh token for maintaining login sessions
  refreshToken: {
    type: DataTypes.STRING,                     // Stores the JWT refresh token
    allowNull: true,                            // Null when user is logged out
  },

  // User's phone number (optional)
  phone: {
    type: DataTypes.STRING,
    allowNull: true,                            // Phone is optional
    unique: true,                               // No two users can have the same phone
  },

  // One-Time Password for phone/email verification
  otp: {
    type: DataTypes.STRING,
    allowNull: true,                            // Only set when OTP is requested
  },

  // When the OTP expires (usually a few minutes after creation)
  otpExpiry: {
    type: DataTypes.DATE,
    allowNull: true,                            // Only set when OTP is active
  },

  // OAuth provider name (e.g., "google", "github")
  provider: {
    type: DataTypes.STRING,
    allowNull: true,                            // Null for regular email/password users
  },

  // OAuth provider's unique ID for this user
  providerId: {
    type: DataTypes.STRING,
    allowNull: true,                            // Null for regular email/password users
  },

  // ---------------------------------------------------------
  // PASSWORD RESET FIELDS (for "Forgot Password" feature)
  // ---------------------------------------------------------

  // Hashed token for password reset verification
  resetPasswordToken: {
    type: DataTypes.STRING,                     // Stores the SHA-256 hashed reset token
    allowNull: true,                            // Normally null - only set when user requests a password reset
    // We store the HASHED version for security - if database leaks, tokens are useless
  },

  // When the password reset token expires
  resetPasswordExpires: {
    type: DataTypes.DATE,                       // Date/time when the token becomes invalid
    allowNull: true,                            // Normally null - set to 1 hour from request time
    // Token expires after 1 hour to limit the attack window
  },

  // ---------------------------------------------------------
  // PROFILE FIELDS
  // ---------------------------------------------------------

  // URL to the user's profile picture (stored on Cloudinary)
  avatar: {
    type: DataTypes.STRING,                     // Stores the Cloudinary image URL
    allowNull: true,                            // Optional - users don't have to upload a photo
  },

  // User's bio/about section (displayed on their profile)
  bio: {
    type: DataTypes.TEXT,                       // Long text (no character limit)
    allowNull: true,                            // Optional - users don't have to write a bio
  },

  // ---------------------------------------------------------
  // ADMIN FIELDS
  // ---------------------------------------------------------

  // Whether this user is banned from the platform
  isBanned: {
    type: DataTypes.BOOLEAN,                    // true or false
    defaultValue: false,                        // Default: not banned (obviously!)
    allowNull: false,
  },

}, {
  timestamps: true,                              // Adds createdAt and updatedAt columns automatically

  // Database indexes for faster queries
  indexes: [
    { fields: ['email'] },                       // Speed up login queries (most frequent lookup)
    { fields: ['username'] },                    // Speed up profile lookups by username
    { fields: ['createdAt'] },                   // Speed up sorting users by registration date
    { fields: ['provider', 'providerId'] },      // Speed up OAuth lookups (Google, GitHub login)
    { fields: ['resetPasswordToken'] }           // Speed up password reset token lookups
  ]
});

// Export the User model so it can be used in other files
// Now you can do User.findOne(), User.create(), etc. in controllers
export default User;
