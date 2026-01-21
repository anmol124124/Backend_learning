import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";

/* ===========================
   SINGLE FILE UPLOAD
=========================== */
export const uploadSingleFile = catchAsync(async (req, res, next) => {
  // req.file → upload middleware se aata hai
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  successResponse(res, "Single file uploaded successfully", {
    url: req.file.path, // Cloudinary public URL
  });
});

/* ===========================
   MULTIPLE FILE UPLOAD
=========================== */
export const uploadMultipleFiles = catchAsync(async (req, res, next) => {
  // req.files → array aata hai
  if (!req.files || req.files.length === 0) {
    return next(new AppError("No files uploaded", 400));
  }

  const urls = req.files.map((file) => file.path);

  successResponse(res, "Multiple files uploaded successfully", { urls });
});
