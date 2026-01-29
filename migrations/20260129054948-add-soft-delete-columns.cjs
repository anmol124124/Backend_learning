'use strict';

/**
 * Migration: Add Soft Delete Support
 * 
 * Adds deletedAt column to Posts, Comments, and Likes tables
 * for soft delete functionality (paranoid mode).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding deletedAt columns for soft deletes...');

    // Add deletedAt to Posts table
    await queryInterface.addColumn('Posts', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
    console.log('✅ Added deletedAt to Posts');

    // Add deletedAt to Comments table
    await queryInterface.addColumn('Comments', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
    console.log('✅ Added deletedAt to Comments');

    // Add deletedAt to Likes table
    await queryInterface.addColumn('Likes', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
    console.log('✅ Added deletedAt to Likes');

    console.log('\n🎉 Soft delete columns added successfully!');
  },

  async down(queryInterface, Sequelize) {
    console.log('Removing deletedAt columns...');

    await queryInterface.removeColumn('Likes', 'deletedAt');
    console.log('❌ Removed deletedAt from Likes');

    await queryInterface.removeColumn('Comments', 'deletedAt');
    console.log('❌ Removed deletedAt from Comments');

    await queryInterface.removeColumn('Posts', 'deletedAt');
    console.log('❌ Removed deletedAt from Posts');

    console.log('\n✅ Soft delete columns removed');
  }
};
