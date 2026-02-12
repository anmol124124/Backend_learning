// ---------------------------------------------------------
// MIGRATION: Add OAuth Columns to Users
// ---------------------------------------------------------
// This migration adds columns to support social login (Google, GitHub)
// "provider" = which service they used (google, github)
// "providerId" = their unique ID on that service

"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // "up" adds the OAuth columns
  async up(queryInterface, Sequelize) {
    // Add "provider" column - stores which OAuth provider was used (e.g., "google", "github")
    await queryInterface.addColumn("Users", "provider", {
      type: Sequelize.STRING,
      allowNull: true,                // null for users who signed up with email/password
    });

    // Add "providerId" column - stores the user's unique ID from the OAuth provider
    await queryInterface.addColumn("Users", "providerId", {
      type: Sequelize.STRING,
      allowNull: true,                // null for non-OAuth users
    });
  },

  // "down" removes the OAuth columns
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "provider");
    await queryInterface.removeColumn("Users", "providerId");
  },
};
