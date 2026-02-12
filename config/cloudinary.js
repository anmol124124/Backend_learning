// ---------------------------------------------------------
// CLOUDINARY CONFIGURATION
// ---------------------------------------------------------
// Cloudinary is a cloud service that hosts images and files
// This file connects our app to our Cloudinary account

// Import the Cloudinary SDK (version 2)
import { v2 as cloudinary } from "cloudinary";
// Import our centralized config to get Cloudinary credentials
import config from "./index.js";

// Configure Cloudinary with our account credentials
// These are loaded from environment variables via config
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,     // Our Cloudinary account name
  api_key: config.cloudinary.apiKey,           // Our API key (like a username)
  api_secret: config.cloudinary.apiSecret,     // Our API secret (like a password)
});

// Export the configured Cloudinary instance
export default cloudinary;
