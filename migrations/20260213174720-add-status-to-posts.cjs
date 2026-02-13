// ---------------------------------------------------------
// MIGRATION: Add Status to Posts Table
// ---------------------------------------------------------
// This migration adds a 'status' column to the 'Posts' table.
// A post can either be a 'draft' (private) or 'published' (public).

"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    // "up" runs when we apply the migration
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("Posts", "status", {
            type: Sequelize.ENUM("draft", "published"),
            allowNull: false,
            defaultValue: "published", // Existing posts will be public by default
        });
    },

    // "down" runs when we undo the migration
    async down(queryInterface, Sequelize) {
        // Remove the column
        await queryInterface.removeColumn("Posts", "status");
        // Also remove the ENUM type from the database (important for Postgres)
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Posts_status";');
    },
};
