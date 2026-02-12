// ---------------------------------------------------------
// BOOKMARK MODEL
// ---------------------------------------------------------
// This file defines the "Bookmarks" table in the database
// A bookmark links a user to a post they want to save for later

// Importing DataTypes from Sequelize to define column types (STRING, INTEGER, etc.)
import { DataTypes } from "sequelize";
// Importing the database connection instance
import sequelize from "../config/db.js";

// Define the Bookmark model (creates the "Bookmarks" table in the database)
const Bookmark = sequelize.define(
    "Bookmark",  // Model name
    {
        // Primary key: unique ID for each bookmark record
        id: {
            type: DataTypes.INTEGER,    // Number type
            primaryKey: true,           // This is the main unique identifier
            autoIncrement: true,        // Automatically increases (1, 2, 3...)
        },
        // Which user created this bookmark
        userId: {
            type: DataTypes.INTEGER,    // Number type (references User's ID)
            allowNull: false,           // Must always have a user
            references: {
                model: "Users",         // Links to the Users table
                key: "id",              // Specifically the 'id' column
            },
            onDelete: "CASCADE",        // If the user is deleted, delete their bookmarks too
        },
        // Which post was bookmarked
        postId: {
            type: DataTypes.INTEGER,    // Number type (references Post's ID)
            allowNull: false,           // Must always have a post
            references: {
                model: "Posts",         // Links to the Posts table
                key: "id",              // Specifically the 'id' column
            },
            onDelete: "CASCADE",        // If the post is deleted, delete bookmarks for it too
        },
    },
    {
        tableName: "Bookmarks",         // Explicit table name in the database
        timestamps: true,               // Automatically add createdAt column
        updatedAt: false,               // Don't track updates (bookmarks are just created/deleted)
        indexes: [
            {
                unique: true,                         // Enforce uniqueness
                fields: ["userId", "postId"],         // One bookmark per user per post (can't save same post twice)
            },
            {
                fields: ["userId"],                   // Speed up queries for "get all bookmarks by user"
            },
            {
                fields: ["postId"],                   // Speed up queries for "how many bookmarks does this post have"
            },
        ],
    }
);

// Export the Bookmark model so other files can use it
export default Bookmark;
