// ---------------------------------------------------------
// MIGRATION: Create Comments Table
// ---------------------------------------------------------
// This migration creates the "Comments" table
// Comments belong to both a User (who wrote it) and a Post (where it's posted)
// Comments can also have a parent comment (for nested replies)

"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // "up" runs when you apply the migration
  async up(queryInterface, Sequelize) {
    // Create the "Comments" table
    await queryInterface.createTable("Comments", {
      // Primary key - unique ID for each comment
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      // Content - the actual comment text
      content: {
        type: Sequelize.TEXT,         // Long text for the comment body
        allowNull: false,
      },

      // User ID - who wrote this comment (foreign key → Users table)
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",             // Links to Users table
          key: "id",
        },
        onDelete: "CASCADE",         // Delete comments if user is deleted
      },

      // Post ID - which post this comment belongs to (foreign key → Posts table)
      postId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Posts",             // Links to Posts table
          key: "id",
        },
        onDelete: "CASCADE",         // Delete comments if post is deleted
      },

      // Parent Comment ID - for nested comments (replies to other comments)
      // If null, this is a top-level comment
      parentCommentId: {
        type: Sequelize.INTEGER,
        allowNull: true,              // Can be null (top-level comments have no parent)
        references: {
          model: "Comments",          // Links to itself (self-referencing foreign key)
          key: "id",
        },
        onDelete: "CASCADE",         // Delete replies if parent comment is deleted
      },

      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  // "down" reverses the migration
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Comments");
  },
};
