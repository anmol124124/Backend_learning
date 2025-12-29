// ---------------------------------------------------------
// CLOUDINARY CONFIG FILE
// ---------------------------------------------------------

import { v2 as cloudinary } from "cloudinary";

// Cloudinary ko batate hain ki humare account ka naam kya hai,
// api key kya hai, aur secret key kya hai.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,   // Cloudinary dashboard se lo
  api_key: process.env.CLOUDINARY_API_KEY,         // Safe access key
  api_secret: process.env.CLOUDINARY_API_SECRET,   // Secret key for secure upload
});

export default cloudinary;
