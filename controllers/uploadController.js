/* ===========================
   SINGLE FILE UPLOAD
=========================== */
export const uploadSingleFile = async (req, res) => {
  try {
    // req.file → upload middleware se aata hai
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    res.json({
      message: "Single file uploaded successfully",
      url: req.file.path, // Cloudinary public URL
    });
  } catch (error) {
    console.log("SINGLE UPLOAD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================
   MULTIPLE FILE UPLOAD
=========================== */
export const uploadMultipleFiles = async (req, res) => {
  try {
    // req.files → array aata hai
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No files uploaded",
      });
    }

    const urls = req.files.map((file) => file.path);

    res.json({
      message: "Multiple files uploaded successfully",
      urls,
    });
  } catch (error) {
    console.log("MULTIPLE UPLOAD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
