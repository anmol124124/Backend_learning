// ---------------------------------------------------------
// POST-TAG JUNCTION MODEL (Join Table)
// ---------------------------------------------------------
// This file defines the "PostTags" table - it connects Posts and Tags
// It's a "join table" because one post can have many tags, and one tag can be on many posts
// This is called a "Many-to-Many" relationship

// Importing DataTypes to define column types
import { DataTypes } from "sequelize";
// Importing the database connection
import sequelize from "../config/db.js";

// Define the PostTag model (creates the "PostTags" join table)
const PostTag = sequelize.define("PostTag", {

    // ID of the post that has a tag
    postId: {
        type: DataTypes.INTEGER,    // Number type
        allowNull: false,           // Must always have a post reference
        references: {
            model: "Posts",         // Links to the Posts table
            key: "id",              // Specifically the 'id' column
        },
        onDelete: "CASCADE",        // If the post is deleted, remove this link too
    },

    // ID of the tag assigned to the post
    tagId: {
        type: DataTypes.INTEGER,    // Number type
        allowNull: false,           // Must always have a tag reference
        references: {
            model: "Tags",          // Links to the Tags table
            key: "id",              // Specifically the 'id' column
        },
        onDelete: "CASCADE",        // If the tag is deleted, remove this link too
    },

}, {
    timestamps: true,               // Track when tags were added to posts
    tableName: "PostTags",          // Explicit table name in the database
    indexes: [
        {
            unique: true,                         // Enforce uniqueness
            fields: ["postId", "tagId"],          // Can't add the same tag to the same post twice
        },
    ],
});

// Export the PostTag model so other files can use it
export default PostTag;
