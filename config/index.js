// ---------------------------------------------------------
// CENTRALIZED CONFIGURATION
// ---------------------------------------------------------
// This file loads ALL environment variables and provides them
// to the rest of the app through a single config object
// If an environment variable is not set, it falls back to a default value

// Load environment variables from .env file
import "dotenv/config";

// The main config object - all settings in one place
const config = {
    env: process.env.NODE_ENV || "development",         // Current environment (development/production)
    port: process.env.PORT || 3000,                      // Server port number
    timezone: process.env.TZ || "Asia/Kolkata",          // Application timezone

    // Database settings (PostgreSQL)
    db: {
        name: process.env.DB_NAME || "mydatabase",       // Database name
        user: process.env.DB_USER || "postgres",         // Database username
        password: process.env.DB_PASSWORD || "admin123",  // Database password
        host: process.env.DB_HOST || "localhost",         // Database host
        port: process.env.DB_PORT || 5433,               // Database port
    },

    // Redis settings (for caching and CSRF tokens)
    redis: {
        url: process.env.REDIS_URL || "redis://localhost:6379",  // Redis connection URL
    },

    // JWT (JSON Web Token) settings for authentication
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || "mysecretkey",       // Secret for signing access tokens
        refreshSecret: process.env.JWT_REFRESH_SECRET || "refreshSecretKey", // Secret for signing refresh tokens
        accessExpiry: "15m",                                                  // Access token expires in 15 minutes
        refreshExpiry: "7d",                                                  // Refresh token expires in 7 days
    },

    // OAuth settings for social login (Google and GitHub)
    oauth: {
        google: {
            clientId: process.env.CLIENT_ID,                // Google OAuth client ID
            clientSecret: process.env.CLIENT_SECRET,        // Google OAuth client secret
            callbackUrl: process.env.CALLBACK_URL,          // URL Google redirects to after login
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,         // GitHub OAuth client ID
            clientSecret: process.env.GITHUB_CLIENT_SECRET, // GitHub OAuth client secret
            callbackUrl: process.env.GITHUB_CALLBACK_URL,   // URL GitHub redirects to after login
        }
    },

    // Cloudinary settings (cloud image hosting)
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,     // Cloudinary account name
        apiKey: process.env.CLOUDINARY_API_KEY,           // Cloudinary API key
        apiSecret: process.env.CLOUDINARY_API_SECRET,     // Cloudinary API secret
    },

    // Session settings
    session: {
        secret: process.env.SESSION_SECRET || "keyboard cat",  // Secret for signing session cookies
    }
};

// Export the config object for use throughout the app
export default config;
