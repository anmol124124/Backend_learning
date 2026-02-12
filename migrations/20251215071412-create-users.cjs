// ---------------------------------------------------------
// MIGRATION: Create Users Table
// ---------------------------------------------------------
// This migration creates the initial "Users" table in the database
// Run: npx sequelize-cli db:migrate
// Undo: npx sequelize-cli db:migrate:undo

"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // "up" runs when you apply the migration (creates the table)
  async up(queryInterface, Sequelize) {
    // Create a new table called "Users" with the following columns
    await queryInterface.createTable("Users", {
      // Primary key - unique ID for each user (auto-incrementing: 1, 2, 3, ...)
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,          // Automatically increases for each new user
        primaryKey: true,             // This is the unique identifier
        allowNull: false,             // Cannot be empty
      },

      // Username - the user's display name
      username: {
        type: Sequelize.STRING,       // Text field
        allowNull: false,             // Must have a username
      },

      // Email - the user's email address (must be unique)
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,                 // No two users can have the same email
      },

      // Role - what permissions the user has (default: "user")
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "user",         // New users get "user" role by default
      },

      // Password - hashed password for authentication
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      // Refresh Token - stored when user logs in (used to get new access tokens)
      refreshToken: {
        type: Sequelize.STRING,
        allowNull: true,              // Empty when user is not logged in
      },

      // Timestamps - automatically tracked by Sequelize
      createdAt: {
        type: Sequelize.DATE,         // When the user was created
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,         // When the user was last updated
        allowNull: false,
      },
    });
  },

  // "down" runs when you undo the migration (deletes the table)
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");   // Completely removes the Users table
  },
};
