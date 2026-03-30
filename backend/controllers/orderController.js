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
// POST create order (customer checkout)
export const createOrder = async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod, paymentId, total } = req.body;
        const userId = req.user?._id;  // from userAuth middleware (may be guest if no auth)

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

        // ── TASK 2: Atomic stock decrement — check + decrement in one query ───
        // Attempt decrement first. If any item fails, rollback and reject.
        const decremented = [];

        for (const item of items) {
            const result = await Product.findOneAndUpdate(
                {
                    _id: item.product,
                    variants: {
                        $elemMatch: {
                            color: item.selectedColor,
                            sizes: {
                                $elemMatch: {
                                    size: item.selectedSize,
                                    stock: { $gte: item.quantity },  // atomic check + decrement
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
                    new: false,  // don't need the updated doc
                }
            );

            if (!result) {
                // This item failed — rollback all previously decremented items
                for (const done of decremented) {
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

            decremented.push(item);  // track for rollback if later item fails
        }

        // ── All stock decremented successfully — now save the order ──────────
        const order = await Order.create({
            user: userId || null,
            items,
            shippingAddress,
            paymentMethod,
            paymentId: paymentId || null,
            total,
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