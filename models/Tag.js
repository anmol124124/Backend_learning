// ---------------------------------------------------------
// TAG MODEL
// ---------------------------------------------------------
// Stores unique tags that can be attached to posts

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Tag = sequelize.define("Tag", {

    // Primary key
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },

    // Tag name (e.g., "JavaScript", "React", "Backend")
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [1, 50],
        },
    },

    // URL-friendly version (e.g., "javascript", "react", "backend")
    slug: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [1, 50],
            is: /^[a-z0-9-]+$/i, // Only letters, numbers, hyphens
        },
    },

    // How many posts use this tag
    usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0,
        },
    },

}, {
    timestamps: true, // createdAt and updatedAt
    tableName: "Tags",
});

export default Tag;
