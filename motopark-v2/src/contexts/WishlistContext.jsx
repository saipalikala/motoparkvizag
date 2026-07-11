import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * WishlistContext — guest wishlist persisted to localStorage (PRD R1). Stores
 * slim product cards (id, name, brand, priceINR, image, url) so the WishlistPage
 * renders without re-fetching. Merges to the server on login (future).
 */
const WishlistContext = createContext(null);
const KEY = 'mp-wishlist-v1';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* private mode — non-fatal */
    }
  }, [items]);

  const has = useCallback((id) => items.some((x) => x.id === id), [items]);

  const toggle = useCallback((card) => {
    if (!card?.id) return;
    setItems((prev) =>
      prev.some((x) => x.id === card.id)
        ? prev.filter((x) => x.id !== card.id)
        : [
            {
              id: card.id,
              name: card.name,
              brand: card.brand,
              priceINR: card.priceINR,
              image: card.image ?? null,
              url: card.url || `/products/${card.id}`,
            },
            ...prev,
          ],
    );
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.length, has, toggle, remove, clear }),
    [items, has, toggle, remove, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
