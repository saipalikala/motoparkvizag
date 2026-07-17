/**
 * scripts/testPaymentGuards.js — negative tests for the checkout payment guards.
 *
 * Covers the two rejection paths in controllers/orderController.js that the live
 * ₹160 test could not exercise:
 *
 *   1. Bad signature      → 400  (isValidPaymentSignature rejects a forged sig)
 *   2. Replayed paymentId → 409  (one captured payment buys exactly one order)
 *
 * Test 2 is also the positive control for test 1: reaching the replay check at
 * all means a VALID signature passed the guard, so the two together prove the
 * guard discriminates rather than just rejecting everything.
 *
 * Neither test touches Razorpay's network. Both rejections happen before the
 * payments.fetch() call, and the signature is an HMAC computed with the same
 * local RAZORPAY_KEY_SECRET the controller uses — so the secret's real value is
 * irrelevant, only that both sides share it. No money can move from this script.
 *
 * Run: npm run test:guards
 */
import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";

import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { createOrder } from "../controllers/orderController.js";

/* ── Safety: dev and production share one Atlas cluster, and the only thing
      separating them is the database name. Refuse to touch anything else. ── */
const ALLOWED_DB = "motopark_dev";

const dbNameOf = (uri) => (uri.match(/@[^/?]+\/([^?]*)/) || [])[1] || "";

const assertSafeDatabase = () => {
    const uri = process.env.MONGO_URI || "";
    const db = dbNameOf(uri);

    if (db !== ALLOWED_DB) {
        console.error(
            `\nREFUSING TO RUN: MONGO_URI points at database "${db || "(unknown)"}", ` +
            `not "${ALLOWED_DB}".\nThis script writes and deletes order rows. ` +
            `Point .env at ${ALLOWED_DB} and try again.\n`
        );
        process.exit(1);
    }
};

/* ── Minimal Express res double: records status + body instead of writing. ── */
const mockRes = () => {
    const res = { statusCode: null, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
};

const signatureFor = (orderId, paymentId) =>
    crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

const shippingAddress = {
    name: "Guard Test", phone: "9999999999", email: "guard@test.local",
    address: "1 Test Road", city: "Vizag", state: "AP", pincode: "530001",
};

/* ── Assertions ── */
const results = [];
const check = (name, expected, res, expectMatch) => {
    const gotCode = res.statusCode;
    const gotMsg = res.body?.message ?? "";
    const ok = gotCode === expected && (!expectMatch || expectMatch.test(gotMsg));
    results.push(ok);
    console.log(
        `${ok ? "PASS" : "FAIL"}  ${name}\n` +
        `      expected ${expected}${expectMatch ? ` matching ${expectMatch}` : ""}\n` +
        `      got      ${gotCode} "${gotMsg}"\n`
    );
};

const run = async () => {
    assertSafeDatabase();
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`\nConnected to ${dbNameOf(process.env.MONGO_URI)}\n`);

    const product = await Product.findOne().lean();
    if (!product) {
        console.error(`No products in ${ALLOWED_DB}. Run: npm run db:seed`);
        await mongoose.disconnect();
        process.exit(1);
    }

    // Unique per run so a crashed run can never collide with the next one.
    const stamp = Date.now();
    const rzpOrderId = `order_guardtest_${stamp}`;
    const seededPaymentId = `pay_guardtest_seeded_${stamp}`;
    const createdOrderIds = [];

    try {
        const baseBody = {
            items: [{ product: String(product._id), quantity: 1 }],
            shippingAddress,
            paymentMethod: "razorpay",
        };

        /* ── Test 1: forged signature must be rejected ────────────────────── */
        const res1 = mockRes();
        await createOrder({
            body: {
                ...baseBody,
                razorpay_order_id: rzpOrderId,
                razorpay_payment_id: `pay_guardtest_badsig_${stamp}`,
                razorpay_signature: "0".repeat(64), // right length, wrong value
            },
        }, res1);
        check("bad signature is rejected", 400, res1, /verification failed/i);

        /* ── Test 2: a valid signature reaches the replay guard, which blocks
              a paymentId that already bought an order. Seed that prior order
              directly so no payment is ever needed. ─────────────────────── */
        const seeded = await Order.create({
            user: null,
            items: [{
                product: product._id, name: product.name,
                price: product.price, quantity: 1,
            }],
            shippingAddress,
            paymentMethod: "razorpay",
            paymentId: seededPaymentId,
            total: product.price,
        });
        createdOrderIds.push(seeded._id);

        const res2 = mockRes();
        await createOrder({
            body: {
                ...baseBody,
                razorpay_order_id: rzpOrderId,
                razorpay_payment_id: seededPaymentId,
                razorpay_signature: signatureFor(rzpOrderId, seededPaymentId), // valid
            },
        }, res2);
        check("replayed paymentId is rejected", 409, res2, /already been used/i);
    } finally {
        // Always clean up, even if an assertion threw.
        if (createdOrderIds.length) {
            await Order.deleteMany({ _id: { $in: createdOrderIds } });
        }
        // Belt and braces: nothing named guardtest should survive this script.
        await Order.deleteMany({ paymentId: /^pay_guardtest_/ });
        await mongoose.disconnect();
    }

    const passed = results.filter(Boolean).length;
    console.log(`${passed}/${results.length} passed\n`);
    process.exit(passed === results.length ? 0 : 1);
};

run().catch(async (err) => {
    console.error("\nTest run crashed:", err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
});
