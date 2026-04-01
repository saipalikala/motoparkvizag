// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
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
            // Static assets — CacheFirst (images, fonts, JS)
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Cloudinary images — CacheFirst
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
        name: "MotoPark",
        short_name: "MotoPark",
        theme_color: "#111111",
        background_color: "#ffffff",
        display: "standalone",
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
          "vendor-react": ["react", "react-dom", "react-router-dom"],
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
    minify: "esbuild",
    sourcemap: false,
  },
});