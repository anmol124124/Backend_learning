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
  paranoid: true
  // createdAt + updatedAt auto add honge
});

export default Comment;
