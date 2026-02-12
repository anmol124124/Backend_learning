// ---------------------------------------------------------
// DEAD LETTER QUEUE (DLQ)
// ---------------------------------------------------------
// A DLQ stores jobs that have failed too many times
// Instead of losing failed jobs, we move them here for debugging
// Example: An email that failed to send 3 times gets stored here

// Import Bull for creating the queue
import Queue from "bull";

// Create a "dead-letter-queue" in Redis
// Failed jobs from other queues get moved here
const deadLetterQueue = new Queue("dead-letter-queue", {
  redis: {
    host: "127.0.0.1",          // Redis is on localhost
    port: 6379,                  // Redis default port
  },
});

// Export the DLQ so workers can add failed jobs to it
export default deadLetterQueue;
