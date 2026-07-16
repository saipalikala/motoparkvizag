/**
 * features/admin/settings/settingsService.js — adminApi caller for store
 * configuration (Milestone 6b).
 *
 * Backend contract (backend/routes/storeConfigRoutes.js):
 *   GET /api/store-config              (public) → full config document
 *   PUT /api/store-config              (admin JWT) → updated config
 *     Body whitelist: { filters, navbar, settings }. The PUT REPLACES the whole
 *     `settings` object, so we always merge onto the current settings before
 *     sending — never send a partial `settings` or sibling keys get dropped.
 *
 * Shipping shape (added to StoreConfig.settings in M6):
 *   settings.shipping = { flatRate, freeThreshold, freeShippingEnabled }
 *   Amounts are whole rupees (live V1 convention). Backend is authoritative for
 *   applying these at checkout; this screen only edits the knobs.
 */
import { adminApi } from '../lib/adminApi.js';

export const SHIPPING_DEFAULTS = {
  flatRate: 100,
  freeThreshold: 2000,
  freeShippingEnabled: true,
};

/** Fetch the store config and return the normalized shipping settings + the raw
 *  settings object (needed so a save can merge without dropping sibling keys). */
export async function getShippingSettings() {
  const { data } = await adminApi.get('/store-config');
  const settings = data?.settings ?? {};
  const shipping = settings.shipping ?? {};
  return {
    settings,
    shipping: {
      flatRate: Number(shipping.flatRate ?? SHIPPING_DEFAULTS.flatRate),
      freeThreshold: Number(shipping.freeThreshold ?? SHIPPING_DEFAULTS.freeThreshold),
      freeShippingEnabled:
        shipping.freeShippingEnabled ?? SHIPPING_DEFAULTS.freeShippingEnabled,
    },
  };
}

/** Persist shipping settings, merging onto the current settings object so the
 *  whole-object PUT does not clobber currency / showOutOfStock. */
export async function saveShippingSettings(currentSettings, shipping) {
  const settings = { ...(currentSettings || {}), shipping };
  const { data } = await adminApi.put('/store-config', { settings });
  return data;
}
