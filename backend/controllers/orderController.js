import Order from "../models/orderModel.js";

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
        const order = await Order.create({ items, shippingAddress, paymentMethod, total });
        res.status(201).json(order);
    } catch (err) {
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