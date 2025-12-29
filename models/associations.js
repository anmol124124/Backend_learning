// ---------------------------------------------------------
// IMPORT ALL MODELS (ONLY ONCE)
// ---------------------------------------------------------
import User from "./User.js";
import Post from "./Post.js";
import Comment from "./Comment.js";


// ---------------------------------------------------------
// USER → POSTS (1 user = many posts)
// ---------------------------------------------------------
User.hasMany(Post, { // ek user ke kai posts ho sakte hain
  foreignKey: "userId", // Posts table me userId column hoga
  onDelete: "CASCADE" //  user delete hua to uske posts bhi delete ho jayenge
});

Post.belongsTo(User, { // har post ka ek user hoga
  foreignKey: "userId" // Posts table me userId column hoga
});


// ---------------------------------------------------------
// USER → COMMENTS (1 user = many comments)
// ---------------------------------------------------------
User.hasMany(Comment, {
  foreignKey: "userId",
  onDelete: "CASCADE"
});

Comment.belongsTo(User, {
  foreignKey: "userId"
});


// ---------------------------------------------------------
// POST → COMMENTS (1 post = many comments)
// ---------------------------------------------------------
Post.hasMany(Comment, {
  foreignKey: "postId",
  onDelete: "CASCADE"
});

Comment.belongsTo(Post, {
  foreignKey: "postId"
});


// ---------------------------------------------------------
// COMMENT → REPLIES (Self Relation Comment → Comment)
// ---------------------------------------------------------
Comment.hasMany(Comment, {
  foreignKey: "parentCommentId",
  as: "replies",
});

Comment.belongsTo(Comment, {
  foreignKey: "parentCommentId",
  as: "parent",
});


// ---------------------------------------------------------
// EXPORT ALL MODELS (ONLY ONCE)
// ---------------------------------------------------------
export { User, Post, Comment };
