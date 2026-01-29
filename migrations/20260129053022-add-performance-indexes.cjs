'use strict';

/**
 * Migration: Add Performance Indexes
 * 
 * This migration adds indexes to frequently queried columns to dramatically
 * improve query performance (10-100x faster queries).
 * 
 * Indexes added:
 * - Users: email (unique index for fast login)
 * - Posts: userId, createdAt, composite (userId + createdAt)
 * - Comments: postId, userId
 * - Likes: postId, userId, composite unique (userId + postId)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Creating performance indexes...');

    // =========================================================================
    // USERS TABLE INDEXES
    // =========================================================================

    // Index on email (for login queries)
    // This makes login 100x faster when you have many users
    await queryInterface.addIndex('Users', ['email'], {
      name: 'idx_users_email',
      unique: true  // Email must be unique
    });
    console.log('✅ Created index: Users.email');

    // =========================================================================
    // POSTS TABLE INDEXES
    // =========================================================================

    // Index on userId (for getting user's posts)
    // Query: SELECT * FROM Posts WHERE userId = 1
    await queryInterface.addIndex('Posts', ['userId'], {
      name: 'idx_posts_user_id'
    });
    console.log('✅ Created index: Posts.userId');

    // Index on createdAt (for sorting posts by date)
    // Query: SELECT * FROM Posts ORDER BY createdAt DESC
    await queryInterface.addIndex('Posts', ['createdAt'], {
      name: 'idx_posts_created_at'
    });
    console.log('✅ Created index: Posts.createdAt');

    // Composite index on userId + createdAt
    // For queries that filter by user AND sort by date
    // Query: SELECT * FROM Posts WHERE userId = 1 ORDER BY createdAt DESC
    await queryInterface.addIndex('Posts', ['userId', 'createdAt'], {
      name: 'idx_posts_user_created'
    });
    console.log('✅ Created composite index: Posts(userId, createdAt)');

    // =========================================================================
    // COMMENTS TABLE INDEXES
    // =========================================================================

    // Index on postId (for getting post's comments)
    // Query: SELECT * FROM Comments WHERE postId = 1
    await queryInterface.addIndex('Comments', ['postId'], {
      name: 'idx_comments_post_id'
    });
    console.log('✅ Created index: Comments.postId');

    // Index on userId (for getting user's comments)
    // Query: SELECT * FROM Comments WHERE userId = 1
    await queryInterface.addIndex('Comments', ['userId'], {
      name: 'idx_comments_user_id'
    });
    console.log('✅ Created index: Comments.userId');

    // =========================================================================
    // LIKES TABLE INDEXES
    // =========================================================================

    // Index on postId (for getting post's likes)
    // Query: SELECT * FROM Likes WHERE postId = 1
    await queryInterface.addIndex('Likes', ['postId'], {
      name: 'idx_likes_post_id'
    });
    console.log('✅ Created index: Likes.postId');

    // Index on userId (for getting user's likes)
    // Query: SELECT * FROM Likes WHERE userId = 1
    await queryInterface.addIndex('Likes', ['userId'], {
      name: 'idx_likes_user_id'
    });
    console.log('✅ Created index: Likes.userId');

    // Composite UNIQUE index on userId + postId
    // Prevents duplicate likes (user can't like same post twice)
    // Also speeds up queries like: SELECT * FROM Likes WHERE userId = 1 AND postId = 1
    await queryInterface.addIndex('Likes', ['userId', 'postId'], {
      name: 'idx_likes_user_post',
      unique: true  // Ensures no duplicate likes
    });
    console.log('✅ Created unique composite index: Likes(userId, postId)');

    console.log('\n🎉 All performance indexes created successfully!');
    console.log('📈 Your queries should now be 10-100x faster!');
  },

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