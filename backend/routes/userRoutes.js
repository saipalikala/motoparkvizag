/* ================================================
   File: backend/routes/userRoutes.js

   Add to server.js:
     import userRoutes from "./routes/userRoutes.js";
     app.use("/api/users", userRoutes);
   ================================================ */
import express from "express";
import {
  register, loginEmail, sendOtp, verifyOtp,
  getProfile, updateProfile, saveAddress, deleteAddress,
} from "../controllers/userController.js";
import { protect } from "../middleware/userAuth.js";

const router = express.Router();

/* Public */
router.post("/register", register);
router.post("/login/email", loginEmail);
router.post("/otp/send", sendOtp);
router.post("/otp/verify", verifyOtp);

/* Protected */
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/addresses", protect, saveAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);

export default router;