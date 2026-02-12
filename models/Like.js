// ---------------------------------------------------------
// LIKE MODEL
// ---------------------------------------------------------
// This file defines the "Likes" table in the database
// A like represents a user expressing they enjoyed a post

// Importing DataTypes to define what each column stores
import { DataTypes } from "sequelize";
// Importing the database connection instance
import sequelize from "../config/db.js";

// Define the Like model (creates the "Likes" table)
const Like = sequelize.define("Like", {

    // Primary key: unique ID for every like record
    id: {
        type: DataTypes.INTEGER,     // Number type
        autoIncrement: true,         // Automatically increases (1, 2, 3...)
        primaryKey: true             // Main unique identifier for each like
    },

    // ID of the user who liked the post
    userId: {
        type: DataTypes.INTEGER,     // Number type (references User's ID)
        allowNull: false             // Every like must come from a user
    },

    // ID of the post that was liked
    postId: {
        type: DataTypes.INTEGER,     // Number type (references Post's ID)
        allowNull: false             // Every like must be on a post
    }

}, {
    timestamps: true,                // Adds createdAt and updatedAt columns
    paranoid: true,                  // Enables soft delete (sets deletedAt instead of actually deleting)

    // Constraint: same user can't like the same post more than once
    uniqueKeys: {
        unique_like: {
            fields: ['userId', 'postId']  // The combination of userId + postId must be unique
        }
    },

    // Database indexes for faster queries
    indexes: [
        { fields: ['postId'] },                  // Fast lookup: "count likes on this post"
        { fields: ['userId'] },                  // Fast lookup: "get all posts this user liked"
        { fields: ['userId', 'postId'], unique: true }, // Enforce: one like per user per post
        { fields: ['deletedAt'] }                // Fast lookup for soft-delete queries
    ]
});

// Export the Like model so other files can use it
export default Like;
