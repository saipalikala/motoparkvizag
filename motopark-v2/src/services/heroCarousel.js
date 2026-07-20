/**
 * services/heroCarousel.js — public storefront fetch for the homepage Hero
 * Carousel.
 *
 * Deliberately a SEPARATE file from
 * features/admin/hero-carousel/heroCarouselService.js — different auth realm
 * (no admin token, uses the storefront's own `api` client), different need
 * (this one only ever reads, and only ever wants currently-eligible slides).
 * Same split Campaigns already established: services/campaigns.js (public)
 * vs features/admin/campaigns/campaignService.js (admin CRUD).
 *
 * Backend contract (backend/routes/heroSlideRoutes.js): for an
 * UNAUTHENTICATED caller (this one), GET /api/hero-slides already filters to
 * enabled + in-window slides server-side (the Phase 1 review correction) —
 * but the response is still unsorted, so sorting by `order` is still this
 * service's job.
 *
 * A light client-side eligibility re-check is kept anyway, even though the
 * backend already filters: this service's response is cached for 5 minutes
 * (lib/apiCache.js), and a slide that was eligible at fetch time can expire
 * while still sitting in that cache. Re-checking on read closes that small
 * staleness window — the backend filter is still what stops it being
 * publicly visible in the first place.
 */
import { api } from '@/lib/api.js';
import { cached } from '@/lib/apiCache.js';

function isActive(slide) {
  if (!slide.enabled) return false;
  const now = Date.now();
  if (slide.publishAt && new Date(slide.publishAt).getTime() > now) return false;
  if (slide.expireAt && new Date(slide.expireAt).getTime() < now) return false;
  return true;
}

/** Normalise a raw backend doc into the shape HeroCarouselSlide renders.
 *  mobileImage falls back to desktopImage when absent — resolved here, not
 *  stored, same reasoning carouselRoutes.js's normalise() already used. */
function toSlide(raw) {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    desktopImage: raw.desktopImage ?? '',
    mobileImage: raw.mobileImage || raw.desktopImage || '',
    imageAlt: raw.imageAlt ?? '',
    order: typeof raw.order === 'number' ? raw.order : 0,
    enabled: Boolean(raw.enabled),
    publishAt: raw.publishAt ?? null,
    expireAt: raw.expireAt ?? null,
  };
}

/**
 * Fetch every currently-eligible hero slide, sorted by display order.
 * Never throws — a backend failure resolves to [], the same silent-degrade
 * philosophy as every other storefront read in this app (HeroScene's
 * `.catch`, Lenis's fire-and-forget sync). The caller (useHeroSlides)
 * decides what "no slides" means for rendering — this service only fetches.
 */
export async function getHeroSlides() {
  try {
    const raw = await cached('hero-slides:all', () =>
      api.get('/hero-slides').then((r) => (Array.isArray(r.data) ? r.data : [])),
    );
    return raw.map(toSlide).filter(isActive).sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}
