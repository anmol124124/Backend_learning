// ---------------------------------------------------------
// SEED CATEGORIES SCRIPT
// ---------------------------------------------------------
// This script creates default blog categories in the database
// Run it once to populate the categories table with initial data
// Usage: node seeders/seedCategories.js

// Import the Category model and database connection
import { Category } from "../models/associations.js";
import sequelize from "../config/db.js";

// Define the default categories to create
// Each category has a name, URL-friendly slug, description, icon emoji, and color
const defaultCategories = [
    {
        name: "Technology",
        slug: "technology",                                                      // URL-friendly version of the name
        description: "Tech news, programming, gadgets, and software development",
        icon: "💻",                                                              // Emoji icon for the category
        color: "#3b82f6"                                                         // Blue color for UI display
    },
    {
        name: "Lifestyle",
        slug: "lifestyle",
        description: "Life tips, personal growth, and daily inspiration",
        icon: "🌟",
        color: "#ec4899"                                                         // Pink
    },
    {
        name: "News",
        slug: "news",
        description: "Current events, breaking news, and updates",
        icon: "📰",
        color: "#dc2626"                                                         // Red
    },
    {
        name: "Entertainment",
        slug: "entertainment",
        description: "Movies, music, gaming, and pop culture",
        icon: "🎬",
        color: "#8b5cf6"                                                         // Purple
    },
    {
        name: "Sports",
        slug: "sports",
        description: "Sports news, updates, and analysis",
        icon: "⚽",
        color: "#10b981"                                                         // Green
    },
    {
        name: "Business",
        slug: "business",
        description: "Business news, finance, startups, and entrepreneurship",
        icon: "💼",
        color: "#f59e0b"                                                         // Amber/Yellow
    },
    {
        name: "Health",
        slug: "health",
        description: "Health tips, fitness, wellness, and medical news",
        icon: "🏥",
        color: "#06b6d4"                                                         // Cyan
    },
    {
        name: "Education",
        slug: "education",
        description: "Learning resources, tutorials, and educational content",
        icon: "📚",
        color: "#6366f1"                                                         // Indigo
    }
];

/**
 * Main seeding function
 * Creates each category if it doesn't already exist
 */
async function seedCategories() {
    try {
        console.log("🌱 Starting category seeding...");

        // First check if we can connect to the database
        await sequelize.authenticate();
        console.log("✅ Database connected");

        // Loop through each default category and create it
        for (const category of defaultCategories) {
            // findOrCreate: creates the category ONLY if one with the same slug doesn't exist
            const [createdCategory, created] = await Category.findOrCreate({
                where: { slug: category.slug },    // Look for existing category by slug
                defaults: category                  // If not found, create with these values
            });

            // Log whether the category was created or already existed
            if (created) {
                console.log(`✅ Created category: ${category.name}`);
            } else {
                console.log(`ℹ️  Category already exists: ${category.name}`);
            }
        }

        console.log("🎉 Category seeding completed!");
    } catch (error) {
        console.error("❌ Error seeding categories:", error);
        throw error;                               // Re-throw to trigger the exit handler below
    }
}

// If this script is run directly (not imported), execute the seeding
// import.meta.url tells us the current file's URL
// process.argv[1] tells us what script was run from the command line
if (import.meta.url === `file://${process.argv[1]}`) {
    seedCategories()
        .then(() => {
            console.log("✅ Seeding complete. Exiting...");
            process.exit(0);                       // Exit with success code
        })
        .catch((error) => {
            console.error("❌ Seeding failed:", error);
            process.exit(1);                       // Exit with error code
        });
}

// Also export the function so it can be imported and used elsewhere
export default seedCategories;
