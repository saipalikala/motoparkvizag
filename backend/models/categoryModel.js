import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        slug: {
            type: String,
            required: true,
            unique: true
        },

        image: {
            type: String
        },

        coverImage: {
            type: String
        },

        description: {
            type: String
        },

        ctaText: {
            type: String,
            default: "Explore Collection >"
        },

        displayOrder: {
            type: Number,
            default: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Category", categorySchema);