import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";

/**
 * services/placeOrder.js — take the stock and write the order, idempotently.
 *
 * This is the checkout write path, lifted out of controllers/orderController.js
 * so the payment.captured webhook can place an order too. It deliberately does
 * NOT verify payment: each caller establishes that differently — the storefront
 * verifies a browser-supplied Razorpay callback (signature + a live payments.fetch),
 * the webhook receives an HMAC-signed event and checks the captured amount against
 * the recorded intent. By the time anything calls in here, the money is known to be
 * captured, and the only remaining question is whether the order can be written.
 *
 * ONE COPY ON PURPOSE. Stock decrement and the replay guard are the two places
 * where a divergence between callers means overselling or double-charging, so
 * they must not be duplicated.
 *
 * CONTRACT
 *   input   lines already priced and named FROM THE DB (never from a request
 *           body), and a total already derived server-side via config/store.js
 *   returns { order, alreadyExisted }
 *             alreadyExisted=true  → this payment had already bought an order;
 *                                    `order` is that existing one ({_id} only).
 *                                    Not an error: the customer has their order.
 *             alreadyExisted=false → `order` is the newly created document.
 *   throws  OutOfStockError  — stock ran out; stock rolled back, money NOT
 *                              refunded (see below)
 *           anything else    — the order write failed; stock rolled back
 */

/**
 * Stock ran out between payment and this write. The caller decides how to report
 * it — HTTP 400 to a waiting browser, a log line for the webhook — but in both
 * cases the money is already captured and needs a manual refund.
 */
export class OutOfStockError extends Error {
    constructor({ productName, selectedSize }) {
        super(`"${productName}" (Size: ${selectedSize}) is out of stock or insufficient quantity.`);
        this.name = "OutOfStockError";
        this.code = "OUT_OF_STOCK";
        this.productName = productName;
        this.selectedSize = selectedSize;
    }
}

/**
 * Give back the stock an in-flight checkout took, when that checkout then fails.
 * `taken` holds the items already decremented — items without a variant were
 * never decremented, so they are skipped here too.
 */
const restoreStock = async (taken) => {
    for (const done of taken) {
        if (!done.selectedSize || !done.selectedColor) continue;
        await Product.updateOne(
            { _id: done.product },
            { $inc: { "variants.$[v].sizes.$[s].stock": done.quantity } },
            {
                arrayFilters: [
                    { "v.color": done.selectedColor },
                    { "s.size":  done.selectedSize  },
                ],
            }
        );
    }
};

/**
 * @param {object}  args
 * @param {Array}   args.items          verified lines: { product, name, price, quantity, selectedColor, selectedSize }
 * @param {object}  args.shippingAddress
 * @param {string?} args.user           user id, or null for guest checkout
 * @param {number}  args.total          rupees, server-derived
 * @param {string}  args.paymentId      Razorpay payment id, already known captured
 * @param {string}  args.paymentMethod
 */
export const placeOrder = async ({ items, shippingAddress, user, total, paymentId, paymentMethod }) => {
    // Replay: one captured payment must buy exactly one order. Covers guests
    // and logged-in users alike, keyed on the payment rather than the account.
    //
    // This is a FAST PATH, not the guard — it is check-then-act, and N stock
    // writes sit between it and the insert. The unique partial index on paymentId
    // (models/orderModel.js) is what actually enforces the rule; see the
    // Order.create catch below. Keeping this check spares the common case (a
    // refresh, a double-tap, a webhook racing the browser) a pointless
    // decrement/rollback cycle.
    const alreadyUsed = await Order.findOne({ paymentId }).select("_id").lean();
    if (alreadyUsed) {
        return { order: alreadyUsed, alreadyExisted: true };
    }

    // ── Atomic stock decrement ────────────────────────────────────────────────
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
            await restoreStock(decremented);

            // The payment is already captured at this point, so bailing out
            // here leaves the customer charged with no order. Stock is rolled
            // back above, but the money is not — it needs a manual refund.
            console.error(
                "CRITICAL: payment captured but order NOT saved — manual refund required. " +
                `paymentId=${paymentId} amount=INR${total} ` +
                `reason=out_of_stock product="${item.name}" ` +
                `color=${item.selectedColor} size=${item.selectedSize} qty=${item.quantity}`
            );

            throw new OutOfStockError({ productName: item.name, selectedSize: item.selectedSize });
        }

        decremented.push(item);
    }

    // ── All stock decremented successfully — now save the order ──────────────
    try {
        const order = await Order.create({
            user: user || null,
            items,
            shippingAddress,
            paymentMethod,
            paymentId,            // verified as captured, for this amount
            total,                // ✅ from DB, not frontend
        });
        return { order, alreadyExisted: false };
    } catch (err) {
        // Stock is decremented and the money is captured, and neither undoes
        // itself. Give the stock back before deciding what to tell the caller.
        await restoreStock(decremented);

        // Lost the race for this payment: a concurrent request carrying the
        // same paymentId cleared the fast-path check above and inserted first.
        // The unique index rejected us, which is exactly its job — the customer
        // does have an order (the winner's), so this needs no refund.
        if (err?.code === 11000) {
            const winner = await Order.findOne({ paymentId }).select("_id").lean();
            return { order: winner, alreadyExisted: true };
        }

        // Any other write failure DOES strand the money: captured, no order.
        console.error(
            "CRITICAL: payment captured but order NOT saved — manual refund required. " +
            `paymentId=${paymentId} amount=INR${total} ` +
            `reason=order_write_failed detail=${err?.message}`
        );
        throw err;
    }
};
