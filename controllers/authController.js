import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import emailQueue from "../queues/emailQueue.js";

/* ===========================
   REGISTER CONTROLLER
=========================== */
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    // 📧 Email Queue
    await emailQueue.add({
      to: email,
      subject: "Welcome to our app",
      message: `Hello ${username}, welcome to our app.`,
      pdfPath: "/home/user/Downloads/Template-1 (11).pdf",
    });

    res.json({
      message: "User registered successfully",
      userId: newUser.id,
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================
   LOGIN CONTROLLER
=========================== */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      "mysecretkey",
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      "refreshSecretKey",
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================
   REFRESH TOKEN
=========================== */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const user = await User.findOne({ where: { refreshToken } });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    jwt.verify(refreshToken, "refreshSecretKey", (err) => {
      if (err) {
        return res.status(401).json({ message: "Token expired" });
      }

      const newAccessToken = jwt.sign(
        { userId: user.id, role: user.role },
        "mysecretkey",
        { expiresIn: "15m" }
      );

      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    console.log("REFRESH ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================
   LOGOUT
=========================== */
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const user = await User.findOne({ where: { refreshToken } });
    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }

    user.refreshToken = null;
    await user.save();

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("LOGOUT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const oauthSuccess = async (req, res) => {
  const user = req.user;

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    "mysecretkey",
    { expiresIn: "15m" }
  );

  res.json({
    message: "OAuth login successful",
    accessToken,
  });
};
