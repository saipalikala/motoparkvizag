import express from "express";
import rateLimit from "express-rate-limit";
import {
  register, loginEmail, sendOtp, verifyOtp,
  getProfile, updateProfile, saveAddress, deleteAddress,
} from "../controllers/userController.js";
import { protect } from "../middleware/userAuth.js";

const router = express.Router();

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

/* Protected — no rate limit, normal user traffic */
router.get("/profile",                    protect, getProfile);
router.put("/profile",                    protect, updateProfile);
router.post("/addresses",                 protect, saveAddress);
router.delete("/addresses/:addressId",    protect, deleteAddress);

export default router;