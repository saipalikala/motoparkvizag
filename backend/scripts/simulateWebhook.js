/**
 * scripts/simulateWebhook.js — fire a correctly-signed payment.captured event at
 * our own webhook endpoint, without involving Razorpay or the banking network.
 *
 * WHY THIS EXISTS: Razorpay's live risk engine auto-fails repeated ₹1 payments
 * (micro-transaction velocity), so payment.captured never fires and the
 * browser-independent order path cannot be exercised end to end. Test mode would
 * dodge that, but this backend is shared with V1, which is live and taking real
 * customer payments — swapping the keys would break them. So we simulate the
 * event instead.
 *
 * WHAT THIS PROVES: that OUR handling is correct — signature verification, intent
 * lookup, amount check, stock decrement, order creation, idempotency.
 * WHAT IT DOES NOT PROVE: that Razorpay can reach us. That is already proven —
 * a real ₹1 UPI capture landed in `paymentevents` during the Phase 3 test.
 *
 * The signature is read from RAZORPAY_WEBHOOK_SECRET in the environment. It is
 * never printed and never passed on the command line, so it cannot leak into
 * shell history or logs.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   node scripts/simulateWebhook.js --order <razorpay_order_id> --amount <paise>
 *
 *   --order    Razorpay order id from a REAL abandoned checkout, so the
 *              PaymentIntent already exists. Get it either from the browser's
 *              network tab (the /payment/create-order response, or the
 *              /checkout/status/<id> poll URL), or from the newest `pending` row
 *              in the `paymentintents` collection.
 *   --amount   Amount in PAISE. Must equal what the intent recorded, i.e. the
 *              checkout total ×100 (₹1 → 100). A wrong value is not a broken
 *              script — the webhook is supposed to refuse it.
 *   --url      Target. Default http://localhost:5000/api/webhooks/razorpay
 *   --payment  Override the generated payment id (default pay_SIM<timestamp>).
 *   --yes      Required when --url is not localhost. See the warning below.
 *
 * ── Firing at production ───────────────────────────────────────────────────
 * This creates a REAL order row and decrements REAL stock, against a payment id
 * that does not exist at Razorpay. That is fine for a deliberate test, but the
 * order must be deleted afterwards or it will be picked, packed and shipped.
 * The generated payment id is prefixed pay_SIM so it is trivial to find.
 * The script prints the exact cleanup command when it finishes.
 */
import "dotenv/config";
import crypto from "crypto";

const argOf = (name, fallback = undefined) => {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const hasFlag = (name) => process.argv.includes(`--${name}`);

const die = (msg) => { console.error(`\n${msg}\n`); process.exit(1); };

const razorpayOrderId = argOf("order");
const amountPaise     = Number(argOf("amount"));
const url             = argOf("url", "http://localhost:5000/api/webhooks/razorpay");
const paymentId       = argOf("payment", `pay_SIM${Date.now()}`);

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!secret) {
    die(
        "RAZORPAY_WEBHOOK_SECRET is not set.\n" +
        "It must be the SAME value the target server verifies with (the webhook\n" +
        "secret from the Razorpay dashboard — NOT the API key secret).\n\n" +
        "  Local target : add it to backend/.env\n" +
        "  Railway target: run this with the value from Railway's variables, e.g.\n" +
        "     RAZORPAY_WEBHOOK_SECRET=... node scripts/simulateWebhook.js ...\n" +
        "   (prefix the command with a space in bash to keep it out of history)"
    );
}

if (!razorpayOrderId || !/^order_[A-Za-z0-9]+$/.test(razorpayOrderId)) {
    die("--order is required and must look like order_XXXXXXXXXXXXXX (from a real checkout).");
}
if (!Number.isInteger(amountPaise) || amountPaise < 1) {
    die("--amount is required, in PAISE, as a whole number (₹1 → 100).");
}

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url);
if (!isLocal && !hasFlag("yes")) {
    die(
        `REFUSING to fire at a non-local target without --yes:\n  ${url}\n\n` +
        "This will create a REAL order and decrement REAL stock against a payment\n" +
        "id that does not exist at Razorpay. Delete the order afterwards or it will\n" +
        "be treated as a genuine one and shipped.\n\n" +
        "Re-run with --yes if that is what you intend."
    );
}

/* The body is signed as raw bytes and sent as those same bytes. Signing a
   re-serialized copy would verify here and fail against a real delivery. */
const body = Buffer.from(JSON.stringify({
    event: "payment.captured",
    created_at: Math.floor(Date.now() / 1000),
    payload: {
        payment: {
            entity: {
                id:       paymentId,
                order_id: razorpayOrderId,
                amount:   amountPaise,
                currency: "INR",
                status:   "captured",
                method:   "upi",
                email:    "simulated@motoparkvizag.in",
                contact:  "+919999999999",
            },
        },
    },
}));

const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

console.log(`\nPOST ${url}`);
console.log(`  event      payment.captured`);
console.log(`  order      ${razorpayOrderId}`);
console.log(`  payment    ${paymentId}`);
console.log(`  amount     ${amountPaise} paise (₹${(amountPaise / 100).toFixed(2)})`);
console.log(`  signature  ${signature.slice(0, 12)}… (HMAC-SHA256 over ${body.length} raw bytes)\n`);

const res = await fetch(url, {
    method: "POST",
    headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": `evt_SIM${Date.now()}`,
    },
    body,
}).catch((err) => die(`Request failed: ${err.message}`));

const text = await res.text();
let json; try { json = JSON.parse(text); } catch { /* not JSON */ }

console.log(`← ${res.status} ${text}\n`);

/* Translate the handler's own vocabulary into what to do about it. */
const explain = () => {
    if (res.status === 400) return "Signature rejected — RAZORPAY_WEBHOOK_SECRET does not match the target server's.";
    if (res.status >= 500)  return "Server error — the event would be retried by Razorpay. Check the server logs.";
    // Order matters: a redelivery short-circuits on the consumed intent and
    // reports `duplicate`, not `alreadyExisted`. Checking `ordered` first would
    // claim an order was just placed when nothing happened at all.
    if (json?.duplicate) return "Already handled — this exact event was processed before. Nothing placed (idempotent redelivery).";
    if (json?.ordered === true && json?.alreadyExisted) return "Order already existed (the browser got there first). Idempotency worked.";
    if (json?.ordered === true) return "ORDER PLACED by the webhook alone. This is the behaviour under test.";
    if (json?.reason === "no-intent")       return "No PaymentIntent for that order id — was the checkout started on a build that records intents?";
    if (json?.reason === "amount-mismatch") return "Amount did not match the intent. Pass the checkout total ×100 in --amount.";
    if (json?.reason === "out-of-stock")    return "Intent found, but stock ran out — no order placed (correct).";
    return "Unrecognised response.";
};
console.log(`${explain()}\n`);

if (json?.orderId) {
    console.log("Verify, then CLEAN UP — this order is not backed by real money:");
    console.log(`  db.orders.deleteOne({ _id: ObjectId("${json.orderId}") })`);
    console.log(`  db.paymentevents.deleteOne({ paymentId: "${paymentId}" })`);
    console.log(`  db.paymentintents.updateOne({ razorpayOrderId: "${razorpayOrderId}" }, { $set: { status: "pending" }, $unset: { orderId: "" } })`);
    console.log("  …and restore the stock the order took, or re-enter it in the admin.\n");
}
