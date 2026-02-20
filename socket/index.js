// ---------------------------------------------------------
// SOCKET.IO INITIALIZATION
// ---------------------------------------------------------
// Socket.IO enables real-time, bidirectional communication
// Example uses: live chat, notifications, real-time updates
// Unlike regular HTTP (request → response), sockets stay connected

// Import Socket.IO Server class
import { Server } from "socket.io";
// Import JWT for authenticating socket connections
import jwt from "jsonwebtoken";

// Create a Socket.IO server (will be attached to HTTP server later)
// This is exported so app.js can access it
export let io;

/**
 * Initialize Socket.IO and set up event handlers
 * @param {http.Server} server - The HTTP server to attach Socket.IO to
 */
const initSocket = (server) => {
  // Create a new Socket.IO server attached to the HTTP server
  io = new Server(server, {
    cors: {
      origin: "*",                    // Allow connections from any origin (for development)
    },
  });

  // Store which users are currently online
  // Map format: userId → socketId (e.g., 5 → "abc123xyz")
  const onlineUsers = new Map();

  // AUTHENTICATION MIDDLEWARE for Socket.IO connections
  // Every socket connection must provide a valid JWT token
  io.use((socket, next) => {
    try {
      // Get the token from the connection's auth data
      const token = socket.handshake.auth.token;
      // If no token provided, reject the connection
      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      // Verify and decode the JWT token
      const decoded = jwt.verify(token, "mysecretkey");
      // Attach the userId to the socket for later use
      socket.userId = decoded.userId;

      // Token is valid → allow the connection
      next();
    } catch (err) {
      // Token is invalid → reject the connection
      next(new Error("Invalid token"));
    }
  });

  // Handle new socket connections (after authentication passes)
  io.on("connection", (socket) => {
    console.log(`🟢 User connected: ${socket.userId}`);

    // Save the user's socket ID so we can send them messages later
    onlineUsers.set(socket.userId, socket.id);

    // Handle private messages between users
    socket.on("private_message", ({ toUserId, message }) => {
      // Look up the recipient's socket ID
      const receiverSocketId = onlineUsers.get(toUserId);

      // If the recipient is online, send them the message
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("private_message", {
          fromUserId: socket.userId,     // Who sent the message
          message,                        // The message content
        });
      }
    });

    // Handle user disconnecting (closing browser, logging out, etc.)
    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId);  // Remove from online users map
      console.log(`🔴 User disconnected: ${socket.userId}`);
    });
  });
};

// Export the initSocket function
export default initSocket;
