import express from "express";
import upload from "../middleware/upload.js";

import {
  uploadSingleFile,
  uploadMultipleFiles,
} from "../controllers/uploadController.js";

const router = express.Router();

// 🔹 Single file upload
// POST /api/v1/upload/single
router.post(
  "/single",
  upload.single("file"),
  uploadSingleFile
);

// 🔹 Multiple files upload
// POST /api/v1/upload/multiple
router.post(
  "/multiple",
  upload.array("files", 5),
  uploadMultipleFiles
);

export default router;
