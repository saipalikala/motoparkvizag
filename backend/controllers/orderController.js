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
        const { items, shippingAddress, paymentMethod, total } = req.body;

        // 0. Validate stock before saving
        for (const item of items) {
            const product = await Product.findOne({
                _id: item.product,
                "variants.color": item.selectedColor,
            });

            const variant = product?.variants?.find(v => v.color === item.selectedColor);
            const sizeEntry = variant?.sizes?.find(s => s.size === item.selectedSize);

            if (!sizeEntry || sizeEntry.stock < item.quantity) {
                return res.status(400).json({
                    message: `"${item.name}" (${item.selectedSize}) is out of stock.`
                });
            }
        }

        // 1. Save the order
        const order = await Order.create({ items, shippingAddress, paymentMethod, total });

        // 2. Decrement stock for each ordered item
        for (const item of items) {
            const result = await Product.updateOne(
                {
                    _id: item.product,
                    "variants.color": item.selectedColor,
                },
                {
                    $inc: { "variants.$[v].sizes.$[s].stock": -item.quantity }
                },
                {
                    arrayFilters: [
                        { "v.color": item.selectedColor },
                        { "s.size": item.selectedSize }
                    ]
                }
            );
            console.log("Stock decrement result:", result);
        }

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