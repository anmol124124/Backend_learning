// Morgan library import kar rahe hain
// Morgan HTTP requests (GET, POST, etc.) ke logs banata hai
import morgan from "morgan";

// Apna custom Winston logger import kar rahe hain
// Ye logger terminal + file dono me logs likhta hai
import logger from "../utils/logger.js";

// Morgan ko Winston ke saath connect kar rahe hain
// Taaki HTTP request logs bhi Winston ke through jaye
const httpLogger = morgan(

  // Ye format batata hai ki log me kya-kya aayega
  // :method        → GET / POST
  // :url           → request ka URL
  // :status        → response status code (200, 404, 500)
  // :response-time → request ko kitna time laga (ms me)
  ":method :url :status :response-time ms",

  {
    // Morgan normally console.log karta hai
    // Par hum uska output apne Winston logger me bhej rahe hain
    stream: {

      // Jab bhi koi HTTP request aati hai,
      // Morgan ye write function call karta hai
      write: (message) => {

        // message ke end me extra new line hoti hai
        // trim() se us extra space ko hata dete hain
        // logger.info() se log ko info level par save kar dete hain
        logger.info(message.trim());
      },
    },
  }
);

// Is middleware ko export kar rahe hain
// Taaki app.js / server.js me use kar sake
export default httpLogger;
