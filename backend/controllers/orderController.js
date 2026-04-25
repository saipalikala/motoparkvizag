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
        const userId = req.user?._id;

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
                    message: `"${item.name}" (Size: ${item.selectedSize}) is out of stock or insufficient quantity.`,
                });
            }

            decremented.push(item);
        }

        // ── TASK 3: Calculate real total from DB ✅ ───────────────────────────
        let verifiedTotal = 0;
        for (const item of items) {
            const product = await Product.findById(item.product).select("price").lean();
            if (product) verifiedTotal += product.price * item.quantity;
        }

        // ── All stock decremented successfully — now save the order ──────────
        const order = await Order.create({
            user: userId || null,
            items,
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