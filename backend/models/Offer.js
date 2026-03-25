import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;