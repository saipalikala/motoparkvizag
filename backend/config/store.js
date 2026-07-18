/**
 * config/store.js — commercial rules the SERVER owns.
 *
 * Delivery used to be whatever the client sent. Both /payment/create-order and
 * /orders trusted it, so a negative deliveryCharge shrank the amount to pay AND
 * the order total in step with each other — a tampered request stayed
 * self-consistent and passed every downstream check. The charge is therefore
 * derived here, from the cart subtotal the server itself computed.
 *
 * These values mirror motopark-v2/src/config/store.js and V1's checkout
 * (`cartTotal >= 2000 ? 0 : 150`); all three must agree or the amount shown at
 * checkout will not match the amount charged.
 */
export const FREE_SHIP_THRESHOLD = 2000;
export const SHIPPING_FLAT = 150;

/**
 * ⚠️ TEMPORARY — REVERT BEFORE THE motoparkvizag.in DOMAIN CUTOVER. ⚠️
 *
 * Waives delivery on every order so the V2 staging deploy can be exercised with
 * ₹1 test purchases instead of ₹151 ones. Left on, the live store ships for free
 * below ₹2,000 and eats ₹150 per order.
 *
 * Its twin is `shippingDisabled` in motopark-v2/src/config/store.js. BOTH must
 * flip together: the client shows this total and the server re-derives it, and
 * the payment is rejected when they disagree (`Paid amount does not match the
 * order total`). Reverting this commit flips both at once.
 */
export const SHIPPING_DISABLED = true;

/** Delivery charge in rupees for a given cart subtotal (rupees). */
export const deliveryChargeFor = (subtotal) =>
  SHIPPING_DISABLED || subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FLAT;
