/**
 * scripts/testPlaceOrder.js — tests for the shared order-placing service.
 *
 * services/placeOrder.js was extracted from controllers/orderController.js so the
 * payment.captured webhook can place orders without the customer's browser. It
 * owns the two things that must never diverge between callers: the atomic stock
 * decrement (with rollback) and the one-payment-one-order replay guard. Those
 * were previously reachable only through an HTTP request carrying a live Razorpay
 * payment, so they were never directly tested — this script tests them straight.
 *
 * Covered:
 *   1. Happy path            → order written, stock down by exactly the quantity
 *   2. Replay (same payment) → alreadyExisted, and stock NOT taken a second time
 *   3. Insufficient stock    → OutOfStockError, stock untouched
 *   4. PARTIAL ROLLBACK      → line 2 fails, and line 1's stock is given BACK
 *   5. No-variant line       → order written, no stock write attempted
 *
 * Test 4 is the one that matters most: it is the only case where a bug silently
 * destroys inventory rather than throwing, and it cannot happen in a single-line
 * order — which is what every manual test purchase has been.
 *
 * Razorpay is never contacted: placeOrder deals only in money already known to be
 * captured, so no network and no funds are involved. A disposable product is
 * created and deleted per run; no seed data is mutated.
 *
 * Run: npm run test:placeorder
 */
import "dotenv/config";
import mongoose from "mongoose";

import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { placeOrder, OutOfStockError } from "../services/placeOrder.js";

/* ── Safety: dev and production share one Atlas cluster, and the only thing
      separating them is the database name. Refuse to touch anything else. ── */
const ALLOWED_DB = "motopark_dev";
const dbNameOf = (uri) => (uri.match(/@[^/?]+\/([^?]*)/) || [])[1] || "";

const assertSafeDatabase = () => {
    const db = dbNameOf(process.env.MONGO_URI || "");
    if (db !== ALLOWED_DB) {
        console.error(
            `\nREFUSING TO RUN: MONGO_URI points at database "${db || "(unknown)"}", ` +
            `not "${ALLOWED_DB}".\nThis script writes products and orders. ` +
            `Point .env at ${ALLOWED_DB} and try again.\n`
        );
        process.exit(1);
    }
};

let passed = 0, failed = 0;
const check = (name, ok, detail) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (detail) console.log(`      ${detail}`);
    ok ? passed++ : failed++;
};

/* Stock for a given colour+size, read fresh from the DB. */
const stockOf = async (id, color, size) => {
    const p = await Product.findById(id).lean();
    return p.variants.find((v) => v.color === color).sizes.find((s) => s.size === size).stock;
};

const RED = "#ff0000", BLUE = "#0000ff";

const makeProduct = () =>
    Product.create({
        name: "TEST Placeholder Jacket", price: 1000, brand: "TESTBRAND", category: "Riding Gear",
        variants: [
            { color: RED,  colorName: "Red",  images: [], sizes: [{ size: "M", stock: 5 }] },
            { color: BLUE, colorName: "Blue", images: [], sizes: [{ size: "L", stock: 1 }] },
        ],
    });

const line = (product, color, size, quantity) => ({
    product: product._id, name: product.name, price: product.price, quantity,
    selectedColor: color, selectedSize: size,
});

const ADDRESS = { name: "Test", phone: "9999999999", city: "Visakhapatnam", pincode: "530016" };

const place = (items, paymentId, total) =>
    placeOrder({ items, shippingAddress: ADDRESS, user: null, total, paymentId, paymentMethod: "razorpay" });

const run = async () => {
    assertSafeDatabase();
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`\nConnected to ${ALLOWED_DB}\n`);

    const product = await makeProduct();
    const paymentIds = [];
    const pid = (n) => { const p = `pay_TEST_${Date.now()}_${n}`; paymentIds.push(p); return p; };

    try {
        /* ── 1. Happy path ───────────────────────────────────────────────── */
        {
            const before = await stockOf(product._id, RED, "M");
            const { order, alreadyExisted } = await place([line(product, RED, "M", 2)], pid(1), 2000);
            const after = await stockOf(product._id, RED, "M");
            check("happy path writes the order and takes the stock",
                !alreadyExisted && !!order?._id && after === before - 2,
                `stock ${before} → ${after} (expected ${before - 2}); order ${order?._id}`);
        }

        /* ── 2. Replay: the same captured payment must buy only one order ── */
        {
            const paymentId = pid(2);
            const first = await place([line(product, RED, "M", 1)], paymentId, 1000);
            const between = await stockOf(product._id, RED, "M");
            const second = await place([line(product, RED, "M", 1)], paymentId, 1000);
            const after = await stockOf(product._id, RED, "M");
            check("replayed payment returns the existing order and does NOT retake stock",
                !first.alreadyExisted && second.alreadyExisted &&
                String(second.order._id) === String(first.order._id) && after === between,
                `alreadyExisted=${second.alreadyExisted}, same order=${String(second.order._id) === String(first.order._id)}, stock ${between} → ${after}`);
        }

        /* ── 3. Insufficient stock ───────────────────────────────────────── */
        {
            const before = await stockOf(product._id, BLUE, "L"); // 1 in stock
            let thrown = null;
            try {
                await place([line(product, BLUE, "L", 99)], pid(3), 99000);
            } catch (err) { thrown = err; }
            const after = await stockOf(product._id, BLUE, "L");
            const orphan = await Order.findOne({ paymentId: paymentIds.at(-1) }).lean();
            check("insufficient stock throws OutOfStockError, writes no order, leaves stock alone",
                thrown instanceof OutOfStockError && after === before && !orphan,
                `threw ${thrown?.name}, stock ${before} → ${after}, order written=${!!orphan}`);
        }

        /* ── 4. PARTIAL ROLLBACK — the case single-line tests cannot reach ── */
        {
            const redBefore  = await stockOf(product._id, RED,  "M");
            const blueBefore = await stockOf(product._id, BLUE, "L"); // 1 in stock
            let thrown = null;
            try {
                // Line 1 succeeds and decrements; line 2 cannot be satisfied.
                await place(
                    [line(product, RED, "M", 1), line(product, BLUE, "L", 99)],
                    pid(4), 100000
                );
            } catch (err) { thrown = err; }
            const redAfter  = await stockOf(product._id, RED,  "M");
            const blueAfter = await stockOf(product._id, BLUE, "L");
            check("a failed line rolls back the stock already taken by earlier lines",
                thrown instanceof OutOfStockError && redAfter === redBefore && blueAfter === blueBefore,
                `threw ${thrown?.name}; RED/M ${redBefore} → ${redAfter} (must be unchanged); BLUE/L ${blueBefore} → ${blueAfter}`);
        }

        /* ── 5. Line with no variant — no stock record exists to decrement ── */
        {
            const before = await stockOf(product._id, RED, "M");
            const item = { product: product._id, name: product.name, price: product.price, quantity: 1 };
            const { order, alreadyExisted } = await place([item], pid(5), 1000);
            const after = await stockOf(product._id, RED, "M");
            check("no-variant line places the order without touching stock",
                !alreadyExisted && !!order?._id && after === before,
                `stock ${before} → ${after}; order ${order?._id}`);
        }
    } finally {
        await Order.deleteMany({ paymentId: { $in: paymentIds } });
        await Product.deleteOne({ _id: product._id });
        console.log("\ncleaned up test product and orders");
    }

    console.log(`\n${passed}/${passed + failed} passed\n`);
    await mongoose.disconnect();
    process.exit(failed ? 1 : 0);
};

run().catch(async (err) => {
    console.error("\nTest run crashed:", err);
    await mongoose.disconnect();
    process.exit(1);
});
