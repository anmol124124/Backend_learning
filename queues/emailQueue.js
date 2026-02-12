// ---------------------------------------------------------
// EMAIL QUEUE (Bull Queue)
// ---------------------------------------------------------
// This file creates a job queue for sending emails in the background
// Instead of sending emails directly (which is slow), we add them to a queue
// The emailWorker picks up jobs from this queue and processes them

// Import Bull - a library for creating job queues backed by Redis
import Queue from "bull";

// Import Redis client (not directly used here, but queues depend on Redis)
import redisClient from "../config/redis.js";

// Create a new queue named "email-queue"
// This queue stores email-sending jobs until a worker processes them
const emailQueue = new Queue("email-queue", {

  // Redis connection details
  // Bull uses Redis to store queue data (jobs, state, etc.)
  redis: {
    host: "127.0.0.1",          // Redis is running on this machine (localhost)
    port: 6379,                  // Redis default port
  },
});

// Export the queue so other files can add jobs to it
// Usage: emailQueue.add({ to: "user@email.com", subject: "...", message: "..." })
export default emailQueue;
