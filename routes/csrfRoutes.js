import express from "express";
import csrfProtection from "../middleware/csrfMiddleware.js";
import { getCsrfToken } from "../controllers/csrfController.js";

const router = express.Router();

// Client will call this to get CSRF token
router.get("/token", csrfProtection, getCsrfToken);

export default router;


