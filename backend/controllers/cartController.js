import Cart from "../models/cartModel.js";
import Wishlist from "../models/wishlistModel.js";

/* ── HELPERS ── */

// Merge two item arrays, summing quantities for duplicates
const mergeItems = (base, incoming) => {
    const merged = [...base];
    incoming.forEach(inc => {
        const idx = merged.findIndex(
            i => i.product.toString() === inc.product.toString()
                && i.selectedColor === inc.selectedColor
                && i.selectedSize === inc.selectedSize
        );
        if (idx !== -1) {
            merged[idx] = {
                ...merged[idx],
                quantity: merged[idx].quantity + inc.quantity
            };
        } else {
            merged.push(inc);
        }
    });
    return merged;
};

/* ══════════════════════════════
   CART
══════════════════════════════ */

// GET /api/cart
export const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).lean();
        res.json({ items: cart?.items || [] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/cart  — full replace (debounced sync from frontend)
export const syncCart = async (req, res) => {
    try {
        const { items } = req.body;
        const cart = await Cart.findOneAndUpdate(
            { user: req.user._id },
            { items },
            { new: true, upsert: true }
        );
        res.json({ items: cart.items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/cart/merge  — called on login, merges guest → user cart
export const mergeCart = async (req, res) => {
    try {
        const { guestItems } = req.body;
        if (!guestItems?.length) {
            const cart = await Cart.findOne({ user: req.user._id }).lean();
            return res.json({ items: cart?.items || [] });
        }

        const existing = await Cart.findOne({ user: req.user._id }).lean();
        const baseItems = existing?.items || [];
        const mergedItems = mergeItems(baseItems, guestItems);

        const cart = await Cart.findOneAndUpdate(
            { user: req.user._id },
            { items: mergedItems },
            { new: true, upsert: true }
        );
        res.json({ items: cart.items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/cart  — clear cart (after order placed)
export const clearCart = async (req, res) => {
    try {
        await Cart.findOneAndUpdate(
            { user: req.user._id },
            { items: [] }
        );
        res.json({ message: "Cart cleared" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ══════════════════════════════
   WISHLIST
══════════════════════════════ */

// GET /api/wishlist
export const getWishlist = async (req, res) => {
    try {
        const wl = await Wishlist.findOne({ user: req.user._id }).lean();
        res.json({ items: wl?.items || [] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/wishlist  — full replace
export const syncWishlist = async (req, res) => {
    try {
        const { items } = req.body;
        const wl = await Wishlist.findOneAndUpdate(
            { user: req.user._id },
            { items },
            { new: true, upsert: true }
        );
        res.json({ items: wl.items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/wishlist/merge
export const mergeWishlist = async (req, res) => {
    try {
        const { guestItems } = req.body;
        if (!guestItems?.length) {
            const wl = await Wishlist.findOne({ user: req.user._id }).lean();
            return res.json({ items: wl?.items || [] });
        }

        const existing = await Wishlist.findOne({ user: req.user._id }).lean();
        const baseItems = existing?.items || [];

        // Wishlist: no quantity, just deduplicate by product id
        const merged = [...baseItems];
        guestItems.forEach(gi => {
            const exists = merged.some(
                i => i.product.toString() === gi.product.toString()
            );
            if (!exists) merged.push(gi);
        });

        const wl = await Wishlist.findOneAndUpdate(
            { user: req.user._id },
            { items: merged },
            { new: true, upsert: true }
        );
        res.json({ items: wl.items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};