// ---------------------------------------------------------
// PASSWORD RESET MIGRATION
// ---------------------------------------------------------
// Purpose: Add two new columns to 'users' table for password reset feature
// Columns: resetPasswordToken, resetPasswordExpires
// Created: 2026-01-27
// ---------------------------------------------------------

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    // ============================================
    // UP - This runs when you do: npm run migrate
    // ============================================
    async up(queryInterface, Sequelize) {

        // Add two new columns to the existing 'Users' table
        await queryInterface.addColumn('Users', 'resetPasswordToken', {
            type: Sequelize.STRING,           // Text field to store hashed reset token
            allowNull: true,                  // Can be empty - only filled when user requests password reset
            comment: 'Hashed token sent to user email for password reset'
        });

        await queryInterface.addColumn('Users', 'resetPasswordExpires', {
            type: Sequelize.DATE,             // Date/time field to store when token expires
            allowNull: true,                  // Can be empty - only filled when reset token is generated
            comment: 'Timestamp when the reset token expires (usually 1 hour from generation)'
        });

        console.log('✅ Password reset fields added to Users table');
    },

    // ============================================
    // DOWN - This runs when you do: npm run migrate:undo
    // ============================================
    async down(queryInterface, Sequelize) {

        // Remove the columns we added (reverses the migration)
        await queryInterface.removeColumn('Users', 'resetPasswordToken');
        await queryInterface.removeColumn('Users', 'resetPasswordExpires');

        console.log('✅ Password reset fields removed from Users table');
    }
};
