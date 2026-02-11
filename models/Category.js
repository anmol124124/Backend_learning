// ---------------------------------------------------------
// CATEGORY MODEL
// ---------------------------------------------------------
// Predefined categories for posts (Technology, Lifestyle, etc.)

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Category = sequelize.define("Category", {

    // Primary key
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },

    // Category name (e.g., "Technology", "Lifestyle")
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [2, 50],
        },
    },

    // URL-friendly slug (e.g., "technology", "lifestyle")
    slug: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [2, 50],
            is: /^[a-z0-9-]+$/i,
        },
    },

    // Category description
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    // Emoji icon (e.g., "💻", "🌟")
    icon: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },

    // Hex color code (e.g., "#3b82f6")
    color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        validate: {
            is: /^#[0-9A-Fa-f]{6}$/,
        },
    },

    // Number of posts in this category
    postCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0,
        },
    },

}, {
    timestamps: true,
    tableName: "Categories",
});

export default Category;
