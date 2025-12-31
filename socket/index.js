import { Server } from "socket.io";
import jwt from "jsonwebtoken";

/**
 * Initialize Socket.IO
 * @param {http.Server} server - HTTP server instance
 */
const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // Store online users
  const onlineUsers = new Map();

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, "mysecretkey");
      socket.userId = decoded.userId;

      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🟢 User connected: ${socket.userId}`);

    // Save socket id against user
    onlineUsers.set(socket.userId, socket.id);

    socket.on("private_message", ({ toUserId, message }) => {
      const receiverSocketId = onlineUsers.get(toUserId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("private_message", {
          fromUserId: socket.userId,
          message,
        });
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId);
      console.log(`🔴 User disconnected: ${socket.userId}`);
    });
  });
};

export default initSocket; // ✅ VERY IMPORTANT
