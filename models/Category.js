// ---------------------------------------------------------
// CATEGORY MODEL
// ---------------------------------------------------------
// This file defines the "Categories" table in the database
// Categories are predefined labels for posts (e.g., Technology, Lifestyle, Sports)

// Importing DataTypes to define what kind of data each column stores
import { DataTypes } from "sequelize";
// Importing the database connection
import sequelize from "../config/db.js";

// Define the Category model (creates the "Categories" table)
const Category = sequelize.define("Category", {

    // Primary key: unique ID for each category
    id: {
        type: DataTypes.INTEGER,        // Number type
        autoIncrement: true,            // Auto increases (1, 2, 3...)
        primaryKey: true,               // Main unique identifier
    },

    // Category display name (e.g., "Technology", "Lifestyle")
    name: {
        type: DataTypes.STRING(50),     // Short text, max 50 characters
        allowNull: false,               // Name is required
        unique: true,                   // No two categories can have the same name
        validate: {
            notEmpty: true,             // Can't be an empty string
            len: [2, 50],               // Must be between 2 and 50 characters
        },
    },

    // URL-friendly version of the name (e.g., "technology", "web-development")
    slug: {
        type: DataTypes.STRING(50),     // Short text, max 50 characters
        allowNull: false,               // Slug is required
        unique: true,                   // No duplicate slugs allowed
        validate: {
            notEmpty: true,             // Can't be empty
            len: [2, 50],               // Between 2-50 characters
            is: /^[a-z0-9-]+$/i,        // Only letters, numbers, and hyphens allowed
        },
    },

    // Optional description of what this category is about
    description: {
        type: DataTypes.TEXT,           // Long text (no character limit)
        allowNull: true,                // Description is optional
    },

    // Emoji icon for UI display (e.g., "💻" for Technology)
    icon: {
        type: DataTypes.STRING(10),     // Short text for emoji
        allowNull: true,                // Icon is optional
    },

    // Hex color code for UI styling (e.g., "#3b82f6" for blue)
    color: {
        type: DataTypes.STRING(7),      // Exactly 7 characters (#RRGGBB)
        allowNull: true,                // Color is optional
        validate: {
            is: /^#[0-9A-Fa-f]{6}$/,    // Must be a valid hex color (e.g., #ff5733)
        },
    },

    // Counter of how many posts belong to this category
    postCount: {
        type: DataTypes.INTEGER,        // Number type
        defaultValue: 0,                // Starts at 0 when created
        allowNull: false,               // Must always have a value
        validate: {
            min: 0,                     // Can't be negative
        },
    },

}, {
    timestamps: true,                   // Automatically adds createdAt and updatedAt columns
    tableName: "Categories",            // Explicit table name in the database
});

// Export the Category model so other files can use it
export default Category;
