/**
 * services/campaigns.js — public storefront fetch for the Campaign Experience System.
 *
 * Backend contract (backend/routes/campaignRoutes.js):
 *   GET /api/campaigns         → array of all campaign docs (public)
 *   GET /api/campaigns/active  → single highest-priority active campaign (optional optimisation)
 *
 * This service fetches all campaigns, filters to active ones (enabled + within
 * start/end window), and returns the highest-priority one. If the backend is not
 * deployed yet it returns null — the storefront degrades gracefully (no overlay).
 *
 * TTL: 5 minutes via lib/apiCache. Repeated mounts (route changes, HMR) hit the
 * cache, not the network.
 */
import { api } from '@/lib/api.js';
import { cached } from '@/lib/apiCache.js';

/**
 * Campaign shape returned from the backend (mirrors the Mongoose schema).
 *
 * @typedef {Object} Campaign
 * @property {string}  _id
 * @property {string}  name             internal label (admin only)
 * @property {string}  type             CampaignType enum
 * @property {boolean} enabled
 * @property {number}  priority         higher = shown first
 * @property {string|null} startDate    ISO 8601 or null (no restriction)
 * @property {string|null} endDate      ISO 8601 or null (no restriction)
 * @property {number}  displayDelayMs   default 1500
 * @property {string}  dismissBehaviour 'session'|'daily'|'campaign'|'always'
 * @property {boolean} displayOnce      once per session regardless of behaviour
 *
 * @property {string}  title
 * @property {string}  subtitle
 * @property {string|null} desktopImage Cloudinary URL
 * @property {string|null} mobileImage  Cloudinary URL
 * @property {string|null} badgeText    e.g. "20% OFF"
 * @property {string|null} couponCode
 * @property {string}  ctaLabel
 * @property {string}  ctaUrl
 * @property {string|null} bgColor      CSS color override (default: navy-800)
 * @property {string}  presentationType 'floating_card' | future types
 */

/** ISO date string → is it in the valid window right now? */
function isActive(campaign) {
  if (!campaign.enabled) return false;
  const now = Date.now();
  if (campaign.startDate && new Date(campaign.startDate).getTime() > now) return false;
  if (campaign.endDate   && new Date(campaign.endDate).getTime()   < now) return false;
  return true;
}

/** Normalise a raw backend doc into our canonical Campaign shape. */
function toCampaign(raw) {
  return {
    _id:              String(raw._id ?? raw.id ?? ''),
    name:             raw.name ?? '',
    type:             raw.type ?? 'general',
    enabled:          Boolean(raw.enabled),
    priority:         typeof raw.priority === 'number' ? raw.priority : 0,
    startDate:        raw.startDate ?? null,
    endDate:          raw.endDate   ?? null,
    displayDelayMs:   typeof raw.displayDelayMs === 'number' ? raw.displayDelayMs : 1500,
    dismissBehaviour: raw.dismissBehaviour ?? 'session',
    displayOnce:      Boolean(raw.displayOnce ?? true),

    title:            raw.title    ?? '',
    subtitle:         raw.subtitle ?? '',
    desktopImage:     raw.desktopImage ?? null,
    mobileImage:      raw.mobileImage  ?? null,
    badgeText:        raw.badgeText   ?? null,
    couponCode:       raw.couponCode  ?? null,
    ctaLabel:         raw.ctaLabel    ?? 'Shop Now',
    ctaUrl:           raw.ctaUrl      ?? '/store',
    bgColor:          raw.bgColor     ?? null,
    presentationType: raw.presentationType ?? 'floating_card',
  };
}

/**
 * Fetch and return the highest-priority active campaign, or null if none exist.
 * Results are cached for 5 minutes. A backend failure silently returns null.
 */
export async function getActiveCampaign() {
  try {
    const raw = await cached('campaigns:all', () =>
      api.get('/campaigns').then((r) => (Array.isArray(r.data) ? r.data : [])),
    );

    const active = raw
      .map(toCampaign)
      .filter(isActive)
      .sort((a, b) => b.priority - a.priority);

    return active[0] ?? null;
  } catch {
    return null;
  }
}
