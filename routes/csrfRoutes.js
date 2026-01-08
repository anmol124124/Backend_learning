import express from "express";
import csrfProtection from "../middleware/csrfMiddleware.js";

const router = express.Router();

// Client will call this to get CSRF token
router.get("/token", csrfProtection, (req, res) => {
  res.json({
    csrfToken: req.csrfToken(),
  });
});

export default router;

