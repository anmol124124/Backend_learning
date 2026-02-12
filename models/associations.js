// ---------------------------------------------------------
// ASSOCIATIONS FILE (Database Relationships)
// ---------------------------------------------------------
// This file defines HOW all the database tables are connected to each other
// Think of it as drawing lines between tables showing "this relates to that"

// ---------------------------------------------------------
// IMPORTING ALL MODELS (loading all table definitions)
// ---------------------------------------------------------
import User from "./User.js";           // Users table
import Post from "./Post.js";           // Posts table
import Comment from "./Comment.js";     // Comments table
import Like from "./Like.js";           // Likes table
import Tag from "./Tag.js";             // Tags table
import PostTag from "./PostTag.js";     // PostTags join table (connects posts & tags)
import Category from "./Category.js";   // Categories table
import Bookmark from "./Bookmark.js";   // Bookmarks table

// ---------------------------------------------------------
// USER → POSTS (One-to-Many: 1 user can write many posts)
// ---------------------------------------------------------
// "hasMany" means: one User has many Posts
User.hasMany(Post, {
  foreignKey: "userId",     // Posts table has a "userId" column pointing to this user
  onDelete: "CASCADE"       // If a user is deleted, ALL their posts are also deleted
});

// "belongsTo" means: each Post belongs to one User (the author)
Post.belongsTo(User, {
  foreignKey: "userId"      // The "userId" column in Posts links back to Users
});


// ---------------------------------------------------------
// USER → COMMENTS (One-to-Many: 1 user can write many comments)
// ---------------------------------------------------------
User.hasMany(Comment, {
  foreignKey: "userId",     // Comments table has a "userId" column
  onDelete: "CASCADE"       // Delete user = delete their comments
});

Comment.belongsTo(User, {
  foreignKey: "userId"      // Each comment links back to the user who wrote it
});


// ---------------------------------------------------------
// POST → COMMENTS (One-to-Many: 1 post can have many comments)
// ---------------------------------------------------------
Post.hasMany(Comment, {
  foreignKey: "postId",     // Comments table has a "postId" column
  onDelete: "CASCADE"       // Delete post = delete its comments
});

Comment.belongsTo(Post, {
  foreignKey: "postId"      // Each comment links back to the post it's on
});


// ---------------------------------------------------------
// COMMENT → REPLIES (Self-Referencing: comments can reply to other comments)
// ---------------------------------------------------------
// A comment can have many replies (which are also comments)
Comment.hasMany(Comment, {
  foreignKey: "parentCommentId",  // If this is filled, it's a reply to another comment
  as: "replies",                   // Access replies as comment.replies
});

// A reply belongs to a parent comment
Comment.belongsTo(Comment, {
  foreignKey: "parentCommentId",  // Points to the comment being replied to
  as: "parent",                    // Access parent as comment.parent
});

// ---------------------------------------------------------
// USER ↔ POST through LIKE (Many-to-Many: users can like many posts, posts can be liked by many users)
// ---------------------------------------------------------
User.belongsToMany(Post, { through: Like, foreignKey: "userId" });  // User likes many posts
Post.belongsToMany(User, { through: Like, foreignKey: "postId" });  // Post is liked by many users

// ---------------------------------------------------------
// DIRECT LIKE ASSOCIATIONS (needed for counting likes in queries)
// ---------------------------------------------------------
User.hasMany(Like, { foreignKey: "userId" });   // One user can have many like records
Like.belongsTo(User, { foreignKey: "userId" }); // Each like belongs to one user

Post.hasMany(Like, { foreignKey: "postId" });   // One post can have many like records
Like.belongsTo(Post, { foreignKey: "postId" }); // Each like belongs to one post

// ---------------------------------------------------------
// POST ↔ TAGS (Many-to-Many: posts can have many tags, tags can be on many posts)
// ---------------------------------------------------------
// Connected through the PostTag join table
Post.belongsToMany(Tag, {
  through: PostTag,         // The join table connecting posts and tags
  foreignKey: "postId",     // PostTags table uses "postId"
  as: "tags"                // Access a post's tags as post.tags
});

Tag.belongsToMany(Post, {
  through: PostTag,         // Same join table
  foreignKey: "tagId",      // PostTags table uses "tagId"
  as: "posts"               // Access a tag's posts as tag.posts
});

// Direct PostTag associations (needed for some complex queries)
Post.hasMany(PostTag, { foreignKey: "postId" });    // One post has many PostTag entries
PostTag.belongsTo(Post, { foreignKey: "postId" });  // Each PostTag entry belongs to one post

Tag.hasMany(PostTag, { foreignKey: "tagId" });      // One tag has many PostTag entries
PostTag.belongsTo(Tag, { foreignKey: "tagId" });    // Each PostTag entry belongs to one tag

// ---------------------------------------------------------
// CATEGORY → POSTS (One-to-Many: 1 category can have many posts)
// ---------------------------------------------------------
Category.hasMany(Post, {
  foreignKey: "categoryId",     // Posts table has a "categoryId" column
  onDelete: "SET NULL"          // If category is deleted, don't delete posts - just set categoryId to null
});

Post.belongsTo(Category, {
  foreignKey: "categoryId",     // Links post to its category
  as: "category"                // Access as post.category
});

// ---------------------------------------------------------
// USER ↔ POST through BOOKMARK (Many-to-Many: users can bookmark many posts)
// ---------------------------------------------------------
User.belongsToMany(Post, {
  through: Bookmark,            // Connected through the Bookmarks table
  as: 'bookmarkedPosts',        // Access as user.bookmarkedPosts
  foreignKey: 'userId',         // User's ID in the Bookmarks table
  otherKey: 'postId'            // Post's ID in the Bookmarks table
});

Post.belongsToMany(User, {
  through: Bookmark,            // Same Bookmarks table
  as: 'bookmarkedBy',           // Access as post.bookmarkedBy (users who bookmarked this post)
  foreignKey: 'postId',         // Post's ID in the Bookmarks table
  otherKey: 'userId'            // User's ID in the Bookmarks table
});

// ---------------------------------------------------------
// EXPORT ALL MODELS (so other files can import them all from one place)
// ---------------------------------------------------------
export { User, Post, Comment, Like, Tag, PostTag, Category, Bookmark };
