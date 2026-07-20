/**
 * features/admin/campaigns/campaignService.js
 *
 * Admin Campaign Experience System — CRUD service.
 *
 * Backend contract (to be implemented):
 *   GET    /api/campaigns           → array of all campaigns
 *   POST   /api/campaigns           → create campaign
 *   PUT    /api/campaigns/:id       → update campaign
 *   DELETE /api/campaigns/:id       → delete campaign
 *   PATCH  /api/campaigns/:id/toggle → toggle enabled
 *
 * Images: uses the existing POST /api/upload/media endpoint (same as products,
 * showcase). Returns { url } — a Cloudinary URL.
 */
import { adminApi } from '../lib/adminApi.js';

/** Campaign types — kept in sync with the storefront type definition. */
export const CAMPAIGN_TYPES = [
  { value: 'general',          label: 'General Announcement' },
  { value: 'season_sale',      label: 'Season Sale' },
  { value: 'new_collection',   label: 'New Collection' },
  { value: 'product_launch',   label: 'Product Launch' },
  { value: 'flash_sale',       label: 'Flash Sale' },
  { value: 'festival_offer',   label: 'Festival Offer' },
  { value: 'store_anniversary',label: 'Store Anniversary' },
  { value: 'offline_event',    label: 'Offline Event' },
  { value: 'workshop',         label: 'Workshop' },
  { value: 'community_ride',   label: 'Community Ride' },
];

/** Dismiss behaviour options. */
export const DISMISS_BEHAVIOURS = [
  { value: 'session',  label: 'Session (resets on browser/tab close)' },
  { value: 'daily',    label: 'Daily (once per day per user)' },
  { value: 'campaign', label: 'Until Campaign Changes (localStorage)' },
  { value: 'always',   label: 'Always (show every visit)' },
];

/** Presentation types — extensible registry. */
export const PRESENTATION_TYPES = [
  { value: 'floating_card', label: 'Floating Card (bottom-right / mobile sheet)' },
  // { value: 'strip',         label: 'Announcement Strip' },  // future
];

/** Image upload limit — mirrors backend. */
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export function validateImage(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) return 'Image must be JPG, PNG, or WebP.';
  if (file.size > IMAGE_MAX_BYTES) return 'Image exceeds 20 MB.';
  return null;
}

/** Upload a campaign image → Cloudinary URL string. */
export async function uploadCampaignImage(file) {
  const fd = new FormData();
  fd.append('media', file);
  const { data } = await adminApi.post('/upload/media', fd, { timeout: 0 });
  if (!data?.url) throw { code: 0, message: 'Upload returned no URL.' };
  return data.url;
}

// ── CRUD ──────────────────────────────────────────────────────────────────

/** Fetch all campaigns (admin view — includes disabled/expired). */
export async function listCampaigns() {
  const { data } = await adminApi.get('/campaigns');
  return Array.isArray(data) ? data : [];
}

/** Create a new campaign. */
export async function createCampaign(payload) {
  const { data } = await adminApi.post('/campaigns', payload);
  return data;
}

/** Update an existing campaign by id. */
export async function updateCampaign(id, payload) {
  const { data } = await adminApi.put(`/campaigns/${id}`, payload);
  return data;
}

/** Delete a campaign by id. */
export async function deleteCampaign(id) {
  const { data } = await adminApi.delete(`/campaigns/${id}`);
  return data;
}

/** Toggle enabled/disabled. */
export async function toggleCampaign(id, enabled) {
  const { data } = await adminApi.patch(`/campaigns/${id}/toggle`, { enabled });
  return data;
}

/** Blank campaign for the "create" form. */
export function blankCampaign() {
  return {
    name:             '',
    type:             'general',
    enabled:          false,
    priority:         0,
    startDate:        '',
    endDate:          '',
    displayDelayMs:   1500,
    dismissBehaviour: 'session',
    displayOnce:      true,
    presentationType: 'floating_card',

    title:            '',
    subtitle:         '',
    desktopImage:     '',
    mobileImage:      '',
    badgeText:        '',
    couponCode:       '',
    ctaLabel:         'Shop Now',
    ctaUrl:           '/store',
    bgColor:          '',
  };
}
