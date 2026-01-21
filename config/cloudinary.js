// ---------------------------------------------------------
// CLOUDINARY CONFIG FILE
// ---------------------------------------------------------

import { v2 as cloudinary } from "cloudinary";
import config from "./index.js";

// Cloudinary ko batate hain ki humare account ka naam kya hai,
// api key kya hai, aur secret key kya hai.
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export default cloudinary;
