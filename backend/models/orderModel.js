/* ================================================
   File: backend/models/orderModel.js
   ================================================ */
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        product:       { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name:          String,
        price:         Number,
        quantity:      Number,
        selectedColor: String,
        selectedSize:  String,
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        /* Link to logged-in user — optional so guest checkout still works */
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        items: [orderItemSchema],

        shippingAddress: {
            name:    String,
            phone:   String,
            email:   String,
            address: String,
            city:    String,
            state:   String,
            pincode: String,
        },

        paymentMethod: { type: String, default: "cod" },
        total:         { type: Number, required: true },

        status: {
            type:    String,
            default: "pending",
            enum:    ["pending", "confirmed", "shipped", "delivered", "cancelled"],
        },
    },
    { timestamps: true }
);

/* =========================
   INDEXES

   KEPT:
   ✅ { user: 1, createdAt: -1 }
      — User's order history page. Filters by user,
        returns newest first. Without this: full
        collection scan on every /orders page load.

   ✅ { "shippingAddress.phone": 1 }
      — Guest order lookup by phone number.

   ADDED:
   ✅ { status: 1, createdAt: -1 }
      — Admin orders dashboard. Filters by status
        (e.g. "pending", "shipped") sorted by newest.
        Without this: full scan across ALL orders on
        every admin dashboard load — gets expensive
        fast as order volume grows.
========================= */

// User-facing: order history
orderSchema.index({ user: 1, createdAt: -1 });

// Guest lookup by phone
orderSchema.index({ "shippingAddress.phone": 1 });

// Admin dashboard: filter by status, sorted newest first
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);