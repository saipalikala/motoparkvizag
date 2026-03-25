/* ================================================
   File: backend/middleware/userAuth.js
   ================================================ */
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
    try {
        const auth = req.headers.authorization;

        if (!auth || !auth.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Not authorised, no token" });
        }

        const token = auth.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password -otp -otpExpiry");

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();

    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Session expired, please login again" });
        }
        return res.status(401).json({ message: "Not authorised, invalid token" });
    }
};