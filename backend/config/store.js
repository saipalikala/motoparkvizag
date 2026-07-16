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

/** Delivery charge in rupees for a given cart subtotal (rupees). */
export const deliveryChargeFor = (subtotal) =>
  subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FLAT;
