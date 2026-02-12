// ---------------------------------------------------------
// UPLOAD CONTROLLER
// ---------------------------------------------------------
// This file handles file upload operations (single and multiple)

// Importing error-catching wrapper to handle errors automatically
import catchAsync from "../utils/catchAsync.js";
// Importing custom error class for meaningful error messages
import AppError from "../utils/AppError.js";
// Importing helper for sending consistent success responses
import { successResponse } from "../utils/apiResponse.js";

/* ===========================
   SINGLE FILE UPLOAD
=========================== */
// This function handles uploading a single file (like a profile picture)
export const uploadSingleFile = catchAsync(async (req, res, next) => {
  // req.file is set by the upload middleware (multer) - contains the uploaded file info
  // If no file was attached to the request, return an error
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  // Send success response with the URL where the file is stored on Cloudinary
  successResponse(res, "Single file uploaded successfully", {
    url: req.file.path, // The public URL from Cloudinary
  });
});

/* ===========================
   MULTIPLE FILE UPLOAD
=========================== */
// This function handles uploading multiple files at once
export const uploadMultipleFiles = catchAsync(async (req, res, next) => {
  // req.files is an array of uploaded files (set by multer's array middleware)
  // If no files were attached or the array is empty, return an error
  if (!req.files || req.files.length === 0) {
    return next(new AppError("No files uploaded", 400));
  }

  // Extract the Cloudinary URL from each uploaded file
  const urls = req.files.map((file) => file.path);

  // Send success response with all the uploaded file URLs
  successResponse(res, "Multiple files uploaded successfully", { urls });
});
