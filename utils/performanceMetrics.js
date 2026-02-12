// ---------------------------------------------------------
// PERFORMANCE METRICS UTILITY
// ---------------------------------------------------------
// This function logs system resource usage (memory and CPU)
// Useful for monitoring how much resources your server is using

// Import OS module for CPU load information
import os from "os";
// Import process module for memory usage information
import process from "process";

/**
 * Log current performance metrics
 * Tracks: Memory (RSS, Heap) and CPU load average
 * Currently commented out to reduce console noise
 */
export const logMetrics = () => {
  // Get current memory usage of the Node.js process
  const memoryUsage = process.memoryUsage();
  // Get CPU load average for the last 1, 5, and 15 minutes
  const cpuLoad = os.loadavg();

  // Logging is currently disabled (uncomment to enable):
  // console.log("📊 PERFORMANCE METRICS");
  // console.log(`Memory RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  // console.log(`Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  // console.log(`CPU Load (1m): ${cpuLoad[0].toFixed(2)}`);
};
