import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Bookmark = sequelize.define(
    "Bookmark",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Users",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        postId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Posts",
                key: "id",
            },
            onDelete: "CASCADE",
        },
    },
    {
        tableName: "Bookmarks",
        timestamps: true,
        updatedAt: false, // Only track when bookmark was created
        indexes: [
            {
                unique: true,
                fields: ["userId", "postId"], // One bookmark per user per post
            },
            {
                fields: ["userId"], // Fast lookup of user's bookmarks
            },
            {
                fields: ["postId"], // Fast lookup of post's bookmarks
            },
        ],
    }
);

export default Bookmark;
