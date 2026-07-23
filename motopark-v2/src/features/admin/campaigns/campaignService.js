/**
 * features/admin/campaigns/campaignService.js
 *
 * Admin Campaign Experience System — CRUD service.
 *
 * Backend contract (Dedicated Admin Router):
 *   GET    /api/admin/campaigns           → list of all campaigns
 *   POST   /api/admin/campaigns           → create campaign
 *   PUT    /api/admin/campaigns/:id       → update campaign
 *   DELETE /api/admin/campaigns/:id       → soft delete campaign
 *   PATCH  /api/admin/campaigns/:id/toggle → toggle enabled
 */
import { adminApi } from '../lib/adminApi.js';

/** Campaign types — kept in sync with storefront definitions. */
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

/** Presentation placement types. */
export const PRESENTATION_TYPES = [
  { value: 'floating_card', label: 'Floating Card (bottom-right / mobile sheet)' },
  { value: 'offer_bar',     label: 'Top Offer Bar' },
  { value: 'story_band',    label: 'Story Band Showcase' },
  { value: 'homepage_hero', label: 'Homepage Hero Banner' },
];

/** Image upload limit — 20 MB */
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;

export function validateImage(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) return 'Image must be JPG, PNG, or WebP.';
  if (file.size > IMAGE_MAX_BYTES) return 'Image exceeds 20 MB.';
  return null;
}

/** Upload campaign image → Cloudinary URL string */
export async function uploadCampaignImage(file) {
  const fd = new FormData();
  fd.append('media', file);
  const { data } = await adminApi.post('/upload/media', fd, { timeout: 0 });
  if (!data?.url) throw { code: 0, message: 'Upload returned no URL.' };
  return data.url;
}

// ── CRUD ──────────────────────────────────────────────────────────────────

/** Fetch all campaigns (Admin view). */
export async function listCampaigns() {
  const { data } = await adminApi.get('/admin/campaigns');
  if (data?.data && Array.isArray(data.data)) return data.data;
  return Array.isArray(data) ? data : [];
}

/** Create a new campaign. */
export async function createCampaign(payload) {
  const { data } = await adminApi.post('/admin/campaigns', payload);
  return data?.data ?? data;
}

/** Update an existing campaign by id. */
export async function updateCampaign(id, payload) {
  const { data } = await adminApi.put(`/admin/campaigns/${id}`, payload);
  return data?.data ?? data;
}

/** Delete a campaign by id. */
export async function deleteCampaign(id) {
  const { data } = await adminApi.delete(`/admin/campaigns/${id}`);
  return data;
}

/** Toggle enabled/disabled. */
export async function toggleCampaign(id, enabled) {
  const { data } = await adminApi.patch(`/admin/campaigns/${id}/toggle`, { enabled });
  return data?.data ?? data;
}

/** Blank campaign model for "create" modal. */
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
