import { createContext, useContext, useEffect, useState } from 'react';
import { BIKE_MENU, BRAND_MENU, CATEGORY_MENU } from '@/config/nav.js';
import { getNavCategories, getNavBrands, getNavBikes } from '@/services/navigation.js';

/**
 * NavContext — the single source of truth for the storefront mega-menu items.
 *
 * Fetches live Categories, Brands, and Bikes ONCE on mount and holds them in
 * state, so the Navbar reads plain state on every hover (no per-hover requests).
 * The initial state IS the hardcoded nav.js seed, and a fetched result only
 * replaces it when it comes back non-empty — so any API failure leaves the
 * static lists in place and navigation never breaks (graceful fallback).
 *
 * Bikes are grouped by make: [{ make, makeSlug, models: [{ label, slug }] }].
 * The static BIKE_MENU (flat makes) is adapted into that shape as the fallback —
 * each make becomes a group with no models (still links to its make page).
 */
const NavContext = createContext(null);

/** Adapt the flat static make list into the grouped bikes shape (no models). */
const BIKE_FALLBACK = BIKE_MENU.map((b) => ({ make: b.label, makeSlug: b.slug, models: [] }));

const FALLBACK = { categories: CATEGORY_MENU, brands: BRAND_MENU, bikes: BIKE_FALLBACK };

export function NavProvider({ children }) {
  const [categories, setCategories] = useState(CATEGORY_MENU);
  const [brands, setBrands] = useState(BRAND_MENU);
  const [bikes, setBikes] = useState(BIKE_FALLBACK);

  useEffect(() => {
    let alive = true;
    getNavCategories()
      .then((items) => {
        if (alive && items.length) setCategories(items);
      })
      .catch(() => {
        /* keep the static fallback already in state */
      });
    getNavBrands()
      .then((items) => {
        if (alive && items.length) setBrands(items);
      })
      .catch(() => {
        /* keep the static fallback already in state */
      });
    getNavBikes()
      .then((groups) => {
        if (alive && groups.length) setBikes(groups);
      })
      .catch(() => {
        /* keep the static fallback already in state */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <NavContext.Provider value={{ categories, brands, bikes }}>{children}</NavContext.Provider>
  );
}

/** Menu items for the navbar. Falls back to the static seed if used outside a
 *  provider (defensive — the provider always wraps the storefront chrome). */
export function useNav() {
  return useContext(NavContext) ?? FALLBACK;
}
