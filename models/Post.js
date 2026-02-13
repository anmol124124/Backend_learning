// ---------------------------------------------------------
// POST MODEL
// ---------------------------------------------------------
// This file defines the "Posts" table in the database
// Posts are the main content items (blog posts/articles) created by users

// Importing DataTypes to define column types (STRING, INTEGER, TEXT, etc.)
import { DataTypes } from "sequelize";
// Importing the database connection instance
import sequelize from "../config/db.js";
// Importing User model (needed for the relationship between posts and users)
import User from "./User.js";

// Define the Post model (creates the "Posts" table in the database)
const Post = sequelize.define("Post", {

  // Primary key: unique ID for each post
  id: {
    type: DataTypes.INTEGER,     // Number type
    autoIncrement: true,         // Automatically increases (1, 2, 3...)
    primaryKey: true             // Main unique identifier for each post
  },

  // Post title (the headline of the blog post)
  title: {
    type: DataTypes.STRING,      // Short text, max 255 characters
    allowNull: false             // Title is required (can't create a post without one)
  },

  // Post content (the main body text of the blog post)
  content: {
    type: DataTypes.TEXT,        // Long text with no character limit
    allowNull: false             // Content is required
  },

  // Optional image URL (e.g., a cover image for the post)
  image: {
    type: DataTypes.STRING,      // Stores the Cloudinary URL of the uploaded image
    allowNull: true              // Images are optional
  },

  // ID of the user who created this post (the author)
  userId: {
    type: DataTypes.INTEGER,     // Number type (references User's ID)
    allowNull: false             // Every post must have an author
    // This will be linked to the Users table via associations
  },

  // ID of the category this post belongs to (e.g., Technology, Lifestyle)
  categoryId: {
    type: DataTypes.INTEGER,     // Number type (references Category's ID)
    allowNull: true,             // Optional - a post can exist without a category
    references: {
      model: 'Categories',      // Links to the Categories table
      key: 'id'                  // Specifically the 'id' column
    },
    onDelete: 'SET NULL'         // If the category is deleted, set this to null (don't delete the post)
  },

  // Post Status: Is this post public or still a work-in-progress?
  status: {
    type: DataTypes.ENUM("draft", "published"), // Only these two options are allowed
    allowNull: false,                           // Every post must have a status
    defaultValue: "published"                  // Default to public if not specified
  }

}, {
  timestamps: true,              // Automatically adds createdAt and updatedAt columns
  paranoid: true,                // Enables soft delete (deletedAt column instead of permanent deletion)

  // Database indexes for faster queries
  indexes: [
    { fields: ['userId'] },                      // Fast lookup: "get all posts by this user"
    { fields: ['createdAt'] },                   // Fast lookup: "sort posts by date"
    { fields: ['userId', 'createdAt'] },         // Fast lookup: "get user's posts sorted by date"
    { fields: ['deletedAt'] }                    // Fast lookup for soft-delete queries
  ]
  // createdAt and updatedAt are automatically added by timestamps: true
});

// Export the Post model so other files can use it
export default Post;
