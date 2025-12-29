import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import logger from "../utils/logger.js";
const sendEmail = async ({ to, subject, message, pdfPath }) => {
  console.log("📧 Sending email with PDF...");

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "anmol.madaan@edublockpro.com",
      pass: "bnuy cqlm xima thxy",
    },
  });

  const mailOptions = {
    from: `"Backend App" <anmol.madaan@edublockpro.com>`,
    to,
    subject,
    text: message,

    // ✅ PDF ATTACHMENT
    attachments: pdfPath
      ? [
          {
            filename: path.basename(pdfPath), // example: report.pdf
            path: pdfPath, // full path of pdf
            contentType: "application/pdf",
          },
        ]
      : [],
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info("PDF PATH:", pdfPath);
    logger.info("✅ Email sent with PDF");
    console.log("To:", to);
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw error; // Re-throw to let the worker handle it
  }
};

export default sendEmail;
