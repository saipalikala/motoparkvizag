// vite.config.js
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
        clientsClaim:          true,
        skipWaiting:           true,
        navigateFallback:      "/index.html",
        runtimeCaching: [

          // ── 1. SEMI-STATIC API ROUTES — StaleWhileRevalidate ────────
          // These endpoints change only when admin updates them.
          // StaleWhileRevalidate = serve from cache INSTANTLY (~1ms),
          // then silently fetch fresh data in the background.
          // Result: user sees content immediately on every visit.
          {
            urlPattern: /\/api\/(store-config|navbar|offers|carousel|video-showcase|categories|home-data|brands)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName:  "api-static-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 5 * 60 }, // 5 min
              cacheableResponse: { statuses: [0, 200, 304] },
            },
          },

          // ── 2. DYNAMIC / USER API ROUTES — NetworkFirst ─────────────
          // These MUST be fresh: cart, orders, auth, checkout, payment.
          // NetworkFirst = always tries network, falls back to cache
          // only if offline/Railway down.
          {
            urlPattern: /\/api\/(orders|cart|users|wishlist|payment|admin)/,
            handler: "NetworkFirst",
            options: {
              cacheName:             "api-dynamic-cache",
              expiration:            { maxEntries: 20, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 4,
              cacheableResponse:     { statuses: [0, 200] },
            },
          },

          // ── 3. STATIC ASSETS — CacheFirst ───────────────────────────
          // JS, CSS, fonts, local images. These are content-hashed by
          // Vite so a new deploy gets new URLs automatically.
          {
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName:  "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 4. CLOUDINARY IMAGES — CacheFirst ───────────────────────
          // Images are immutable after upload (content-addressed URLs).
          // Cache aggressively — 30 days.
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName:  "cloudinary-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      manifest: {
        name:             "MotoPark",
        short_name:       "MotoPark",
        theme_color:      "#111111",
        background_color: "#ffffff",
        display:          "standalone",
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
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":  ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "chunk-admin": [
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
          ],
        },
      },
    },

    chunkSizeWarningLimit: 500,
    minify:                "esbuild",
    esbuildOptions: {
      drop: ["console", "debugger"],
    },
    sourcemap: false,
  },
});