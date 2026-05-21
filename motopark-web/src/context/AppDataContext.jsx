import { createContext, useContext, useEffect, useState } from 'react';
import { cachedFetch } from '@/lib/apiCache';
import { API } from '@/config/api';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [state, setState] = useState({
    navbar      : null,
    offers      : null,
    storeConfig : null,
    loading     : true,
    error       : null,
  });

  useEffect(() => {
    const ctrl  = new AbortController();
    let   alive = true;

    // carousel  → fetched by PremiumCarousel (freshOnly: true, needs latest Cloudinary URLs)
    // videoShowcase → fetched by VideoShowcase directly
    // Both removed here to eliminate duplicate network requests
    Promise.allSettled([
      cachedFetch(`${API}/navbar`,       { signal: ctrl.signal }),
      cachedFetch(`${API}/offers`,       { signal: ctrl.signal }),
      cachedFetch(`${API}/store-config`, { signal: ctrl.signal }),
    ]).then((results) => {
      if (!alive) return;

      const [navbar, offers, storeConfig] = results;

      setState({
        navbar      : navbar.status      === 'fulfilled' ? navbar.value      : null,
        offers      : offers.status      === 'fulfilled' ? offers.value      : null,
        storeConfig : storeConfig.status === 'fulfilled' ? storeConfig.value : null,
        loading     : false,
        error       : null,
      });
    });

    return () => { alive = false; ctrl.abort(); };
  }, []);

  return (
    <AppDataContext.Provider value={state}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
};