// queues/emailQueue.js

// 👉 Bull library import kar rahe hain
// Bull ka use background jobs / queue banane ke liye hota hai (jaise email bhejna)
import Queue from "bull";

// 👉 Redis client import (Redis ek memory-based system hota hai jo queue ka data store karta hai)
import redisClient from "../config/redis.js";

// --------------------------------------------------
// 👉 EMAIL QUEUE CREATE KAR RAHE HAIN
// --------------------------------------------------

// Yahan "emailQueue" naam ki ek queue ban rahi hai
// Is queue me email bhejne wale kaam (jobs) add honge
const emailQueue = new Queue("email-queue", {

  // 👉 Redis ki details de rahe hain
  // Bull ko pata hona chahiye ki Redis kahan chal raha hai
  redis: {
    host: "127.0.0.1",   // Matlab Redis isi machine (localhost) par chal raha hai
    port: 6379,          // Redis ka default port number
  },
});

// 👉 Is queue ko export kar rahe hain
// Taaki hum ise kahin aur use kar saken (job add karne ke liye)
export default emailQueue;
