import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Honor an injected PORT (e.g. Claude preview / autoPort); default 5174.
    // V1 dev server owns 5173 — both run side-by-side.
    port: Number(process.env.PORT) || 5174,
  },
});
