// ---------------------------------------------------------
// MIGRATION: Add Performance Indexes
// ---------------------------------------------------------
// Indexes make database queries MUCH faster (10-100x improvement)
// Think of an index like a book's table of contents - instead of
// reading every page to find something, you jump straight to it
//
// This migration adds indexes to frequently queried columns:
// - Users: email (for login lookups)
// - Posts: userId, createdAt (for fetching and sorting posts)
// - Comments: postId, userId (for loading comments)
// - Likes: postId, userId (for checking if user liked a post)

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // "up" creates all the indexes
  async up(queryInterface, Sequelize) {
    console.log('Creating performance indexes...');

    // =========================================================================
    // USERS TABLE INDEXES
    // =========================================================================

    // Index on email - makes login queries instant even with millions of users
    await queryInterface.addIndex('Users', ['email'], {
      name: 'idx_users_email',
      unique: true                    // Also enforces email uniqueness at the database level
    });
    console.log('✅ Created index: Users.email');

    // =========================================================================
    // POSTS TABLE INDEXES
    // =========================================================================

    // Index on userId - fast lookup of all posts by a specific user
    await queryInterface.addIndex('Posts', ['userId'], {
      name: 'idx_posts_user_id'
    });
    console.log('✅ Created index: Posts.userId');

    // Index on createdAt - fast sorting of posts by date (newest first)
    await queryInterface.addIndex('Posts', ['createdAt'], {
      name: 'idx_posts_created_at'
    });
    console.log('✅ Created index: Posts.createdAt');

    // Composite index on userId + createdAt
    // Optimizes: "Get all posts by user X, sorted by newest first"
    await queryInterface.addIndex('Posts', ['userId', 'createdAt'], {
      name: 'idx_posts_user_created'
    });
    console.log('✅ Created composite index: Posts(userId, createdAt)');

    // =========================================================================
    // COMMENTS TABLE INDEXES
    // =========================================================================

    // Index on postId - fast lookup of all comments on a specific post
    await queryInterface.addIndex('Comments', ['postId'], {
      name: 'idx_comments_post_id'
    });
    console.log('✅ Created index: Comments.postId');

    // Index on userId - fast lookup of all comments by a specific user
    await queryInterface.addIndex('Comments', ['userId'], {
      name: 'idx_comments_user_id'
    });
    console.log('✅ Created index: Comments.userId');

    // =========================================================================
    // LIKES TABLE INDEXES
    // =========================================================================

    // Index on postId - fast count of likes on a post
    await queryInterface.addIndex('Likes', ['postId'], {
      name: 'idx_likes_post_id'
    });
    console.log('✅ Created index: Likes.postId');

    // Index on userId - fast lookup of all posts user has liked
    await queryInterface.addIndex('Likes', ['userId'], {
      name: 'idx_likes_user_id'
    });
    console.log('✅ Created index: Likes.userId');

    // Composite UNIQUE index - prevents duplicate likes AND speeds up lookups
    // "Has user X liked post Y?" is now instant
    await queryInterface.addIndex('Likes', ['userId', 'postId'], {
      name: 'idx_likes_user_post',
      unique: true                    // Same user can't like the same post twice
    });
    console.log('✅ Created unique composite index: Likes(userId, postId)');

    console.log('\n🎉 All performance indexes created successfully!');
    console.log('📈 Your queries should now be 10-100x faster!');
  },

  // "down" removes all the indexes (reverses the migration)
  async down(queryInterface, Sequelize) {
    console.log('Removing performance indexes...');

    // Remove all indexes in reverse order
    await queryInterface.removeIndex('Likes', 'idx_likes_user_post');
    console.log('❌ Removed index: Likes(userId, postId)');

    await queryInterface.removeIndex('Likes', 'idx_likes_user_id');
    console.log('❌ Removed index: Likes.userId');

    await queryInterface.removeIndex('Likes', 'idx_likes_post_id');
    console.log('❌ Removed index: Likes.postId');

    await queryInterface.removeIndex('Comments', 'idx_comments_user_id');
    console.log('❌ Removed index: Comments.userId');

    await queryInterface.removeIndex('Comments', 'idx_comments_post_id');
    console.log('❌ Removed index: Comments.postId');

    await queryInterface.removeIndex('Posts', 'idx_posts_user_created');
    console.log('❌ Removed composite index: Posts(userId, createdAt)');

    await queryInterface.removeIndex('Posts', 'idx_posts_created_at');
    console.log('❌ Removed index: Posts.createdAt');

    await queryInterface.removeIndex('Posts', 'idx_posts_user_id');
    console.log('❌ Removed index: Posts.userId');

    await queryInterface.removeIndex('Users', 'idx_users_email');
    console.log('❌ Removed index: Users.email');

    console.log('\n✅ All performance indexes removed');
  }
};