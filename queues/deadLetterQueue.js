import Queue from "bull";

const deadLetterQueue = new Queue("dead-letter-queue", {
  redis: {
    host: "127.0.0.1",
    port: 6379,
  },
});

export default deadLetterQueue;
