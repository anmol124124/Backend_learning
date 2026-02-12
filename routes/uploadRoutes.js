// ---------------------------------------------------------
// UPLOAD ROUTES
// ---------------------------------------------------------
// This file defines URL paths for file upload operations

// Import Express framework
import express from "express";
// Import multer/cloudinary upload middleware (handles file processing)
import upload from "../middleware/upload.js";
// Import auth middleware (uploading requires login)
import authMiddleware from "../middleware/authMiddleware.js";
// Import upload controller functions
import {
  uploadSingleFile,       // Handle one file upload
  uploadMultipleFiles,    // Handle multiple file uploads
} from "../controllers/uploadController.js";

// Create a new Express router
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload APIs
 */

/**
 * @swagger
 * /api/v1/upload/single:
 *   post:
 *     summary: Upload a single file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Single file uploaded successfully
 *       400:
 *         description: Bad request
 */
// POST /api/v1/upload/single → Upload a single file to Cloudinary
// Pipeline: auth check → multer processes the file → controller sends back URL
router.post(
  "/single",
  authMiddleware,                    // Must be logged in to upload
  upload.single("file"),              // Multer: accept one file with field name "file"
  uploadSingleFile                   // Controller: return the Cloudinary URL
);

/**
 * @swagger
 * /api/v1/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Multiple files uploaded successfully
 *       400:
 *         description: Bad request
 */
// POST /api/v1/upload/multiple → Upload up to 5 files at once to Cloudinary
router.post(
  "/multiple",
  authMiddleware,                    // Must be logged in to upload
  upload.array("files", 5),           // Multer: accept up to 5 files with field name "files"
  uploadMultipleFiles                // Controller: return array of Cloudinary URLs
);

// Export this router
export default router;
