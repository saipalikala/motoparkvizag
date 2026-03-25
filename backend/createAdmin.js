import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const password = await bcrypt.hash("admin123", 10);

await Admin.create({
  email: "admin@motopark.com",
  password
});

console.log("Admin created");

process.exit();