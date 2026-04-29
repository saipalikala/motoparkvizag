/* ================================================
   backend/models/videoShowcaseModel.js
   ================================================ */
import mongoose from "mongoose";

const slideSchema = new mongoose.Schema({
    id:          { type: Number },
    src:         { type: String, default: "" },
    poster:      { type: String, default: "" },
    tag:         { type: String, default: "" },
    lines:       [{ type: String }],
    sub:         { type: String, default: "" },
    accent:      { type: String, default: "#ffffff" },
    cta:         { type: String, default: "" },
    buyNowLink:  { type: String, default: "/products" },
    exploreLink: { type: String, default: "/store" },
}, { _id: false });

const videoShowcaseSchema = new mongoose.Schema({
    slides: [slideSchema],
}, { timestamps: true });

export default mongoose.model("VideoShowcaseConfig", videoShowcaseSchema);