import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true
        },

        type: {
            type: String,
            default: "image"
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Media", mediaSchema);