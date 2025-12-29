// ---------------------------------------------------------
// MULTER + CLOUDINARY STORAGE SETUP
// ---------------------------------------------------------

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Storage setup → multer ko batate hain ki file cloudinary me save hogi
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "backend_uploads",   // Cloudinary folder name
    allowed_formats: ["jpg", "png", "jpeg", "pdf"], // Allowed file types
  },
});

// Multer instance → ye humare route me use hoga
const upload = multer({ storage: storage });

export default upload;
