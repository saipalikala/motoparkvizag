import mongoose from "mongoose";

/* =========================
   SIZE SCHEMA
========================= */

const sizeSchema = new mongoose.Schema(
    {
        size: {
            type: String,
            required: true,
        },

        stock: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

/* =========================
   COLOR VARIANT SCHEMA
========================= */

const variantSchema = new mongoose.Schema(
    {
        color: {
            type: String,
            required: true,
        },

        images: [String],

        sizes: [sizeSchema],
    },
    { _id: false }
);

/* =========================
   PRODUCT SCHEMA
========================= */

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: "",
        },
        specs: {
            type: String,
            default: "",
        },

        care: {
            type: String,
            default: "",
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },

        brand: {
            type: String,
            required: true,
            trim: true,
        },

category: {
    type: String,
    required: true,
    trim: true,
},

        variants: [variantSchema],

        /* =========================
           FLAGS
        ========================= */

        newArrival: {
            type: Boolean,
            default: false,
        },

        featured: {
            type: Boolean,
            default: false,
        },

        trending: {
            type: Boolean,
            default: false,
        },

        /* =========================
           TIMESTAMPS
        ========================= */

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true, // adds updatedAt automatically
    }
);

/* =========================
   INDEXES (OPTIMIZED)
========================= */

// Core query indexes
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ featured: 1, createdAt: -1 });
productSchema.index({ trending: 1, createdAt: -1 });
productSchema.index({ newArrival: 1, createdAt: -1 });

// Pricing & sorting
productSchema.index({ brand: 1, price: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Variant filters
productSchema.index({ "variants.sizes.size": 1 });
productSchema.index({ "variants.color": 1 });

// Combined filters
productSchema.index({ category: 1, brand: 1, price: 1 });

// Search
productSchema.index({ name: "text" });

/* =========================
   EXPORT
========================= */

export default mongoose.model("Product", productSchema);