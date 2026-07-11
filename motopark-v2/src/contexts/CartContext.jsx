import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * CartContext — guest cart persisted to localStorage (PRD R1). No backend cart
 * in V2 yet; on login this merges to the server (services/cart.merge — future).
 * A line is identified by id+color+size so the same product in different
 * variants stacks as separate lines. Prices are display-only INR from services.
 */
const CartContext = createContext(null);
const KEY = 'mp-cart-v1';

const lineKey = (l) => `${l.id}|${l.color ?? ''}|${l.size ?? ''}`;

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
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...line, qty }];
    });
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((x) => lineKey(x) !== key));
  }, []);

  const updateQty = useCallback((key, qty) => {
    setItems((prev) =>
      prev.map((x) => (lineKey(x) === key ? { ...x, qty: Math.max(1, qty) } : x)),
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
