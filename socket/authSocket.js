import jwt from "jsonwebtoken";

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecretkey");

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
