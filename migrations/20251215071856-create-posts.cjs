// ---------------------------------------------------------
// MIGRATION: Create Posts Table
// ---------------------------------------------------------
// This migration creates the "Posts" table in the database
// Posts belong to Users (via userId foreign key)

"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // "up" runs when you apply the migration
  async up(queryInterface, Sequelize) {
    // Create a new table called "Posts"
    await queryInterface.createTable("Posts", {
      // Primary key - unique ID for each post
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      // Title - the post's headline
      title: {
        type: Sequelize.STRING,       // Short text
        allowNull: false,             // Every post must have a title
      },

      // Content - the post's body text
      content: {
        type: Sequelize.TEXT,         // Long text (no length limit like STRING)
        allowNull: false,
      },

      // User ID - which user created this post (foreign key)
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",             // Links to the Users table
          key: "id",                  // Specifically the "id" column
        },
        onDelete: "CASCADE",         // If user is deleted, delete their posts too
        onUpdate: "CASCADE",         // If user's ID changes, update it here too
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
    await queryInterface.dropTable("Posts");
  },
};
