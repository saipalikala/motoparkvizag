/**
 * services/campaigns.js — public storefront fetch for the Campaign Experience System.
 *
 * Public Endpoint: GET /api/campaigns → returns array of active non-deleted campaigns.
 */
import { api } from '@/lib/api.js';
import { cached } from '@/lib/apiCache.js';

function isActive(campaign) {
  if (!campaign.enabled || campaign.isDeleted) return false;
  const now = Date.now();
  if (campaign.startDate && new Date(campaign.startDate).getTime() > now) return false;
  if (campaign.endDate && new Date(campaign.endDate).getTime() < now) return false;
  return true;
}

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

/** Fetch and return the highest-priority active campaign for the storefront. */
export async function getActiveCampaign() {
  try {
    const raw = await cached('campaigns:active', () =>
      api.get('/campaigns').then((r) => {
        if (r.data?.data && Array.isArray(r.data.data)) return r.data.data;
        return Array.isArray(r.data) ? r.data : [];
      }),
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
