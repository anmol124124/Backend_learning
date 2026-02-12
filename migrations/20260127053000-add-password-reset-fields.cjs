// ---------------------------------------------------------
// MIGRATION: Add Password Reset Fields to Users
// ---------------------------------------------------------
// Adds two new columns to the Users table for the "Forgot Password" feature:
// 1. resetPasswordToken - stores the hashed reset token
// 2. resetPasswordExpires - when the token expires (usually 1 hour)

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    // "up" runs when you apply the migration (npm run migrate)
    async up(queryInterface, Sequelize) {

        // Add column to store the hashed password reset token
        await queryInterface.addColumn('Users', 'resetPasswordToken', {
            type: Sequelize.STRING,           // Text field for the hashed token
            allowNull: true,                  // Empty when no reset has been requested
            comment: 'Hashed token sent to user email for password reset'
        });

        // Add column to store when the reset token expires
        await queryInterface.addColumn('Users', 'resetPasswordExpires', {
            type: Sequelize.DATE,             // Date/time field
            allowNull: true,                  // Empty when no reset has been requested
            comment: 'Timestamp when the reset token expires (usually 1 hour from generation)'
        });

        console.log('✅ Password reset fields added to Users table');
    },

    // "down" runs when you undo the migration (npm run migrate:undo)
    async down(queryInterface, Sequelize) {

        // Remove the columns we added (reverses the migration)
        await queryInterface.removeColumn('Users', 'resetPasswordToken');
        await queryInterface.removeColumn('Users', 'resetPasswordExpires');

        console.log('✅ Password reset fields removed from Users table');
    }
};
