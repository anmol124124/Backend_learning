// ---------------------------------------------------------
// 1) IMPORTS
// ---------------------------------------------------------
import { DataTypes } from "sequelize";   // DataTypes → column ka type set karne ke liye
import sequelize from "../config/db.js"; // sequelize instance → database se connect hai
import User from "./User.js";
// ---------------------------------------------------------
// 2) POST MODEL DEFINE KAR RAHEN
// ---------------------------------------------------------
// sequelize.define() → ye database me ek table create karta hai
// "Post" → table ka naam Posts (S lag jayega)
const Post = sequelize.define("Post", {

  // -------- ID (primary key) --------
  id: {
    type: DataTypes.INTEGER,     // number hoga
    autoIncrement: true,         // 1,2,3... auto increase
    primaryKey: true             // ye main key hoga
  },

  // -------- TITLE --------
  title: {
    type: DataTypes.STRING,      // small text, varchar(255)
    allowNull: false             // title empty nahi ho sakta
  },

  // -------- CONTENT --------
  content: {
    type: DataTypes.TEXT,        // long text (bada content)
    allowNull: false
  },

  // -------- USER ID (kis user ne post banayi?) --------
  userId: {
    type: DataTypes.INTEGER,     // number hoga
    allowNull: false             // ye empty nahi ho sakta
    // ❗Later hum isko USERS TABLE se link bhi karenge (relation)
  }

}, {
  timestamps: true,
  paranoid: true,

  // Database indexes for performance optimization
  indexes: [
    { fields: ['userId'] },                      // Get user's posts
    { fields: ['createdAt'] },                   // Sort by date
    { fields: ['userId', 'createdAt'] },         // Compound: user's posts sorted by date
    { fields: ['deletedAt'] }                    // Paranoid queries (soft deletes)
  ]
  // createdAt + updatedAt auto add honge
});





// ---------------------------------------------------------
// 3) EXPORT MODEL
// ---------------------------------------------------------
export default Post;             // Dusri files me use karne ke liye export
