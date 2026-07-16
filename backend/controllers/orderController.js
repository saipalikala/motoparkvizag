import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";

// GET all orders (admin)
export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ orders });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST create order (customer checkout)
export const createOrder = async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod, paymentId, deliveryCharge = 0 } = req.body; // ✅ removed total
        // optionalAuth (routes/orderRoutes.js) sets req.userId — NOT req.user.
        // Reading req.user?._id here silently yielded undefined for every
        // request, so orders never linked to accounts and the idempotency
        // guard below never ran.
        const userId = req.userId;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Order must contain at least one item." });
        }

        // ── Validate client line data before any write ────────────────────────
        // Quantity is client-supplied: a negative value would pass the
        // `stock: { $gte: quantity }` guard and then $inc stock UPWARDS while
        // producing a negative total. Require a positive integer.
        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item?.product)) {
                return res.status(400).json({ message: "Invalid product reference in order." });
            }
            if (!Number.isInteger(item?.quantity) || item.quantity < 1) {
                return res.status(400).json({ message: "Invalid quantity — must be a whole number of at least 1." });
            }
        }

        // Resolve every referenced product ONCE, up front. Name and price are
        // taken from these docs, never from the request body.
        const productDocs = await Product.find({ _id: { $in: items.map(i => i.product) } })
            .select("name price")
            .lean();
        const productById = new Map(productDocs.map(p => [p._id.toString(), p]));

        const missing = items.find(i => !productById.has(i.product.toString()));
        if (missing) {
            return res.status(400).json({ message: `Product not found: ${missing.product}` });
        }

        // ── TASK 1: Idempotency — block duplicate within 60s ──────────────────
        if (userId) {
            const sixtySecsAgo = new Date(Date.now() - 60_000);
            const recent = await Order.findOne({
                user: userId,
                createdAt: { $gte: sixtySecsAgo },
            }).select("_id").lean();

            if (recent) {
                return res.status(409).json({
                    message: "A recent order already exists.",
                    orderId: recent._id,
                });
            }
        }

        // ── TASK 2: Atomic stock decrement ────────────────────────────────────
        const decremented = [];

        for (const item of items) {

            // ✅ Skip stock check if product has no size/color variants
            if (!item.selectedSize || !item.selectedColor) {
                decremented.push(item);
                continue;
            }

            const result = await Product.findOneAndUpdate(
                {
                    _id: item.product,
                    variants: {
                        $elemMatch: {
                            color: item.selectedColor,
                            sizes: {
                                $elemMatch: {
                                    size: item.selectedSize,
                                    stock: { $gte: item.quantity },
                                },
                            },
                        },
                    },
                },
                {
                    $inc: { "variants.$[v].sizes.$[s].stock": -item.quantity },
                },
                {
                    arrayFilters: [
                        { "v.color": item.selectedColor },
                        { "s.size": item.selectedSize },
                    ],
                    new: false,
                }
            );

            if (!result) {
                // Rollback only items that had variants
                for (const done of decremented) {
                    if (!done.selectedSize || !done.selectedColor) continue;
                    await Product.updateOne(
                        { _id: done.product },
                        {
                            $inc: { "variants.$[v].sizes.$[s].stock": done.quantity },
                        },
                        {
                            arrayFilters: [
                                { "v.color": done.selectedColor },
                                { "s.size": done.selectedSize },
                            ],
                        }
                    );
                }

                return res.status(400).json({
                    message: `"${productById.get(item.product.toString()).name}" (Size: ${item.selectedSize}) is out of stock or insufficient quantity.`,
                });
            }

            decremented.push(item);
        }

        // ── TASK 3: Build the line items and total from the DB ✅ ─────────────
        // Name and price come from the product doc; only quantity and the
        // chosen variant come from the request. Storing the client's price
        // verbatim let a tampered request write a bogus line price (the total
        // stayed correct, but the admin derives subtotal/shipping from these
        // lines, so the order detail and packing slip showed nonsense).
        const verifiedItems = items.map(item => {
            const product = productById.get(item.product.toString());
            return {
                product:       product._id,
                name:          product.name,
                price:         product.price,
                quantity:      item.quantity,
                selectedColor: item.selectedColor,
                selectedSize:  item.selectedSize,
            };
        });

        const verifiedTotal = verifiedItems.reduce(
            (sum, i) => sum + i.price * i.quantity,
            0
        );

        // ── All stock decremented successfully — now save the order ──────────
        const order = await Order.create({
            user: userId || null,
            items: verifiedItems,
            shippingAddress,
            paymentMethod,
            paymentId: paymentId || null,
            total: verifiedTotal + deliveryCharge, // ✅ from DB, not frontend
        });

        res.status(201).json(order);

    } catch (err) {
        console.error("createOrder error:", err);
        res.status(400).json({ message: err.message });
    }
};

// PUT update order status (admin)
export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};