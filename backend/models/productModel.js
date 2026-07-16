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
        colorName: { type: String, default: "" },
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
        // MRP / strike-through price. Optional — when higher than `price`,
        // the storefront renders it as the crossed-out original (sale display).
        originalPrice: {
            type: Number,
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
           FITMENT (Milestone 8)
           Bikes this product fits. References Bike documents so the future
           "Fits your bike" PDP feature can resolve make/model without
           duplicating fitment strings on every product.
        ========================= */
        compatibleBikes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Bike",
            },
        ],

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
        isShowcase: {
    type: Boolean,
    default: false,
},

        /* =========================
           AI SEMANTIC SEARCH
           Vector embedding of name+brand+category+specs+description.
           Populated by ai/search/backfill.js; queried via Atlas
           $vectorSearch (index: product_vector_index).
           `select: false` keeps this large array out of normal
           catalog reads unless explicitly requested.
        ========================= */
        embedding: {
            type: [Number],
            default: undefined,
            select: false,
        },
    },
    {
        timestamps: true, // adds createdAt + updatedAt automatically
    }
);

/* =========================
   INDEXES
   
   AUDIT vs original:
   
   REMOVED (redundant — already covered by compound indexes):
   ✗ { brand: 1, price: 1 }    → covered by { category: 1, brand: 1, price: 1 }
   ✗ { price: 1 }              → covered by { category: 1, brand: 1, price: 1 } prefix
   ✗ { createdAt: -1 }         → covered by every compound index that ends in createdAt
   ✗ { name: "text" }          → replaced by compound text index below

   NOT ADDED (suggested fix referenced a "status" field
   that does NOT exist in this schema — would be dead indexes):
   ✗ { category: 1, status: 1 }
   ✗ { createdAt: -1, status: 1 }

   ADDED:
   ✅ name + description compound text index
      → search now hits both fields in a single scan
      → replaces the single-field { name: "text" } index
      → MongoDB allows only ONE text index per collection,
        so this must replace the old one, not add to it

   KEPT (all valid, non-redundant):
   ✅ { category: 1, createdAt: -1 }    — category page, sorted by newest
   ✅ { featured: 1, createdAt: -1 }    — featured section
   ✅ { trending: 1, createdAt: -1 }    — trending section
   ✅ { newArrival: 1, createdAt: -1 }  — new arrivals section
   ✅ { category: 1, brand: 1, price: 1 } — filtered store queries
   ✅ { "variants.sizes.size": 1 }      — size filter
   ✅ { "variants.color": 1 }           — color filter
========================= */

// ── Flag sections — most-hit queries on Home page
productSchema.index({ category: 1,   createdAt: -1 });
productSchema.index({ featured: 1,   createdAt: -1 });
productSchema.index({ trending: 1,   createdAt: -1 });
productSchema.index({ newArrival: 1, createdAt: -1 });
productSchema.index({ isShowcase: 1, createdAt: -1 });
// ── Store page — category + brand filter + price sort in one scan
productSchema.index({ category: 1, brand: 1, price: 1 });

// ── Variant filters — used by Store/Category filter panel
productSchema.index({ "variants.sizes.size": 1 });
productSchema.index({ "variants.color": 1 });

// ── Fitment — "Fits your bike" / products-for-this-bike lookups (Milestone 8)
productSchema.index({ compatibleBikes: 1 });

// ── Full-text search — compound index covers name AND description
//    MongoDB only allows one text index per collection.
//    If you previously ran { name: "text" }, drop it first:
//    db.products.dropIndex("name_text")
productSchema.index({ name: "text", description: "text" });

/* =========================
   EXPORT
========================= */

export default mongoose.model("Product", productSchema);