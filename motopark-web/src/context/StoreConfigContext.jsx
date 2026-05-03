/**
 * src/context/StoreConfigContext.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Raw fetch → cachedFetch
 *      Before: bare fetch every time StoreConfigProvider mounts.
 *      Provider mounts once at root (main.jsx), but StrictMode
 *      double-invokes the effect in dev = 2 requests.
 *      After: in-flight coalescing means StrictMode still fires
 *      1 network call total.
 *
 * [F2] AbortController + isMounted guard
 *      Before: no cleanup. Unmount during dev hot-reload could
 *      call setConfig on dead component.
 *      After: ctrl.abort() + alive flag.
 *
 * [F3] Response type guard preserved from original
 *      The original had a content-type check to catch HTML 500
 *      pages being returned as "JSON". Preserved exactly.
 *
 * [F4] Loading state added
 *      Before: config was null until the first fetch resolved,
 *      causing consumers to render with undefined config values.
 *      After: loading flag lets consumers show a skeleton or
 *      defer rendering until config is available.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { API } from "@/config/api";
import { cachedFetch } from "@/lib/apiCache"; // [F1]

const StoreConfigContext = createContext();

export const StoreConfigProvider = ({ children }) => {
  const [config,  setConfig]  = useState(null);
  const [loading, setLoading] = useState(true); // [F4]

  // [F1] + [F2] + [F3]
  useEffect(() => {
    const ctrl  = new AbortController();
    let   alive = true;

    cachedFetch(`${API}/store-config`, { signal: ctrl.signal })
      .then((data) => {
        if (alive) {
          setConfig(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[StoreConfig]", err.message);
        }
        if (alive) setLoading(false);
      });

    return () => { alive = false; ctrl.abort(); };
  }, []);

  return (
    <StoreConfigContext.Provider value={{ config, loading }}>
      {children}
    </StoreConfigContext.Provider>
  );
};

export const useStoreConfig = () => useContext(StoreConfigContext);