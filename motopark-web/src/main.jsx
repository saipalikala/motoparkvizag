import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import App from "./App";
import { StoreConfigProvider } from "./context/StoreConfigContext";
import { ProductProvider }     from "@/context/ProductContext";
import { CartProvider }        from "@/context/CartContext";
import { WishlistProvider }    from "@/context/WishlistContext";
import { UserProvider }        from "@/context/UserContext";

// ── SW UPDATE (Chrome / Android / Edge) ───────────────────────────────────
registerSW({ immediate: true });

if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// ── VERSION CHECK (Safari iOS + ALL browsers) ─────────────────────────────
// Safari iOS pauses JS timers when app is backgrounded — setInterval alone
// is not enough. Must also check on focus + visibilitychange events.
//
// HOW TO TRIGGER FOR EACH DEPLOYMENT:
//   Railway → Variables → increment APP_VERSION (e.g. 1.0.1 → 1.0.2) → Deploy
//   All users on all browsers get the new UI within 5 min or on next open.

const VERSION_KEY = "mp_app_version";
const BACKEND     = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

let versionCheckRunning = false;

const checkVersion = async () => {
  if (versionCheckRunning) return;
  versionCheckRunning = true;

  try {
    const res = await fetch(`${BACKEND}/api/version?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return;

    const { version } = await res.json();
    const stored = localStorage.getItem(VERSION_KEY);

    if (!stored) {
      localStorage.setItem(VERSION_KEY, version);
      return;
    }

    if (stored !== version) {
      localStorage.setItem(VERSION_KEY, version);

      // Unregister all service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      // Wipe all SW caches
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // Clear session storage
      sessionStorage.clear();

      // Hard reload with cache-bust — bypasses both Safari cache layers
      window.location.href =
        window.location.href.split("?")[0] + "?v=" + version;
    }
  } catch {
    // Network error — silent, retry on next interval/focus
  } finally {
    versionCheckRunning = false;
  }
};

if (import.meta.env.PROD) {
  checkVersion();                                     // on load
  setInterval(checkVersion, 5 * 60 * 1000);          // every 5 min
  window.addEventListener("focus", checkVersion);     // Safari iOS focus resume
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkVersion();
  });
}

// ── RENDER ─────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <UserProvider>
          <ProductProvider>
            <CartProvider>
              <WishlistProvider>
                <StoreConfigProvider>
                  <App />
                </StoreConfigProvider>
              </WishlistProvider>
            </CartProvider>
          </ProductProvider>
        </UserProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

// ── RAILWAY KEEP-ALIVE ─────────────────────────────────────────────────────
if (typeof window !== "undefined" && import.meta.env.PROD) {
  const BACKEND_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  setInterval(() => {
    fetch(`${BACKEND_URL}/ping`, { method: "GET" }).catch(() => {});
  }, 4 * 60 * 1000);
}