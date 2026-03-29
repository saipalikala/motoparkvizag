import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — always needed
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Admin pages — never loaded by regular users
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
        }
      }
    },
    // Warn if any chunk exceeds 500KB
    chunkSizeWarningLimit: 500,
    // Minify for production
    minify: "esbuild",
    // Generate source maps only in dev
    sourcemap: false,
  }
})