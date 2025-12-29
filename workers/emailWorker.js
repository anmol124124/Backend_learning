// 👉 Email queue import
import emailQueue from "../queues/emailQueue.js";

// 👉 DLQ import
import deadLetterQueue from "../queues/deadLetterQueue.js";

// 👉 Real email sender
import sendEmail from "../utils/sendEmail.js";

// --------------------------------------------------
// 👉 EMAIL WORKER
// --------------------------------------------------

emailQueue.process(async (job) => {
  try {
    const { to, subject, message, pdfPath } = job.data;

    console.log("📧 Worker picked email job");

    // 👉 Real email send
    await sendEmail({
      to,
      subject,
      message,
      pdfPath,
    });

    console.log("✅ Email sent successfully");

  } catch (error) {
    console.log("❌ Email failed");

    // --------------------------------------------------
    // 👉 CHECK: retries khatam ho gaye?
    // --------------------------------------------------
    if (job.attemptsMade >= job.opts.attempts) {
      console.log("☠️ Moving job to Dead Letter Queue");

      await deadLetterQueue.add({
        originalJobId: job.id,
        data: job.data,
        error: error.message,
        failedAt: new Date(),
      });
    }

    // ❗ error throw karna zaroori hai
    // taki Bull retry kare
    throw error;
  }
});
