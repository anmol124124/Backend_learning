// ---------------------------------------------------------
// CLOUDINARY CONFIG FILE
// ---------------------------------------------------------

import { v2 as cloudinary } from "cloudinary";

// Cloudinary ko batate hain ki humare account ka naam kya hai,
// api key kya hai, aur secret key kya hai.
cloudinary.config({
  cloud_name: "dzgn2pdle",   // Cloudinary dashboard se lo
  api_key: "136369346866993",         // Safe access key
  api_secret: "949SpEiOJFkllat4UQF_-fTI96g",   // Secret key for secure upload
});

export default cloudinary;
