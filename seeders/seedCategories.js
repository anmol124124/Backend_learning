// ---------------------------------------------------------
// SEED CATEGORIES SCRIPT
// ---------------------------------------------------------
// Creates default categories in the database

import { Category } from "../models/associations.js";
import sequelize from "../config/db.js";

const defaultCategories = [
    {
        name: "Technology",
        slug: "technology",
        description: "Tech news, programming, gadgets, and software development",
        icon: "💻",
        color: "#3b82f6"
    },
    {
        name: "Lifestyle",
        slug: "lifestyle",
        description: "Life tips, personal growth, and daily inspiration",
        icon: "🌟",
        color: "#ec4899"
    },
    {
        name: "News",
        slug: "news",
        description: "Current events, breaking news, and updates",
        icon: "📰",
        color: "#dc2626"
    },
    {
        name: "Entertainment",
        slug: "entertainment",
        description: "Movies, music, gaming, and pop culture",
        icon: "🎬",
        color: "#8b5cf6"
    },
    {
        name: "Sports",
        slug: "sports",
        description: "Sports news, updates, and analysis",
        icon: "⚽",
        color: "#10b981"
    },
    {
        name: "Business",
        slug: "business",
        description: "Business news, finance, startups, and entrepreneurship",
        icon: "💼",
        color: "#f59e0b"
    },
    {
        name: "Health",
        slug: "health",
        description: "Health tips, fitness, wellness, and medical news",
        icon: "🏥",
        color: "#06b6d4"
    },
    {
        name: "Education",
        slug: "education",
        description: "Learning resources, tutorials, and educational content",
        icon: "📚",
        color: "#6366f1"
    }
];

async function seedCategories() {
    try {
        console.log("🌱 Starting category seeding...");

        // Check database connection
        await sequelize.authenticate();
        console.log("✅ Database connected");

        // Create categories
        for (const category of defaultCategories) {
            const [createdCategory, created] = await Category.findOrCreate({
                where: { slug: category.slug },
                defaults: category
            });

            if (created) {
                console.log(`✅ Created category: ${category.name}`);
            } else {
                console.log(`ℹ️  Category already exists: ${category.name}`);
            }
        }

        console.log("🎉 Category seeding completed!");
    } catch (error) {
        console.error("❌ Error seeding categories:", error);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedCategories()
        .then(() => {
            console.log("✅ Seeding complete. Exiting...");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Seeding failed:", error);
            process.exit(1);
        });
}

export default seedCategories;
