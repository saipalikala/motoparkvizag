import express from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import {
  register, loginEmail, sendOtp, verifyOtp, googleAuth,
  getProfile, updateProfile, saveAddress, deleteAddress,
} from "../controllers/userController.js";
import { protect } from "../middleware/userAuth.js";
import authMiddleware from "../middleware/authMiddleware.js"; // admin-role JWT
import User from "../models/userModel.js";

const router = express.Router();

/* Fields safe to expose to the admin customer panel — NEVER password/otp. */
const ADMIN_USER_FIELDS = "name email phone isVerified savedAddresses defaultAddress createdAt updatedAt";
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again later." },
});

/* Public — rate limited */
router.post("/register",     authLimiter, register);
router.post("/login/email",  authLimiter, loginEmail);
router.post("/otp/send",     authLimiter, sendOtp);
router.post("/otp/verify",   authLimiter, verifyOtp);
router.post("/auth/google",  authLimiter, googleAuth);

/* Protected — no rate limit, normal user traffic */
router.get("/profile",                    protect, getProfile);
router.put("/profile",                    protect, updateProfile);
router.post("/addresses",                 protect, saveAddress);
router.delete("/addresses/:addressId",    protect, deleteAddress);

/* ── ADMIN: list customers ──
   Declared AFTER the literal routes above so "/profile" is not shadowed by "/:id". */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const pageNum  = Math.max(Number(req.query.page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search   = (req.query.search || "").trim();

    const filter = {};
    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { name:  { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(ADMIN_USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── ADMIN: single customer ── */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findById(req.params.id).select(ADMIN_USER_FIELDS).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;