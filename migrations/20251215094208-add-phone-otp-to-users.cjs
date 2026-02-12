// ---------------------------------------------------------
// MIGRATION: Add Phone & OTP Columns to Users
// ---------------------------------------------------------
// This migration adds phone number and OTP (One-Time Password) columns
// to the Users table for phone-based authentication

'use strict';

module.exports = {
  // "up" adds the new columns
  async up(queryInterface, Sequelize) {
    // Add a phone number column (optional, must be unique if provided)
    await queryInterface.addColumn('Users', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,                // Phone number is optional
      unique: true,                   // No two users can have the same phone number
    });

    // Add an OTP column (stores the one-time password temporarily)
    await queryInterface.addColumn('Users', 'otp', {
      type: Sequelize.STRING,
      allowNull: true,                // Empty when no OTP is active
    });

    // Add an OTP expiry column (when the OTP stops being valid)
    await queryInterface.addColumn('Users', 'otpExpiry', {
      type: Sequelize.DATE,
      allowNull: true,                // Empty when no OTP is active
    });
  },

  // "down" removes the columns (reverses the migration)
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'phone');
    await queryInterface.removeColumn('Users', 'otp');
    await queryInterface.removeColumn('Users', 'otpExpiry');
  },
};
