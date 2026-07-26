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
import StoreConfig from "../models/storeConfigModel.js";

export const FREE_SHIP_THRESHOLD = 2000;
export const SHIPPING_FLAT = 150;

/** Delivery charge in rupees for a given cart subtotal (rupees). Reads dynamic Admin Settings. */
export const deliveryChargeFor = async (subtotal) => {
  try {
    const config = await StoreConfig.findOne().lean();
    const shipping = config?.settings?.shipping;
    if (shipping) {
      const flatRate = typeof shipping.flatRate === "number" ? shipping.flatRate : SHIPPING_FLAT;
      const freeThreshold = typeof shipping.freeThreshold === "number" ? shipping.freeThreshold : FREE_SHIP_THRESHOLD;
      const freeShippingEnabled = shipping.freeShippingEnabled !== false;

      if (freeShippingEnabled && subtotal >= freeThreshold) {
        return 0;
      }
      return flatRate;
    }
  } catch (err) {
    console.warn("Failed to read StoreConfig for shipping calculation, using default fallback:", err.message);
  }
  return subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FLAT;
};
