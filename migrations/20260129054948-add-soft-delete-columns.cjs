// ---------------------------------------------------------
// MIGRATION: Add Soft Delete Columns
// ---------------------------------------------------------
// Soft delete means: instead of permanently deleting a record,
// we just set a "deletedAt" timestamp. The record stays in the
// database but is hidden from normal queries.
// This allows us to "undelete" records if needed!
//
// Tables affected: Posts, Comments, Likes

'use strict';

module.exports = {
  // "up" adds the deletedAt column to three tables
  async up(queryInterface, Sequelize) {
    console.log('Adding deletedAt columns for soft deletes...');

    // Add deletedAt to Posts table
    // When a post is "deleted", this gets set to the current date/time
    await queryInterface.addColumn('Posts', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,                // null means the record is NOT deleted
      defaultValue: null              // Default: not deleted
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

  // "down" removes the deletedAt columns (reverses the migration)
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
