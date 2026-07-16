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

        // Shipping is computed by the backend at checkout (docs/06 §6) and is
        // authoritative — the frontend never decides shipping. These are the
        // admin-tunable knobs. Amounts are in whole rupees (live V1 convention).
        shipping: {
            flatRate:            { type: Number,  default: 100 },   // ₹ per order
            freeThreshold:       { type: Number,  default: 2000 },  // free above this cart subtotal
            freeShippingEnabled: { type: Boolean, default: true },  // master switch for the free-above rule
        },
    },
});

export default mongoose.model("StoreConfig", storeConfigSchema);