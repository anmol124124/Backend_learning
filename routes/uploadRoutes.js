import express from "express";
import upload from "../middleware/upload.js";

import {
  uploadSingleFile,
  uploadMultipleFiles,
} from "../controllers/uploadController.js";

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
router.post(
  "/single",
  upload.single("file"),
  uploadSingleFile
);

/**
 * @swagger
 * /api/v1/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Upload]
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
router.post(
  "/multiple",
  upload.array("files", 5),
  uploadMultipleFiles
);

export default router;
