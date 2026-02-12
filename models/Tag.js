// ---------------------------------------------------------
// TAG MODEL
// ---------------------------------------------------------
// This file defines the "Tags" table in the database
// Tags are labels that can be attached to posts (e.g., "javascript", "react", "backend")

// Importing DataTypes to define column types
import { DataTypes } from "sequelize";
// Importing the database connection
import sequelize from "../config/db.js";

// Define the Tag model (creates the "Tags" table)
const Tag = sequelize.define("Tag", {

    // Primary key: unique ID for each tag
    id: {
        type: DataTypes.INTEGER,        // Number type
        autoIncrement: true,            // Auto increases (1, 2, 3...)
        primaryKey: true,               // Main unique identifier
    },

    // Tag display name (e.g., "JavaScript", "React", "Backend")
    name: {
        type: DataTypes.STRING(50),     // Short text, max 50 characters
        allowNull: false,               // Tag name is required
        unique: true,                   // No two tags can have the same name
        validate: {
            notEmpty: true,             // Can't be an empty string
            len: [1, 50],               // Must be between 1 and 50 characters
        },
    },

    // URL-friendly version of the name (e.g., "javascript", "react", "backend")
    slug: {
        type: DataTypes.STRING(50),     // Short text, max 50 characters
        allowNull: false,               // Slug is required
        unique: true,                   // No duplicate slugs
        validate: {
            notEmpty: true,             // Can't be empty
            len: [1, 50],               // Between 1-50 characters
            is: /^[a-z0-9-]+$/i,        // Only letters, numbers, and hyphens (no spaces or special chars)
        },
    },

    // Counter: how many posts currently use this tag
    usageCount: {
        type: DataTypes.INTEGER,        // Number type
        defaultValue: 0,                // Starts at 0 when the tag is first created
        allowNull: false,               // Must always have a value
        validate: {
            min: 0,                     // Can't go below 0
        },
    },

}, {
    timestamps: true,                   // Adds createdAt and updatedAt columns
    tableName: "Tags",                  // Explicit table name in the database
});

// Export the Tag model so other files can use it
export default Tag;
