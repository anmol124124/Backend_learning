// ---------------------------------------------------------
// POST-TAG JUNCTION MODEL
// ---------------------------------------------------------
// Many-to-Many relationship between Posts and Tags

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const PostTag = sequelize.define("PostTag", {

    // Composite primary key: postId + tagId
    postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Posts",
            key: "id",
        },
        onDelete: "CASCADE",
    },

    tagId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Tags",
            key: "id",
        },
        onDelete: "CASCADE",
    },

}, {
    timestamps: true,
    tableName: "PostTags",
    indexes: [
        {
            unique: true,
            fields: ["postId", "tagId"], // Prevent duplicate tag on same post
        },
    ],
});

export default PostTag;
