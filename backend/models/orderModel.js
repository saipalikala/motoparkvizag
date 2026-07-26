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
        // Razorpay payment reference (set on paid checkout). Was previously
        // dropped by strict mode — now persisted so the admin can show it.
        paymentId:     { type: String, default: null },

        // Coupon snapshot — immutable historical record of applied promo code
        coupon: {
            code:          { type: String, default: null },
            discountType:  { type: String, default: null },
            discountValue: { type: Number, default: null },
            discountINR:   { type: Number, default: 0 },
        },

        total:         { type: Number, required: true },

        status: {
            type:    String,
            default: "pending",
            // Manual-fulfilment lifecycle (docs/06): pending → confirmed → packed
            // → dispatched → delivered (+ cancelled/returned). "shipped" is kept
            // as a legacy-safe value for pre-existing order rows.
            enum:    ["pending", "confirmed", "packed", "dispatched", "shipped", "delivered", "cancelled", "returned"],
        },

        /* Manual fulfilment — courier handoff details (docs/06 §2, §4).
           No courier API: the admin records these by hand after dispatch. */
        courierName:    { type: String, default: "" },
        trackingNumber: { type: String, default: "" },
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

   ✅ { paymentId: 1 } unique, partial
      — Replay guard. See the comment on the index
        itself: this is a correctness constraint, not
        a performance one.
========================= */

// User-facing: order history
orderSchema.index({ user: 1, createdAt: -1 });

// Guest lookup & order claiming by email
orderSchema.index({ "shippingAddress.email": 1, user: 1 });

// Guest lookup by phone
orderSchema.index({ "shippingAddress.phone": 1 });

// Admin dashboard: filter by status, sorted newest first
orderSchema.index({ status: 1, createdAt: -1 });

/* Replay guard: one captured Razorpay payment buys exactly one order.
   controllers/orderController.js checks for a reused paymentId before writing,
   but that check is check-then-act — a Razorpay round-trip and N stock writes
   sit between the read and the insert, so two concurrent requests carrying the
   same payment can both clear it. This index is what actually enforces the rule;
   the controller's check is only a fast path.

   PARTIAL, not sparse: paymentId defaults to null, and a sparse index still
   indexes explicit nulls — so every unpaid or legacy row would collide with the
   first one. Restricting the index to string values leaves those rows out of it. */
orderSchema.index(
    { paymentId: 1 },
    { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } }
);

export default mongoose.model("Order", orderSchema);