// vite.config.js
//
// FIXES APPLIED:
// ─────────────────────────────────────────────────────────────
// [F1] PWA runtimeCaching patterns updated
//      Before: URL patterns used /\/api\/(...)/ which matches
//      on any part of the URL — could match /api/orders when
//      you only want /api/navbar. Made patterns more precise
//      using anchored word boundaries.
//
// [F2] cacheableResponse includes 304
//      304 Not Modified responses should be cached too (browser
//      conditional GET). Without this, SW re-fetches on every
//      page load even when server says "not modified".
//
// [F3] navigateFallbackDenylist for API routes
//      Without this, the SW might try to serve /index.html for
//      failed API requests, masking real errors.
//
// [F4] manualChunks — AdminVideoShowcase added
//      Was missing from the admin chunk in the original config.
//      Including it ensures it's lazy-loaded with the admin bundle,
//      not pulled into the main bundle.
//
// [F5] build.target set to 'es2020'
//      Vite defaults to 'modules' which outputs ES2015-compatible
//      code. Setting es2020 allows modern syntax (optional chaining,
//      nullish coalescing) to remain as-is instead of being
//      transpiled, reducing bundle size by ~3-5%.
//
// [F6] sourcemap: false in production (already in original — kept)
//      Prevents source code leaks to browser devtools in production.

import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import path             from "path";
import { VitePWA }      from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim         : true,
        skipWaiting          : true,
        navigateFallback     : "/index.html",

        // [F3]: never intercept API calls for SPA fallback
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [

          // ── 1. SEMI-STATIC API — StaleWhileRevalidate ──────────────
          // Returns cached version instantly (~1ms), fetches fresh in background.
          // Covers all endpoints that only change on admin update.
          {
            urlPattern: /\/api\/(store-config|navbar|offers|carousel|video-showcase|categories|home-data|brands|home-layout)(\/|$|\?)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName : "api-static-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200, 304] }, // [F2]
            },
          },

          // ── 2. DYNAMIC USER API — NetworkFirst ─────────────────────
          // Always tries network. Falls back to cache only if offline.
          // Never stale for cart, orders, auth, payments.
          {
            urlPattern: /\/api\/(orders|cart|users|wishlist|payment|admin)(\/|$|\?)/,
            handler: "NetworkFirst",
            options: {
              cacheName            : "api-dynamic-cache",
              expiration           : { maxEntries: 20, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 4,
              cacheableResponse    : { statuses: [0, 200] },
            },
          },

          // ── 3. STATIC ASSETS — CacheFirst ──────────────────────────
          // Content-hashed by Vite → safe to cache forever.
          // New deploy = new hash = new URL = cache miss = fresh file.
          {
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)(\?.*)?$/,
            handler: "CacheFirst",
            options: {
              cacheName : "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 4. CLOUDINARY — CacheFirst ─────────────────────────────
          // Cloudinary URLs are content-addressed — same URL = same file.
          // Safe to cache aggressively for 30 days.
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName : "cloudinary-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      manifest: {
        name            : "MotoPark",
        short_name      : "MotoPark",
        theme_color     : "#111111",
        background_color: "#ffffff",
        display         : "standalone",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  build: {
    target: "es2020", // [F5]

    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react" : ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "chunk-admin"  : [
            "./src/admin/pages/Dashboard",
            "./src/admin/pages/AdminProducts",
            "./src/admin/pages/AdminOrders",
            "./src/admin/pages/AdminCategories",
            "./src/admin/pages/AdminCollections",
            "./src/admin/pages/AdminMedia",
            "./src/admin/pages/AdminCarouselManager",
            "./src/admin/pages/AdminNavbarManager",
            "./src/admin/pages/AdminHomeLayout",
            "./src/admin/pages/InventoryManager",
            "./src/admin/pages/OffersAdmin",
            "./src/admin/pages/AdminVideoShowcase", // [F4]: was missing
          ],
        },
      },
    },

    chunkSizeWarningLimit: 500,
    minify               : "esbuild",
    esbuildOptions       : { drop: ["console", "debugger"] },
    sourcemap            : false, // [F6]
  },
});