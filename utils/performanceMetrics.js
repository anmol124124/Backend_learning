import os from "os";
import process from "process";

export const logMetrics = () => {
  const memoryUsage = process.memoryUsage();
  const cpuLoad = os.loadavg();

  // console.log("📊 PERFORMANCE METRICS");
  // console.log(`Memory RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  // console.log(`Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  // console.log(`CPU Load (1m): ${cpuLoad[0].toFixed(2)}`);
};
