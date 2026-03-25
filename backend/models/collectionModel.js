import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
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

        products: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            }
        ]
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Collection", collectionSchema);