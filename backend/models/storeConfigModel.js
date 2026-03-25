import mongoose from "mongoose";

const filterSchema = new mongoose.Schema({
    key: String,          // "brand", "size", "price"
    label: String,        // "Brand", "Size"
    type: String,         // "checkbox", "range", "color"
    enabled: { type: Boolean, default: true },
});

const storeConfigSchema = new mongoose.Schema({
    filters: [filterSchema],

    navbar: [
        {
            label: String,
            link: String,
            type: { type: String, default: "link" }, // link / category / collection
            order: Number,
        },
    ],

    settings: {
        currency: { type: String, default: "INR" },
        showOutOfStock: { type: Boolean, default: false },
    },
});

export default mongoose.model("StoreConfig", storeConfigSchema);