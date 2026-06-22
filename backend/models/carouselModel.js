import mongoose from "mongoose";

const carouselSchema = new mongoose.Schema({
  title:         { type: String, default: "" },
  subtitle:      { type: String, default: "" },
  desktopImage:  { type: String, default: "" },
  mobileImage:   { type: String, default: "" },
  // Legacy field — kept for backward compat with existing DB documents.
  // API responses map image → desktopImage if desktopImage is absent.
  image:         { type: String, default: "" },
  route:         { type: String, default: "" },
  cta:           { type: String, default: "" },
  order:         { type: Number, default: 0 },
  active:        { type: Boolean, default: true },
  source:        { type: String, enum: ["premium", "vertical"], default: "premium" },
}, { timestamps: true });

// GET / query: active slides sorted by order, scoped by source
carouselSchema.index({ source: 1, active: 1, order: 1 });

export default mongoose.model("Carousel", carouselSchema);