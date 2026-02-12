// ---------------------------------------------------------
// SEND EMAIL UTILITY
// ---------------------------------------------------------
// This function sends emails using Gmail SMTP (Simple Mail Transfer Protocol)
// Used for: password reset emails, notifications, etc.
// Supports PDF attachments!

// Import Nodemailer - a library for sending emails from Node.js
import nodemailer from "nodemailer";
// Import path module for working with file paths
import path from "path";
// Import file system module (not actively used but available)
import fs from "fs";
// Import our logger for logging email events
import logger from "../utils/logger.js";

/**
 * Send an email with optional PDF attachment
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} message - Email body text
 * @param {string} pdfPath - Optional path to a PDF file to attach
 */
const sendEmail = async ({ to, subject, message, pdfPath }) => {
  console.log("📧 Sending email with PDF...");
console.log("Recipient:", to);
  // Create a mail transporter (the "delivery truck" for emails)
  // Configured to use Gmail's SMTP server
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",                    // Gmail's mail server
    port: 587,                                  // Standard SMTP port for TLS
    secure: false,                              // Use TLS (not SSL)
    auth: {
      user: "anmol.madaan@edublockpro.com",     // Sender email address
      pass: "bnuy cqlm xima thxy",              // App-specific password (NOT regular password)
    },
  });

  // Configure the email details
  const mailOptions = {
    from: `"Backend App" <anmol.madaan@edublockpro.com>`,   // Sender name and email
    to,                                                       // Recipient email
    subject,                                                  // Email subject
    text: message,                                            // Email body text

    // If a PDF path is provided, attach it to the email
    attachments: pdfPath
      ? [
        {
          filename: path.basename(pdfPath),  // Just the filename (e.g., "report.pdf")
          path: pdfPath,                      // Full file path on the server
          contentType: "application/pdf",     // Tell email client it's a PDF
        },
      ]
      : [],                                     // No attachments if pdfPath is not provided
  };

  try {
    // Actually send the email
    await transporter.sendMail(mailOptions);
    logger.info("PDF PATH:", pdfPath);
    logger.info("✅ Email sent with PDF");
    console.log("To:", to);
  } catch (error) {
    // If sending fails, log the error
    console.error("❌ Error sending email:", error.message);
    throw error;                                // Re-throw so the caller can handle it
  }
};

// Export the sendEmail function
export default sendEmail;
