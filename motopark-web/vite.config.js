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
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [

          // ── 1. SEMI-STATIC API — StaleWhileRevalidate ──────────────
          // REMOVED /categories from this group — category data must
          // always be fresh so slug→_id lookup never uses stale data.
          {
            urlPattern: /\/api\/(store-config|navbar|offers|carousel|video-showcase|home-data|brands|home-layout)(\/|$|\?)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName : "api-static-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200, 304] },
            },
          },

          // ── 2. CATEGORIES — NetworkFirst (was StaleWhileRevalidate) ─
          // CRITICAL FIX: categories must be fresh on every load.
          // Slug → _id mapping breaks if categories are served from cache.
          {
            urlPattern: /\/api\/categories(\/|$|\?)/,
            handler: "NetworkFirst",
            options: {
              cacheName            : "api-categories-cache",
              expiration           : { maxEntries: 5, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 3,
              cacheableResponse    : { statuses: [0, 200] },
            },
          },

          // ── 3. PRODUCTS — NetworkFirst ──────────────────────────────
          // Products are filtered by category _id. Must be fresh.
          // Never serve stale product lists from cache.
          {
            urlPattern: /\/api\/products(\/|$|\?)/,
            handler: "NetworkFirst",
            options: {
              cacheName            : "api-products-cache",
              expiration           : { maxEntries: 20, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 4,
              cacheableResponse    : { statuses: [0, 200] },
            },
          },

          // ── 4. DYNAMIC USER API — NetworkFirst ─────────────────────
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

          // ── 5. STATIC ASSETS — CacheFirst ──────────────────────────
          {
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)(\?.*)?$/,
            handler: "CacheFirst",
            options: {
              cacheName : "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 6. CLOUDINARY — CacheFirst ─────────────────────────────
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
    target: "es2020",

    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react" : ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "chunk-admin": [
  "./src/admin/pages/Dashboard.jsx",
  "./src/admin/pages/AdminProducts.jsx",
  "./src/admin/pages/AdminOrders.jsx",
  "./src/admin/pages/AdminCategories.jsx",
  "./src/admin/pages/AdminCollections.jsx",
  "./src/admin/pages/AdminMedia.jsx",
  "./src/admin/pages/AdminCarouselManager.jsx",
  "./src/admin/pages/AdminNavbarManager.jsx",
  "./src/admin/pages/AdminHomeLayout.jsx",
  "./src/admin/pages/InventoryManager.jsx",
  "./src/admin/pages/OffersAdmin.jsx",
  "./src/admin/pages/AdminVideoShowcase.jsx",
],
        },
      },
    },

    chunkSizeWarningLimit: 500,
    minify               : "esbuild",
    // REMOVED: esbuildOptions drop:console — was hiding slug mismatch errors
    // Add it back ONLY after confirming category pages work correctly:
    // esbuildOptions: { drop: ["console", "debugger"] },
    sourcemap            : false,
  },
});