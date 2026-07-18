import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * CartContext — guest cart persisted to localStorage (PRD R1). No backend cart
 * in V2 yet; on login this merges to the server (services/cart.merge — future).
 * A line is identified by id+color+size so the same product in different
 * variants stacks as separate lines. Prices are display-only INR from services.
 */
const CartContext = createContext(null);
// v2: lines now carry `color` as the variant HEX (the order API matches on it)
// plus `colorName` for display. v1 lines stored the NAME in `color`, which the
// order API rejects as out-of-stock — and a v1 line's hex cannot be recovered
// from its name, so the key bump drops stale carts rather than resurrecting
// ones that would fail at checkout.
const KEY = 'mp-cart-v2';

const lineKey = (l) => `${l.id}|${l.color ?? ''}|${l.size ?? ''}`;

/**
 * Clamp a quantity to the stock captured on the line at add-time. This is a UX
 * guard only — `stock` is a localStorage snapshot and goes stale, so the server's
 * atomic `stock: { $gte: quantity }` decrement stays the authority on what can
 * actually be bought. Lines without a numeric `stock` (carts saved before stock
 * was tracked, and no-variant products, which carry no stock record at all) are
 * left unclamped rather than pinned to 1.
 */
const capQty = (line, qty) => {
  const wanted = Math.max(1, qty);
  return Number.isInteger(line?.stock) ? Math.min(wanted, Math.max(1, line.stock)) : wanted;
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* private mode — non-fatal */
    }
  }, [items]);

  const addItem = useCallback((line) => {
    setItems((prev) => {
      const key = lineKey(line);
      const idx = prev.findIndex((x) => lineKey(x) === key);
      const qty = Math.max(1, line.qty || 1);
      if (idx >= 0) {
        const next = [...prev];
        // The incoming line carries a fresher stock reading than the stored one,
        // so merge onto it — otherwise re-adding keeps applying a stale cap.
        const merged = { ...next[idx], ...line };
        next[idx] = { ...merged, qty: capQty(merged, next[idx].qty + qty) };
        return next;
      }
      return [...prev, { ...line, qty: capQty(line, qty) }];
    });
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((x) => lineKey(x) !== key));
  }, []);

  const updateQty = useCallback((key, qty) => {
    setItems((prev) =>
      prev.map((x) => (lineKey(x) === key ? { ...x, qty: capQty(x, qty) } : x)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((n, x) => n + x.qty, 0);
    const subtotalINR = items.reduce((n, x) => n + (x.priceINR || 0) * x.qty, 0);
    return { items, count, subtotalINR, addItem, removeItem, updateQty, clear, lineKey };
  }, [items, addItem, removeItem, updateQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
