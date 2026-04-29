import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { revokeToken } from "../middleware/authMiddleware.js"; // ✅ ADD THIS

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (email !== process.env.ADMIN_EMAIL) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

  if (!match) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { role: "admin",email  },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
};

// ✅ ADD THIS FUNCTION
export const logoutAdmin = (req, res) => {
  revokeToken(req.token);
  res.json({ message: "Logged out successfully" });
};