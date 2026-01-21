import "dotenv/config";

const config = {
    env: process.env.NODE_ENV || "development",
    port: process.env.PORT || 3000,
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
};

export default config;
