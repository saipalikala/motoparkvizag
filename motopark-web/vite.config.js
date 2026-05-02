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
          {
            // API responses — NetworkFirst (fresh data, fallback to cache)
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 4,
            },
          },
          {
            // Static assets — CacheFirst (JS, CSS, fonts, local images)
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Cloudinary images — CacheFirst (immutable after upload)
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
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
          // React core — cached separately, changes rarely
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // ── FIX: framer-motion in its own vendor chunk ──────────────
          // framer-motion is ~100KB gzipped. Without this it gets
          // bundled into whatever page first imports it (usually Home),
          // bloating the initial chunk. Isolated here it's cached once
          // and reused across every page that uses motion components.
          "vendor-motion": ["framer-motion"],

          // Admin panel — only admins ever load this chunk.
          // Kept full list (suggested fix only had 3 pages — incomplete).
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

          // ── NOT ADDED: chunk-ui for PremiumCarousel ─────────────────
          // Suggested fix proposed splitting PremiumCarousel into its
          // own chunk. Rejected — PremiumCarousel is on the HOME PAGE
          // critical path. Splitting it forces an extra network request
          // that blocks the above-the-fold render. Wrong direction.
        },
      },
    },

    chunkSizeWarningLimit: 500,

    // ── FIX: drop console.log + debugger in production ──────────────
    // esbuild (already used) supports this natively via `drop`.
    // The suggested fix swapped to terser which requires `npm install
    // terser` as an extra devDependency and is 3-4× slower to build.
    // esbuild achieves the same result with zero extra installs.
    minify: "esbuild",
    esbuildOptions: {
      drop: ["console", "debugger"],
    },

    sourcemap: false,
  },
});