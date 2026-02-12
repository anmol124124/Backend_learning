// ---------------------------------------------------------
// EMAIL WORKER
// ---------------------------------------------------------
// This worker processes email-sending jobs from the email queue
// It runs in the background and picks up jobs one by one
// If a job fails, Bull automatically retries it
// After all retries fail, the job is moved to the Dead Letter Queue (DLQ)

// Import the email queue (where jobs are waiting to be processed)
import emailQueue from "../queues/emailQueue.js";

// Import the Dead Letter Queue (for permanently failed jobs)
import deadLetterQueue from "../queues/deadLetterQueue.js";

// Import the actual email sending function
import sendEmail from "../utils/sendEmail.js";

// ---------------------------------------------------------
// PROCESS EMAIL JOBS
// ---------------------------------------------------------
// emailQueue.process() tells Bull: "When a new job arrives, run this function"
emailQueue.process(async (job) => {
  try {
    // Extract email details from the job data
    const { to, subject, message, pdfPath } = job.data;

    console.log("📧 Worker picked email job");

    // Actually send the email using our sendEmail utility
    await sendEmail({
      to,                               // Recipient email address
      subject,                          // Email subject
      message,                          // Email body
      pdfPath,                          // Optional PDF attachment path
    });

    console.log("✅ Email sent successfully");

  } catch (error) {
    console.log("❌ Email failed");

    // Check if all retry attempts have been exhausted
    // Bull automatically retries failed jobs (configurable number of attempts)
    if (job.attemptsMade >= job.opts.attempts) {
      console.log("☠️ Moving job to Dead Letter Queue");

      // Move the failed job to the DLQ for later debugging
      await deadLetterQueue.add({
        originalJobId: job.id,          // ID of the original job
        data: job.data,                 // The email data that failed
        error: error.message,           // Why it failed
        failedAt: new Date(),           // When it finally gave up
      });
    }

    // Re-throw the error so Bull knows the job failed
    // This triggers automatic retry (if attempts remain)
    throw error;
  }
});
