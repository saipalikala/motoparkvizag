import mongoose from "mongoose";

const carouselSchema = new mongoose.Schema({
  title:    { type: String, default: "" },
  subtitle: { type: String, default: "" },
  image:    { type: String, default: "" },
  video:    { type: String, default: "" },
  poster:   { type: String, default: "" },
  route:    { type: String, default: "" },
  order:    { type: Number, default: 0 },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

// GET / query: active slides sorted by order
carouselSchema.index({ active: 1, order: 1 });

export default mongoose.model("Carousel", carouselSchema);