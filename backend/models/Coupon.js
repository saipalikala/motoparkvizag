import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minPurchaseINR: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountINR: {
      type: Number,
      min: 0,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    usageLimit: {
      type: Number,
      min: 0,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },

    // Extensibility placeholders for future features
    perUserLimit: {
      type: Number,
      default: null,
    },
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    applicableCategories: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ isArchived: 1, isActive: 1, code: 1 });

export default mongoose.model("Coupon", couponSchema);
