// ---------------------------------------------------------
// CSRF ROUTES
// ---------------------------------------------------------
// This file provides a route for the frontend to get a CSRF token
// CSRF tokens prevent attackers from making fake requests using your session

// Import Express framework
import express from "express";
// Import CSRF protection middleware (generates the token)
import csrfProtection from "../middleware/csrfMiddleware.js";
// Import the controller that returns the CSRF token
import { getCsrfToken } from "../controllers/csrfController.js";

// Create a new Express router
const router = express.Router();

// GET /api/v1/csrf/token → Frontend calls this to get a CSRF token
// The csrfProtection middleware generates the token, getCsrfToken sends it back
router.get("/token", csrfProtection, getCsrfToken);

// Export this router
export default router;
