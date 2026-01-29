// Import DataTypes from Sequelize
// DataTypes tell Sequelize what kind of data each column will store
import { DataTypes } from "sequelize";

// Import the already-created database connection
// This is the single Sequelize instance connected to your DB
import sequelize from "../config/db.js";

// Define a new table/model named "Like"
const Like = sequelize.define("Like", {

    // Primary key: unique ID for every like
    id: {
        type: DataTypes.INTEGER,     // Number type
        autoIncrement: true,         // Automatically increases (1, 2, 3...)
        primaryKey: true             // Makes this column the main identifier
    },

    // Stores the ID of the user who liked the post
    userId: {
        type: DataTypes.INTEGER,     // User ID will be a number
        allowNull: false             // User ID must always be present
    },

    // Stores the ID of the post that was liked
    postId: {
        type: DataTypes.INTEGER,     // Post ID will be a number
        allowNull: false             // Post ID must always be present
    }

}, {
    // Automatically adds createdAt and updatedAt columns
    timestamps: true,
    paranoid: true,

    // Prevents the same user from liking the same post more than once
    // (userId + postId combination must be unique)
    uniqueKeys: {
        unique_like: {
            fields: ['userId', 'postId']
        }
    }
});

// Export the Like model so it can be used in other files
export default Like;
