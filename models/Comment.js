import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// Comment Model → database table structure
const Comment = sequelize.define("Comment", {

  content: {
    type: DataTypes.TEXT,
    allowNull: false,               // Empty comment allowed nahi
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,               // Kaun user ne comment kiya
  },

  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,               // Kis post par comment hua
  },

  parentCommentId: {
    type: DataTypes.INTEGER,
    allowNull: true,                // Reply ke liye (null = normal comment)
  },

}, {
  timestamps: true,
  paranoid: true,

  // Database indexes for performance optimization
  indexes: [
    { fields: ['postId'] },                      // Get post's comments
    { fields: ['userId'] },                      // Get user's comments
    { fields: ['parentCommentId'] },             // Get nested replies
    { fields: ['postId', 'createdAt'] },         // Post comments sorted by date
    { fields: ['deletedAt'] }                    // Paranoid queries (soft deletes)
  ]
  // createdAt + updatedAt auto add honge
});

export default Comment;
