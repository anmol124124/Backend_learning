// ---------------------------------------------------------
// FILE UPLOAD MIDDLEWARE (Multer + Cloudinary)
// ---------------------------------------------------------
// This middleware handles file uploads from users
// Files are stored in Cloudinary (cloud image hosting) instead of local disk

// Import Multer - a library for handling file uploads in Express
import multer from "multer";
// Import the Cloudinary storage adapter for Multer
import { CloudinaryStorage } from "multer-storage-cloudinary";
// Import our configured Cloudinary instance
import cloudinary from "../config/cloudinary.js";

// Configure WHERE and HOW uploaded files should be stored
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,                                    // Use our Cloudinary account
  params: {
    folder: "backend_uploads",                               // Save files in this Cloudinary folder
    allowed_formats: ["jpg", "png", "jpeg", "pdf"],          // Only allow these file types
  },
});

// Create the Multer upload instance using Cloudinary storage
// This is used in routes like: upload.single("file") or upload.array("files", 5)
const upload = multer({ storage: storage });

// Export the upload middleware so route files can use it
export default upload;
