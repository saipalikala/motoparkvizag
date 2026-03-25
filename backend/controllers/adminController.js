import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const adminLogin = async (req, res) => {

  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });

  if (!admin) {
    return res.status(400).json({ message: "Admin not found" });
  }

  const match = await bcrypt.compare(password, admin.password);

  if (!match) {
    return res.status(400).json({ message: "Invalid password" });
  }

  const token = jwt.sign(
    { id: admin._id },
    "motoparksecret",
    { expiresIn: "1d" }
  );

  res.json({ token });

};