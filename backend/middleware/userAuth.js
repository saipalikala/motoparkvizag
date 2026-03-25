/* ================================================
   File: backend/middleware/userAuth.js
   ================================================ */
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "motopark_user_secret";

export const protect = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Not authorised" });

    try {
        const { id } = jwt.verify(auth.split(" ")[1], JWT_SECRET);
        req.user = await User.findById(id).select("-password -otp -otpExpiry");
        if (!req.user) return res.status(401).json({ message: "User not found" });
        next();
    } catch {
        res.status(401).json({ message: "Token invalid or expired" });
    }
};