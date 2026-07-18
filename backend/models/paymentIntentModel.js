import mongoose from "mongoose";

/**
 * models/paymentIntentModel.js — what the customer was buying, recorded BEFORE
 * they pay, so the order can be placed without their browser.
 *
 * WHY THIS EXISTS: order creation used to live entirely inside the Razorpay
 * checkout `handler` callback, so an order existed only if the customer's browser
 * survived the payment. For a cross-device UPI QR payment it usually does not:
 * the desktop modal polls Razorpay while the customer pays on their phone, the
 * backgrounded tab gets its timers throttled, the poll stalls, `handler` never
 * fires — and the money is captured with no order. That is not an edge case in
 * India, where UPI is the dominant method; it stranded a real ₹1 test payment
 * (pay_TEeychLH3cUzn5) during the V2 staging tests.
 *
 * The payment.captured webhook reaches the server out-of-band and does not care
 * what the browser did — but on its own it only knows a payment id and an amount,
 * which is not enough to build an order. This collection is the missing half:
 * the cart, variants, address and server-computed totals, keyed by the Razorpay
 * order id the webhook reports. Webhook + intent = an order, browser or no browser.
 *
 * PRICES ARE SNAPSHOTTED FROM THE DB, never taken from the request — the same
 * rule controllers/orderController.js follows. `amountPaise` is exactly what we
 * asked Razorpay to charge, so the webhook can confirm the captured amount
 * matches what was actually authorised before it places anything.
 */

/* Mirrors orderItemSchema in orderModel.js — the intent holds a ready-to-place
   order line, so placing it is a copy rather than a re-derivation. */
const intentItemSchema = new mongoose.Schema(
  {
    product:       { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name:          String,
    price:         Number,
    quantity:      Number,
    selectedColor: String,
    selectedSize:  String,
  },
  { _id: false }
);

const paymentIntentSchema = new mongoose.Schema(
  {
    /* Razorpay order id (order_...) — the join key. payment.captured reports it
       as entity.order_id, and it is the ONLY link between a captured payment and
       what the customer was buying. */
    razorpayOrderId: { type: String, required: true },

    /* Nullable: guest checkout is supported, exactly as on Order. */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    items: [intentItemSchema],

    shippingAddress: {
      name:    String,
      phone:   String,
      email:   String,
      address: String,
      city:    String,
      state:   String,
      pincode: String,
    },

    /* Rupees, server-computed via config/store.js — the same derivation /orders
       uses, so the two cannot disagree about what this order costs. */
    subtotal:       { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    total:          { type: Number, required: true },

    /* PAISE, and deliberately separate from `total`: this is the integer handed
       to Razorpay. The webhook compares entity.amount against this byte-for-byte,
       so it must be stored exactly as sent, not recomputed from rupees later. */
    amountPaise: { type: Number, required: true },

    /* pending → consumed, set when an order is successfully placed from this
       intent. Not a lock: the unique partial index on Order.paymentId is what
       actually prevents one payment buying two orders (see orderModel.js). This
       is a record of the outcome, and what the checkout status endpoint reads. */
    status:  { type: String, enum: ["pending", "consumed"], default: "pending" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true }
);

/* One intent per Razorpay order. The webhook looks up by this key, so a duplicate
   would make "which cart was this?" ambiguous — exactly the question the
   collection exists to answer. */
paymentIntentSchema.index({ razorpayOrderId: 1 }, { unique: true });

/* Most intents are abandoned — the customer reaches the Razorpay modal and closes
   it — and an unpaid intent has no value once the Razorpay order has expired.
   TTL reaps them 7 days after creation so this does not grow without bound.
   Consumed intents expire too: the Order is the durable record by then, and the
   checkout status endpoint only needs the intent for the minutes around payment.
   7 days is chosen to comfortably outlive Razorpay's own webhook retry schedule,
   so a late redelivery still finds its intent. */
paymentIntentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model("PaymentIntent", paymentIntentSchema);
