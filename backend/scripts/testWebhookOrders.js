/**
 * scripts/testWebhookOrders.js — tests for webhook-authoritative order creation.
 *
 * The payment.captured webhook now places the order itself, from the
 * PaymentIntent recorded before payment. That is what makes checkout survive the
 * customer's browser: order creation used to live only in the Razorpay `handler`
 * callback, so a stalled modal after a cross-device UPI payment meant captured
 * money and no order (as happened to a real ₹1 test payment during V2 staging).
 *
 * Covered:
 *   1. Intent present        → order PLACED with no browser involved, stock taken
 *   2. Redelivery            → same order, no duplicate, stock NOT taken twice
 *   3. Browser won the race  → webhook reports the existing order, no double stock
 *   4. No intent (V1 shape)  → 200, no order (pre-existing behaviour preserved)
 *   5. Amount mismatch       → 200, NO order placed (refuses to trust the event)
 *   6. Out of stock          → 200 (retry cannot fix), no order, stock intact
 *   7. Bad signature         → 400, and nothing recorded
 *
 * Test 1 is the whole point of the feature. Test 5 matters because it is the one
 * case where placing an order would actively cause harm — shipping goods against
 * an amount we never authorised.
 *
 * Razorpay is never contacted. Webhook bodies are signed locally with the same
 * RAZORPAY_WEBHOOK_SECRET the verifier reads, so only that both sides share it
 * matters, not its real value. A disposable product is created and deleted per
 * run; no seed data is mutated and no money can move.
 *
 * Run: npm run test:webhook
 */
import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";

import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import PaymentEvent from "../models/paymentEventModel.js";
import PaymentIntent from "../models/paymentIntentModel.js";
import { placeOrder } from "../services/placeOrder.js";
import { handleRazorpayWebhook } from "../controllers/webhookController.js";
import { getCheckoutStatus } from "../controllers/checkoutStatusController.js";

/* ── Safety: dev and production share one Atlas cluster, and the only thing
      separating them is the database name. Refuse to touch anything else. ── */
const ALLOWED_DB = "motopark_dev";
const dbNameOf = (uri) => (uri.match(/@[^/?]+\/([^?]*)/) || [])[1] || "";

const assertSafeDatabase = () => {
    const db = dbNameOf(process.env.MONGO_URI || "");
    if (db !== ALLOWED_DB) {
        console.error(
            `\nREFUSING TO RUN: MONGO_URI points at database "${db || "(unknown)"}", ` +
            `not "${ALLOWED_DB}".\nThis script writes products, intents and orders. ` +
            `Point .env at ${ALLOWED_DB} and try again.\n`
        );
        process.exit(1);
    }
};

/* The webhook secret must be set for the signature to verify — it is a DIFFERENT
   value from RAZORPAY_KEY_SECRET. Fail loudly rather than reporting false FAILs. */
const assertWebhookSecret = () => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        console.error(
            "\nREFUSING TO RUN: RAZORPAY_WEBHOOK_SECRET is not set, so every signature " +
            "check would fail and every test would report a misleading FAIL.\n"
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

const mockRes = () => {
    const res = { statusCode: null, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
};

/* Build a signed payment.captured delivery. The raw Buffer is what gets signed
   AND what the handler receives — mirroring express.raw() in server.js. Signing a
   re-stringified body would pass here and fail on every real delivery. */
const deliver = async (entity, { signature } = {}) => {
    const raw = Buffer.from(JSON.stringify({
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: { payment: { entity } },
    }));
    const sig = signature ?? crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(raw).digest("hex");

    const req = { body: raw, headers: { "x-razorpay-signature": sig, "x-razorpay-event-id": `evt_TEST_${Date.now()}` } };
    const res = mockRes();
    await handleRazorpayWebhook(req, res);
    return res;
};

const RED = "#ff0000", BLUE = "#0000ff";
const ADDRESS = {
    name: "Webhook Rider", phone: "9999999999", email: "hook@example.com",
    address: "1 Test St", city: "Visakhapatnam", state: "Andhra Pradesh", pincode: "530016",
};

const stockOf = async (id, color, size) => {
    const p = await Product.findById(id).lean();
    return p.variants.find((v) => v.color === color).sizes.find((s) => s.size === size).stock;
};

const run = async () => {
    assertSafeDatabase();
    assertWebhookSecret();
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`\nConnected to ${ALLOWED_DB}\n`);

    const product = await Product.create({
        name: "TEST Webhook Jacket", price: 1000, brand: "TESTBRAND", category: "Riding Gear",
        variants: [
            { color: RED,  colorName: "Red",  images: [], sizes: [{ size: "M", stock: 10 }] },
            { color: BLUE, colorName: "Blue", images: [], sizes: [{ size: "L", stock: 1  }] },
        ],
    });

    const stamp = Date.now();
    const ids = [];
    /* One matched pair per scenario: a Razorpay order id and the payment against it.
       Shaped like the real thing — "order_" followed by alphanumerics only, no
       underscores. GET /api/checkout/status validates that shape, so ids with
       stray underscores would be rejected here while passing in production. */
    const pair = (n) => {
        const p = { orderId: `orderTEST${stamp}${n}`.replace(/^order/, "order_"),
                    paymentId: `payTEST${stamp}${n}`.replace(/^pay/, "pay_") };
        ids.push(p);
        return p;
    };

    const line = (color, size, quantity) => ({
        product: product._id, name: product.name, price: product.price, quantity,
        selectedColor: color, selectedSize: size,
    });

    const makeIntent = ({ orderId }, items, total) => PaymentIntent.create({
        razorpayOrderId: orderId, user: null, items, shippingAddress: ADDRESS,
        subtotal: total, deliveryCharge: 0, total, amountPaise: total * 100,
    });

    const entityFor = ({ orderId, paymentId }, amountPaise) => ({
        id: paymentId, order_id: orderId, amount: amountPaise, currency: "INR",
        status: "captured", email: ADDRESS.email, contact: ADDRESS.phone,
    });

    try {
        /* ── 1. The whole point: an order with no browser involved ────────── */
        {
            const p = pair(1);
            await makeIntent(p, [line(RED, "M", 2)], 2000);
            const before = await stockOf(product._id, RED, "M");
            const res = await deliver(entityFor(p, 200000));
            const after = await stockOf(product._id, RED, "M");
            const order = await Order.findOne({ paymentId: p.paymentId }).lean();
            const intent = await PaymentIntent.findOne({ razorpayOrderId: p.orderId }).lean();
            check("webhook alone places the order and takes the stock",
                res.statusCode === 200 && res.body?.ordered === true && !!order &&
                after === before - 2 && intent.status === "consumed" &&
                String(intent.orderId) === String(order._id) &&
                order.shippingAddress?.pincode === "530016" && order.total === 2000,
                `status ${res.statusCode} ${JSON.stringify(res.body)}; stock ${before} → ${after}; ` +
                `intent=${intent.status}; order total ₹${order?.total}`);
        }

        /* ── 2. Razorpay redelivers events; that must not duplicate ───────── */
        {
            const p = pair(2);
            await makeIntent(p, [line(RED, "M", 1)], 1000);
            await deliver(entityFor(p, 100000));
            const between = await stockOf(product._id, RED, "M");
            const res = await deliver(entityFor(p, 100000)); // same event again
            const after = await stockOf(product._id, RED, "M");
            const count = await Order.countDocuments({ paymentId: p.paymentId });
            check("redelivered event does not create a second order or retake stock",
                res.statusCode === 200 && count === 1 && after === between,
                `status ${res.statusCode} ${JSON.stringify(res.body)}; orders=${count}; stock ${between} → ${after}`);
        }

        /* ── 3. The healthy common case: the browser got there first ──────── */
        {
            const p = pair(3);
            const items = [line(RED, "M", 1)];
            await makeIntent(p, items, 1000);
            // Simulate the browser's POST /orders winning the race.
            await placeOrder({ items, shippingAddress: ADDRESS, user: null, total: 1000,
                               paymentId: p.paymentId, paymentMethod: "razorpay" });
            const between = await stockOf(product._id, RED, "M");
            const res = await deliver(entityFor(p, 100000));
            const after = await stockOf(product._id, RED, "M");
            const count = await Order.countDocuments({ paymentId: p.paymentId });
            check("browser winning the race leaves exactly one order and one decrement",
                res.statusCode === 200 && res.body?.alreadyExisted === true && count === 1 && after === between,
                `status ${res.statusCode} ${JSON.stringify(res.body)}; orders=${count}; stock ${between} → ${after}`);
        }

        /* ── 4. V1 checkouts write no intent — must stay as they were ─────── */
        {
            const p = pair(4);
            const res = await deliver(entityFor(p, 100000)); // no intent created
            const order = await Order.findOne({ paymentId: p.paymentId }).lean();
            const event = await PaymentEvent.findOne({ paymentId: p.paymentId }).lean();
            check("no intent: payment still recorded, no order placed (V1 unchanged)",
                res.statusCode === 200 && res.body?.ordered === false &&
                res.body?.reason === "no-intent" && !order && !!event,
                `status ${res.statusCode} ${JSON.stringify(res.body)}; order=${!!order}; recorded=${!!event}`);
        }

        /* ── 5. Captured amount ≠ what we authorised: refuse ──────────────── */
        {
            const p = pair(5);
            await makeIntent(p, [line(RED, "M", 1)], 1000); // expects 100000 paise
            const before = await stockOf(product._id, RED, "M");
            const res = await deliver(entityFor(p, 1)); // ₹0.01 captured instead
            const after = await stockOf(product._id, RED, "M");
            const order = await Order.findOne({ paymentId: p.paymentId }).lean();
            check("amount mismatch places NO order and takes no stock",
                res.statusCode === 200 && res.body?.ordered === false &&
                res.body?.reason === "amount-mismatch" && !order && after === before,
                `status ${res.statusCode} ${JSON.stringify(res.body)}; order=${!!order}; stock ${before} → ${after}`);
        }

        /* ── 6. Stock ran out between checkout and capture ────────────────── */
        {
            const p = pair(6);
            await makeIntent(p, [line(BLUE, "L", 99)], 99000); // only 1 in stock
            const before = await stockOf(product._id, BLUE, "L");
            const res = await deliver(entityFor(p, 9900000));
            const after = await stockOf(product._id, BLUE, "L");
            const order = await Order.findOne({ paymentId: p.paymentId }).lean();
            const event = await PaymentEvent.findOne({ paymentId: p.paymentId }).lean();
            check("out of stock acks (retry cannot fix), places no order, leaves stock intact",
                res.statusCode === 200 && res.body?.reason === "out-of-stock" &&
                !order && after === before && !!event,
                `status ${res.statusCode} ${JSON.stringify(res.body)}; stock ${before} → ${after}; recorded=${!!event}`);
        }

        /* ── 7. Forged signature: reject before anything is read ──────────── */
        {
            const p = pair(7);
            await makeIntent(p, [line(RED, "M", 1)], 1000);
            const before = await stockOf(product._id, RED, "M");
            const res = await deliver(entityFor(p, 100000), { signature: "deadbeef" });
            const after = await stockOf(product._id, RED, "M");
            const order = await Order.findOne({ paymentId: p.paymentId }).lean();
            const event = await PaymentEvent.findOne({ paymentId: p.paymentId }).lean();
            check("forged signature is rejected: no order, no record, no stock moved",
                res.statusCode === 400 && !order && !event && after === before,
                `status ${res.statusCode} ${JSON.stringify(res.body)}; order=${!!order}; recorded=${!!event}`);
        }
        /* ── 8-11. The status endpoint the storefront polls ───────────────── */
        {
            const status = async (razorpayOrderId) => {
                const res = mockRes();
                await getCheckoutStatus({ params: { razorpayOrderId } }, res);
                return res;
            };

            // Placed (test 1's intent was consumed by the webhook).
            const done = await status(ids[0].orderId);
            check("status reports 'placed' with the order id once the webhook has placed it",
                done.statusCode === null && done.body?.status === "placed" && !!done.body?.orderId,
                JSON.stringify(done.body));

            // Paid-but-refused (test 5, amount mismatch) still reads as pending —
            // the client must not be told to show success.
            const pending = await status(ids[4].orderId);
            check("status reports 'pending' for an intent that was never consumed",
                pending.body?.status === "pending" && !pending.body?.orderId,
                JSON.stringify(pending.body));

            // Unknown/expired id: 404, and identical for a fabricated one.
            const unknown = await status("order_TESTdoesnotexist");
            check("status reports 404 'unknown' for an id with no intent",
                unknown.statusCode === 404 && unknown.body?.status === "unknown",
                `status ${unknown.statusCode} ${JSON.stringify(unknown.body)}`);

            // Junk must be rejected without a DB query.
            const junk = await status("../../etc/passwd");
            check("status rejects a malformed order reference",
                junk.statusCode === 400,
                `status ${junk.statusCode} ${JSON.stringify(junk.body)}`);

            // Nothing beyond {status, orderId} may leak — this endpoint is
            // unauthenticated and the id travels through the browser.
            const keys = Object.keys(done.body || {}).sort().join(",");
            check("status response leaks no customer data",
                keys === "orderId,status",
                `keys: ${keys}`);
        }
    } finally {
        const paymentIds = ids.map((i) => i.paymentId);
        const orderIds = ids.map((i) => i.orderId);
        await Order.deleteMany({ paymentId: { $in: paymentIds } });
        await PaymentEvent.deleteMany({ paymentId: { $in: paymentIds } });
        await PaymentIntent.deleteMany({ razorpayOrderId: { $in: orderIds } });
        await Product.deleteOne({ _id: product._id });
        console.log("\ncleaned up test product, intents, events and orders");
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
