# Professional Backend Learning Project 🚀

A robust, enterprise-ready Node.js & Express backend structured with professional architecture, standardized error handling, and centralized configuration.

## 🏗 Architecture Overview

The project follows a modular and scalable structure designed for maintainability and security.

### Key Components:
- **Centralized Error Handling**: Custom `AppError` class and `catchAsync` wrapper to handle all operational errors consistently.
- **Global Config**: Single source of truth in `config/index.js` for environment variables, secrets, and connection strings.
- **Database**: Layered Sequelize ORM with migrations and associations.
- **Security**: Pre-configured with Helmet (security headers), Rate Limiting, CSRF Protection, and Passport.io (OAuth).
- **Caching**: Redis integration for high-performance data retrieval.

---

## 🛠 Tech Stack

- **Framework**: Express.js
- **Database**: PostgreSQL (Sequelize ORM)
- **Cache**: Redis
- **Auth**: JWT & Passport (Google, GitHub)
- **Validation**: Joi
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v22+)
- Docker & Docker Compose (Recommended)
- PostgreSQL & Redis (if running locally)

### Setup
1.  **Clone the repository**
2.  **Install dependencies**
    ```bash
    npm install
    ```
3.  **Environment Variables**
    Create a `.env` file based on `.env.example` (or use the provided setup scripts).
    ```bash
    npm run setup
    ```
4.  **Run with Docker (Easiest)**
    ```bash
    npm run dev:docker
    ```
5.  **Run Locally**
    ```bash
    npm run dev
    ```

---

## 📜 Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Start development server with Nodemon |
| `npm run setup` | Quick setup for local environment variables |
| `npm run test` | Run all unit and integration tests |
| `npm run migration:up` | Run pending database migrations |
| `npm run migration:down` | Undo the last database migration |

---

## 🛡 Professional Features Explained

### 1. Error Handling System
We use a centralized system to ensure the app never crashes silently and the user always gets predictable responses.
- **Development**: You see the full error stack trace for debugging.
- **Production**: Users see clean, localized messages; secrets and stack traces are hidden.

### 2. Configuration Centralization
No more `process.env` scattered across the code. Everything is mapped in `config/index.js`.
- If a secret is missing, you find out immediately at startup.
- Changing a DB host or Port happens in only one place.

### 3. API Consistency
Every API response follows the same format:
```json
{
  "success": true,
  "message": "Action completed",
  "data": { ... }
}
```

---

## 📖 Documentation
Once the server is running, visit:
`http://localhost:3000/api-docs` to view the **Swagger Interactive API Documentation**.
