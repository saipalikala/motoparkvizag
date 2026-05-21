import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { revokeToken } from "../middleware/authMiddleware.js";

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  // Validate inputs exist before touching bcrypt
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password required" });
  }

  // Always run bcrypt regardless of email match — prevents timing attack
  // that lets attacker enumerate whether an email is valid
  const emailMatch = email === process.env.ADMIN_EMAIL;
  const hashToCheck = emailMatch
    ? process.env.ADMIN_PASSWORD_HASH
    : "$2b$10$invalidhashpaddingtomakeitslowXXXXXXXXXXXXXXXXXXXXXXX"; // dummy — same cost factor

  const match = await bcrypt.compare(password, hashToCheck);

  if (!emailMatch || !match) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { role: "admin", email },
    process.env.JWT_SECRET,
    { expiresIn: "4h" }
  );

  res.json({ token });
};

export const logoutAdmin = (req, res) => {
  revokeToken(req.token);
  res.json({ message: "Logged out successfully" });
};