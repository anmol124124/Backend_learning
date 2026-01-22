"use strict";

// This file is a Sequelize migration
// Migration ka matlab: database ke structure ko banana / change karna
module.exports = {
    
    // "up" function tab chalta hai jab hum migration run karte hain
    // command: npx sequelize-cli db:migrate
    async up(queryInterface, Sequelize) {

        // Database me "Likes" naam ki table create ho rahi hai
        await queryInterface.createTable("Likes", {

            // Unique ID for each like
            id: {
                type: Sequelize.INTEGER,      // Number type column
                autoIncrement: true,          // Automatically increases (1,2,3...)
                primaryKey: true,             // Primary key (unique identifier)
                allowNull: false,             // Value required
            },

            // ID of the user who liked the post
            userId: {
                type: Sequelize.INTEGER,      // User ID will be a number
                allowNull: false,             // User ID is mandatory

                // Foreign key: linked with Users table
                references: { model: "Users", key: "id" },

                // Agar user delete ho jaye
                // toh uske likes bhi automatically delete ho jayenge
                onDelete: "CASCADE",
            },

            // ID of the post which is liked
            postId: {
                type: Sequelize.INTEGER,      // Post ID will be a number
                allowNull: false,             // Post ID is mandatory

                // Foreign key: linked with Posts table
                references: { model: "Posts", key: "id" },

                // Agar post delete ho jaye
                // toh uske likes bhi automatically delete ho jayenge
                onDelete: "CASCADE",
            },

            // Automatically stores when the like was created
            createdAt: {
                type: Sequelize.DATE,         // Date & time
                allowNull: false,
            },

            // Automatically stores when the like was last updated
            updatedAt: {
                type: Sequelize.DATE,         // Date & time
                allowNull: false,
            },
        });

        // Unique constraint add kar rahe hain
        // Matlab: same user same post ko dobara like nahi kar sakta
        await queryInterface.addConstraint("Likes", {
            fields: ["userId", "postId"],     // Combination of these two fields
            type: "unique",                   // Must be unique
            name: "unique_user_post_like",    // Constraint ka naam
        });
    },

    // "down" function tab chalta hai jab migration rollback karte hain
    // command: npx sequelize-cli db:migrate:undo
    async down(queryInterface, Sequelize) {

        // "Likes" table ko database se completely delete kar deta hai
        await queryInterface.dropTable("Likes");
    },
};
