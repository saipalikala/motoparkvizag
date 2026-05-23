import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import path             from "path";
import { VitePWA }      from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",  // was "prompt" — auto-update is required
      // selfDestroying REMOVED — was destroying SW on every build
      injectRegister: "auto",

      devOptions: {
        enabled: false,
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim         : true,
        skipWaiting          : true,
        navigateFallback     : "/index.html",
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [

          // ── 0. VERSION ENDPOINT — NEVER cache ──
          // Must be first. If cached, version check fails and users
          // stay on old UI forever.
          {
            urlPattern: /\/api\/version/,
            handler: "NetworkOnly",
          },

          // ── 1. SEMI-STATIC API — StaleWhileRevalidate ──
          {
            urlPattern: /\/api\/(store-config|navbar|offers|carousel|video-showcase|home-data|brands|home-layout)(\/|$|\?)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName : "api-static-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200, 304] },
            },
          },

          // ── 2. CATEGORIES — NetworkFirst ──
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

          // ── 3. PRODUCTS — NetworkFirst ──
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

          // ── 4. DYNAMIC USER API — NetworkFirst ──
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

          // ── 5. STATIC ASSETS — CacheFirst ──
          {
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)(\?.*)?$/,
            handler: "CacheFirst",
            options: {
              cacheName : "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── 6. CLOUDINARY — CacheFirst ──
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
        // Using function form — more reliable than object form for
        // dynamic admin chunk splitting
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("/src/admin/")) {
            return "chunk-admin";
          }
        },
      },
    },

    chunkSizeWarningLimit: 500,
    minify               : "esbuild",
    sourcemap            : false,
  },
});