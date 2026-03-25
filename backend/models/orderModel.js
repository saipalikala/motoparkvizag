/* ================================================
   File: backend/models/orderModel.js
   ================================================ */
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: String,
    price: Number,
    quantity: Number,
    selectedColor: String,
    selectedSize: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
    /* Link to logged-in user — optional so guest checkout still works */
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },

    items: [orderItemSchema],

    shippingAddress: {
        name: String,
        phone: String,
        email: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
    },

    paymentMethod: { type: String, default: "cod" },
    total: { type: Number, required: true },

    status: {
        type: String,
        default: "pending",
        enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
    },
}, { timestamps: true });

/* Index for fast user-based queries */
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "shippingAddress.phone": 1 });

export default mongoose.model("Order", orderSchema);