import express from "express";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  archiveCoupon,
  validateCoupon,
} from "../controllers/couponController.js";

const router = express.Router();

// Public validation endpoint (for customer checkout)
router.post("/validate", validateCoupon);

// Admin management endpoints
router.get("/", getCoupons);
router.post("/", createCoupon);
router.put("/:id", updateCoupon);
router.delete("/:id", archiveCoupon);

export default router;
