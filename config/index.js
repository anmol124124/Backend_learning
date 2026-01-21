import "dotenv/config";

const config = {
    env: process.env.NODE_ENV || "development",
    port: process.env.PORT || 3000,
    timezone: process.env.TZ || "Asia/Kolkata",
    db: {
        name: process.env.DB_NAME || "mydatabase",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "admin123",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5433,
    },
    redis: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || "mysecretkey",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "refreshSecretKey",
        accessExpiry: "15m",
        refreshExpiry: "7d",
    },
    oauth: {
        google: {
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackUrl: process.env.CALLBACK_URL,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackUrl: process.env.GITHUB_CALLBACK_URL,
        }
    },
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    session: {
        secret: process.env.SESSION_SECRET || "keyboard cat",
    }
};

export default config;
