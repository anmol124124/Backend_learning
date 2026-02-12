// ---------------------------------------------------------
// MODELS INDEX FILE (Auto-loader for Sequelize CLI)
// ---------------------------------------------------------
// This file automatically loads all model files in this directory
// It's mainly used by Sequelize CLI tools (migrations, seeders)
// Your app uses the ESM imports in associations.js instead

// Strict mode: enforces cleaner JavaScript code
'use strict';

// Importing Node.js built-in modules
const fs = require('fs');              // File system module to read directory contents
const path = require('path');          // Path module to work with file paths
const Sequelize = require('sequelize'); // Sequelize ORM library
const process = require('process');     // Process module for environment variables
// Get the filename of THIS file (index.js)
const basename = path.basename(__filename);
// Check which environment we're in (development, test, or production)
const env = process.env.NODE_ENV || 'development';
// Load the database config for the current environment from config.json
const config = require(__dirname + '/../config/config.json')[env];
// Empty object to store all loaded models
const db = {};

// Create a Sequelize database connection
let sequelize;
if (config.use_env_variable) {
  // If config says to use an environment variable for the database URL
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  // Otherwise, use the database name, username, and password from config
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Read all files in the current directory (models folder)
fs
  .readdirSync(__dirname)             // Read all files in /models directory
  .filter(file => {                   // Filter to only include model files
    return (
      file.indexOf('.') !== 0 &&      // Ignore hidden files (starting with .)
      file !== basename &&            // Ignore this file itself (index.js)
      file.slice(-3) === '.js' &&     // Only include .js files
      file.indexOf('.test.js') === -1 // Ignore test files
    );
  })
  .forEach(file => {                  // For each model file found:
    // Load the model from the file and initialize it with sequelize connection
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    // Add the model to our db object using the model's name as the key
    db[model.name] = model;
  });

// Set up associations (relationships) between models
Object.keys(db).forEach(modelName => {
  // If the model has an associate method defined, call it
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Attach the sequelize connection and library to the db object
db.sequelize = sequelize;             // The database connection instance
db.Sequelize = Sequelize;             // The Sequelize library itself

// Export the db object (contains all models + connection)
module.exports = db;
