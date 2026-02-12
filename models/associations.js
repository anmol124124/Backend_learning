// ---------------------------------------------------------
// IMPORT ALL MODELS (ONLY ONCE)
// ---------------------------------------------------------
import User from "./User.js";
import Post from "./Post.js";
import Comment from "./Comment.js";
import Like from "./Like.js";
import Tag from "./Tag.js";
import PostTag from "./PostTag.js";
import Category from "./Category.js";
import Bookmark from "./Bookmark.js";

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

User.belongsToMany(Post, { through: Like, foreignKey: "userId" });
Post.belongsToMany(User, { through: Like, foreignKey: "postId" });

// ---------------------------------------------------------
// DIRECT ASSOCIATIONS FOR LIKE (Needed for calculations)
// ---------------------------------------------------------
User.hasMany(Like, { foreignKey: "userId" });
Like.belongsTo(User, { foreignKey: "userId" });

Post.hasMany(Like, { foreignKey: "postId" });
Like.belongsTo(Post, { foreignKey: "postId" });

// ---------------------------------------------------------
// POST ↔ TAGS (Many-to-Many)
// ---------------------------------------------------------
Post.belongsToMany(Tag, {
  through: PostTag,
  foreignKey: "postId",
  as: "tags"
});

Tag.belongsToMany(Post, {
  through: PostTag,
  foreignKey: "tagId",
  as: "posts"
});

// Direct associations for PostTag
Post.hasMany(PostTag, { foreignKey: "postId" });
PostTag.belongsTo(Post, { foreignKey: "postId" });

Tag.hasMany(PostTag, { foreignKey: "tagId" });
PostTag.belongsTo(Tag, { foreignKey: "tagId" });

// ---------------------------------------------------------
// CATEGORY → POSTS (1 category = many posts)
// ---------------------------------------------------------
Category.hasMany(Post, {
  foreignKey: "categoryId",
  onDelete: "SET NULL"
});

Post.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category"
});

// ---------------------------------------------------------
// USER → BOOKMARKS (Many-to-Many via Bookmark)
// ---------------------------------------------------------
User.belongsToMany(Post, {
  through: Bookmark,
  as: 'bookmarkedPosts',
  foreignKey: 'userId',
  otherKey: 'postId'
});

Post.belongsToMany(User, {
  through: Bookmark,
  as: 'bookmarkedBy',
  foreignKey: 'postId',
  otherKey: 'userId'
});

// ---------------------------------------------------------
// EXPORT ALL MODELS (ONLY ONCE)
// ---------------------------------------------------------
export { User, Post, Comment, Like, Tag, PostTag, Category, Bookmark };

