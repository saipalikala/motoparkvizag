import Coupon from "../models/Coupon.js";

/**
 * Computes the 5-state status model for a coupon doc:
 * - "Active": active, not archived, schedule valid, limit not reached
 * - "Scheduled": active, not archived, start date in the future
 * - "Expired": active, not archived, expiry date has passed
 * - "Limit Reached": active, not archived, usageCount >= usageLimit
 * - "Disabled": inactive or archived
 */
export function computeCouponStatus(coupon, now = new Date()) {
  if (!coupon || !coupon.isActive || coupon.isArchived) {
    return "Disabled";
  }
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return "Scheduled";
  }
  if (coupon.expiryDate && new Date(coupon.expiryDate) <= now) {
    return "Expired";
  }
  if (
    typeof coupon.usageLimit === "number" &&
    coupon.usageLimit > 0 &&
    coupon.usageCount >= coupon.usageLimit
  ) {
    return "Limit Reached";
  }
  return "Active";
}

/**
 * Admin: GET /api/coupons
 * Returns non-archived coupons by default, or all if ?includeArchived=true
 */
export const getCoupons = async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === "true";
    const filter = includeArchived ? {} : { isArchived: { $ne: true } };

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).lean();
    const now = new Date();

    const formatted = coupons.map((c) => ({
      ...c,
      status: computeCouponStatus(c, now),
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ GET COUPONS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch coupons", error: err.message });
  }
};

/**
 * Admin: POST /api/coupons
 */
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchaseINR,
      maxDiscountINR,
      startDate,
      expiryDate,
      usageLimit,
      isActive,
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ code: "INVALID_CODE", message: "Coupon code is required" });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        code: "DUPLICATE_CODE",
        message: `Coupon code '${cleanCode}' already exists`,
      });
    }

    const numValue = Number(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      return res
        .status(400)
        .json({ code: "INVALID_DISCOUNT", message: "A valid positive discount value is required" });
    }

    if (discountType === "percentage" && numValue > 100) {
      return res
        .status(400)
        .json({ code: "INVALID_DISCOUNT", message: "Percentage discount cannot exceed 100%" });
    }

    const coupon = new Coupon({
      code: cleanCode,
      description: description?.trim() || "",
      discountType: discountType === "fixed" ? "fixed" : "percentage",
      discountValue: numValue,
      minPurchaseINR: Number(minPurchaseINR) || 0,
      maxDiscountINR:
        maxDiscountINR != null && String(maxDiscountINR).trim() !== ""
          ? Number(maxDiscountINR)
          : null,
      startDate: startDate ? new Date(startDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageLimit:
        usageLimit != null && String(usageLimit).trim() !== "" ? Number(usageLimit) : null,
      isActive: isActive !== false,
    });

    await coupon.save();
    res.status(201).json({
      ...coupon.toObject(),
      status: computeCouponStatus(coupon),
    });
  } catch (err) {
    console.error("❌ CREATE COUPON ERROR:", err);
    res.status(500).json({ message: "Failed to create coupon", error: err.message });
  }
};

/**
 * Admin: PUT /api/coupons/:id
 */
export const updateCoupon = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
      const existing = await Coupon.findOne({
        code: updateData.code,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({
          code: "DUPLICATE_CODE",
          message: `Coupon code '${updateData.code}' already exists`,
        });
      }
    }

    if (updateData.discountValue != null) {
      const v = Number(updateData.discountValue);
      if (isNaN(v) || v <= 0) {
        return res
          .status(400)
          .json({ code: "INVALID_DISCOUNT", message: "A valid positive discount value is required" });
      }
      updateData.discountValue = v;
    }

    if (updateData.minPurchaseINR != null) {
      updateData.minPurchaseINR = Number(updateData.minPurchaseINR) || 0;
    }

    if ("maxDiscountINR" in updateData) {
      updateData.maxDiscountINR =
        updateData.maxDiscountINR != null && String(updateData.maxDiscountINR).trim() !== ""
          ? Number(updateData.maxDiscountINR)
          : null;
    }

    if ("usageLimit" in updateData) {
      updateData.usageLimit =
        updateData.usageLimit != null && String(updateData.usageLimit).trim() !== ""
          ? Number(updateData.usageLimit)
          : null;
    }

    if ("startDate" in updateData) {
      updateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
    }

    if ("expiryDate" in updateData) {
      updateData.expiryDate = updateData.expiryDate ? new Date(updateData.expiryDate) : null;
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, lean: true });

    if (!coupon) {
      return res.status(404).json({ code: "NOT_FOUND", message: "Coupon not found" });
    }

    res.json({
      ...coupon,
      status: computeCouponStatus(coupon),
    });
  } catch (err) {
    console.error("❌ UPDATE COUPON ERROR:", err);
    res.status(500).json({ message: "Failed to update coupon", error: err.message });
  }
};

/**
 * Admin: DELETE /api/coupons/:id -> Soft delete (archive)
 */
export const archiveCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: { isArchived: true, isActive: false } },
      { new: true, lean: true }
    );
    if (!coupon) {
      return res.status(404).json({ code: "NOT_FOUND", message: "Coupon not found" });
    }
    res.json({ message: "Coupon archived successfully", id: req.params.id });
  } catch (err) {
    console.error("❌ ARCHIVE COUPON ERROR:", err);
    res.status(500).json({ message: "Failed to archive coupon", error: err.message });
  }
};

/**
 * Public: POST /api/coupons/validate
 * Validates a coupon against a cart subtotal and returns a structured validation response.
 *
 * Payload: { code: string, subtotalINR: number }
 */
export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotalINR } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        valid: false,
        code: "INVALID_CODE",
        message: "Please enter a coupon code",
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode, isArchived: false }).lean();

    if (!coupon) {
      return res.status(404).json({
        valid: false,
        code: "COUPON_NOT_FOUND",
        message: `Coupon '${cleanCode}' is invalid or does not exist`,
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        valid: false,
        code: "COUPON_DISABLED",
        message: `Coupon '${cleanCode}' is currently disabled`,
      });
    }

    const now = new Date();

    if (coupon.startDate && new Date(coupon.startDate) > now) {
      return res.status(400).json({
        valid: false,
        code: "NOT_STARTED_YET",
        message: `Coupon '${cleanCode}' is not active yet`,
      });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) <= now) {
      return res.status(400).json({
        valid: false,
        code: "COUPON_EXPIRED",
        message: `Coupon '${cleanCode}' has expired`,
      });
    }

    if (
      typeof coupon.usageLimit === "number" &&
      coupon.usageLimit > 0 &&
      coupon.usageCount >= coupon.usageLimit
    ) {
      return res.status(400).json({
        valid: false,
        code: "USAGE_LIMIT_REACHED",
        message: `Coupon '${cleanCode}' has reached its maximum redemption limit`,
      });
    }

    const subtotal = Number(subtotalINR) || 0;
    if (subtotal < coupon.minPurchaseINR) {
      return res.status(400).json({
        valid: false,
        code: "MIN_PURCHASE_NOT_MET",
        message: `Minimum order subtotal of ₹${coupon.minPurchaseINR.toLocaleString("en-IN")} required to use this coupon`,
        minPurchaseINR: coupon.minPurchaseINR,
      });
    }

    // Calculate discount amount
    let discountINR = 0;
    if (coupon.discountType === "percentage") {
      discountINR = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountINR != null && coupon.maxDiscountINR > 0) {
        discountINR = Math.min(discountINR, coupon.maxDiscountINR);
      }
    } else {
      discountINR = Math.min(coupon.discountValue, subtotal);
    }

    res.json({
      valid: true,
      code: "VALID",
      message: `Coupon '${cleanCode}' applied successfully!`,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountINR,
      },
    });
  } catch (err) {
    console.error("❌ VALIDATE COUPON ERROR:", err);
    res.status(500).json({ valid: false, code: "SERVER_ERROR", message: "Failed to validate coupon" });
  }
};

/**
 * Concurrency-Safe Atomic Redemption Helper
 * Atomically increments usageCount if usageLimit condition is satisfied.
 * Returns updated coupon doc or null if limit reached or inactive.
 */
export async function redeemCouponAtomic(code) {
  if (!code) return null;
  const cleanCode = String(code).trim().toUpperCase();

  // Atomically increment usageCount only if under usageLimit or limit is null
  const updated = await Coupon.findOneAndUpdate(
    {
      code: cleanCode,
      isActive: true,
      isArchived: false,
      $or: [
        { usageLimit: null },
        { usageLimit: { $exists: false } },
        { $expr: { $lt: ["$usageCount", "$usageLimit"] } },
      ],
    },
    { $inc: { usageCount: 1 } },
    { new: true }
  );

  return updated;
}
