import jwt from "jsonwebtoken";
import config from "../config/index.js";

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // attach user info to socket
    socket.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(new Error("Invalid token"));
  }
};

export default socketAuth;
