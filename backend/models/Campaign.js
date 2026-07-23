import mongoose from "mongoose";

/**
 * Campaign Schema — MotoPark V2 Campaign Experience System.
 * Supports placement target, schedule window, soft-delete, and audit tracking.
 */
const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "general",
        "season_sale",
        "new_collection",
        "product_launch",
        "flash_sale",
        "festival_offer",
        "store_anniversary",
        "offline_event",
        "workshop",
        "community_ride",
      ],
      default: "general",
    },
    placement: {
      type: String,
      enum: [
        "floating_card",
        "offer_bar",
        "story_band",
        "homepage_hero",
        "checkout",
        "product_page",
      ],
      default: "floating_card",
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
      min: [0, "Priority cannot be negative"],
      max: [1000, "Priority max threshold is 1000"],
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    displayDelayMs: {
      type: Number,
      default: 1500,
    },
    dismissBehaviour: {
      type: String,
      enum: ["session", "daily", "campaign", "always"],
      default: "session",
    },
    displayOnce: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      required: [true, "Campaign headline title is required"],
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
    },
    desktopImage: {
      type: String,
      default: "",
    },
    mobileImage: {
      type: String,
      default: "",
    },
    badgeText: {
      type: String,
      default: "",
      trim: true,
    },
    couponCode: {
      type: String,
      default: "",
      trim: true,
    },
    ctaLabel: {
      type: String,
      default: "Shop Now",
      trim: true,
    },
    ctaUrl: {
      type: String,
      default: "/store",
      trim: true,
    },
    bgColor: {
      type: String,
      default: "",
    },
    presentationType: {
      type: String,
      default: "floating_card",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      default: "admin",
    },
    updatedBy: {
      type: String,
      default: "admin",
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index for Storefront Active Campaign Selection
campaignSchema.index({ isDeleted: 1, enabled: 1, priority: -1 });

// Index for Date Window Queries
campaignSchema.index({ startDate: 1, endDate: 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
