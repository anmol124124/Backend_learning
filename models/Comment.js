// ---------------------------------------------------------
// COMMENT MODEL
// ---------------------------------------------------------
// This file defines the "Comments" table in the database
// Comments are text responses users leave on posts

// Importing DataTypes to define column types
import { DataTypes } from "sequelize";
// Importing the database connection
import sequelize from "../config/db.js";

// Define the Comment model (creates the "Comments" table)
const Comment = sequelize.define("Comment", {

  // The actual comment text written by the user
  content: {
    type: DataTypes.TEXT,             // Long text type (no character limit)
    allowNull: false,                 // Comment can't be empty - must have some text
  },

  // ID of the user who wrote this comment
  userId: {
    type: DataTypes.INTEGER,          // Number type (references User's ID)
    allowNull: false,                 // Every comment must have an author
  },

  // ID of the post this comment belongs to
  postId: {
    type: DataTypes.INTEGER,          // Number type (references Post's ID)
    allowNull: false,                 // Every comment must be on a post
  },

  // ID of the parent comment (for nested replies)
  parentCommentId: {
    type: DataTypes.INTEGER,          // Number type (references another Comment's ID)
    allowNull: true,                  // null = top-level comment, number = reply to that comment
  },

}, {
  timestamps: true,                   // Adds createdAt and updatedAt columns automatically
  paranoid: true,                     // Enables soft delete (deletedAt column instead of actual deletion)

  // Database indexes to speed up common queries
  indexes: [
    { fields: ['postId'] },                      // Fast lookup: "get all comments on this post"
    { fields: ['userId'] },                      // Fast lookup: "get all comments by this user"
    { fields: ['parentCommentId'] },             // Fast lookup: "get all replies to this comment"
    { fields: ['postId', 'createdAt'] },         // Fast lookup: "get post comments sorted by date"
    { fields: ['deletedAt'] }                    // Fast lookup for soft-delete queries
  ]
  // createdAt and updatedAt are automatically added by timestamps: true
});

// Export the Comment model so other files can use it
export default Comment;
