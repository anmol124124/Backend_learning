// ---------------------------------------------------------
// MIGRATION: Create Likes Table
// ---------------------------------------------------------
// This migration creates the "Likes" table in the database
// Each like connects a User to a Post they liked
// A user can only like each post once (unique constraint)

"use strict";

module.exports = {
    // "up" runs when you apply the migration (npx sequelize-cli db:migrate)
    async up(queryInterface, Sequelize) {

        // Create the "Likes" table
        await queryInterface.createTable("Likes", {

            // Primary key - unique ID for each like
            id: {
                type: Sequelize.INTEGER,      // Number type
                autoIncrement: true,          // Automatically increases (1, 2, 3, ...)
                primaryKey: true,             // Unique identifier
                allowNull: false,             // Cannot be empty
            },

            // User ID - which user liked the post (foreign key → Users table)
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,             // Must know who liked it

                // Links to the Users table's "id" column
                references: { model: "Users", key: "id" },

                // If the user is deleted, remove their likes too
                onDelete: "CASCADE",
            },

            // Post ID - which post was liked (foreign key → Posts table)
            postId: {
                type: Sequelize.INTEGER,
                allowNull: false,             // Must know which post was liked

                // Links to the Posts table's "id" column
                references: { model: "Posts", key: "id" },

                // If the post is deleted, remove its likes too
                onDelete: "CASCADE",
            },

            // When the like was created
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },

            // When the like was last updated
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        // Add a UNIQUE constraint on (userId, postId) combination
        // This prevents the same user from liking the same post twice
        await queryInterface.addConstraint("Likes", {
            fields: ["userId", "postId"],     // These two fields combined must be unique
            type: "unique",                   // Constraint type
            name: "unique_user_post_like",    // Name for this constraint
        });
    },

    // "down" runs when you undo the migration (npx sequelize-cli db:migrate:undo)
    async down(queryInterface, Sequelize) {
        // Drop the entire Likes table (removes table and all its data)
        await queryInterface.dropTable("Likes");
    },
};
