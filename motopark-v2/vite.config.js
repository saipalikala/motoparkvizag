import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const ANALYZE = !!process.env.ANALYZE;

/**
 * manualChunks — a DIAGNOSTIC, not a lazy-loading mechanism.
 *
 * Read this before changing it: splitting a module into its own chunk does NOT
 * make it lazy. It only decides which *file* the module lands in. If `three` is
 * reachable from a statically-imported module it still downloads on first paint,
 * just as a separate file. Laziness comes only from an `import()` at the
 * boundary (see src/cinematic/, docs/11 §7b).
 *
 * The value of naming these chunks is visibility: three.js becomes its own line
 * item in the visualizer and in scripts/check-budgets.mjs, so a leak announces
 * itself instead of hiding inside HomePage.
 */
function manualChunks(id) {
  // React only. Measured 2026-07-18: adding first-party rules here (chunk-admin,
  // chunk-cinematic) cost 27 kB brotli on the "/" route — forcing admin modules
  // into a named chunk caused rolldown to absorb axios and React's CJS interop
  // into that same chunk, which the entry genuinely needs, so the entry ended up
  // STATICALLY importing 58 kB of admin code. Route JS went 127 kB → 154 kB.
  //
  // The lesson, and the reason this function is now three lines: a manual chunk
  // does not fence code off, it only relocates it — and relocating a module that
  // shared code depends on inverts the dependency and drags the whole chunk
  // forward. Isolation comes from the import() boundary, never from here.
  //
  // Do NOT add `three` / `@react-three` / `gsap` rules when the cinematic layer
  // lands. They are dynamically imported from src/cinematic/ and rolldown will
  // give them their own chunks automatically; naming them here risks the exact
  // inversion described above. scripts/check-budgets.mjs reads the manifest, so
  // a leak is caught regardless of what the chunk is called.
  if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
    return 'vendor-react';
  }
  return undefined;
}

/**
 * Emits dist/.vite/module-map.json — { chunkFileName: [source module ids] }.
 *
 * WHY: Vite's own manifest only describes chunk BOUNDARIES. A small first-party
 * module gets merged into an existing chunk and then appears nowhere in the
 * manifest — so a static `import '@/cinematic/Scene.jsx'` from HomePage is
 * completely invisible to a manifest-based check. That hole was found by
 * deliberately planting a breach and watching check-budgets.mjs pass it.
 *
 * This map lets scripts/check-budgets.mjs look INSIDE each chunk.
 */
function moduleMapPlugin() {
  return {
    name: 'motopark-module-map',
    generateBundle(_options, bundle) {
      const map = {};
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        map[fileName] = Object.keys(chunk.modules ?? {}).map((id) =>
          id.replace(/\\/g, '/').replace(/^.*?(src\/|node_modules\/)/, '$1'),
        );
      }
      this.emitFile({
        type: 'asset',
        fileName: '.vite/module-map.json',
        source: JSON.stringify(map, null, 1),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => {
  // Analyzer is a devDependency loaded only when asked for, so a normal build
  // (and a Vercel build) never pays for it or fails if it isn't installed.
  const plugins = [react(), moduleMapPlugin()];
  if (ANALYZE) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(
      visualizer({
        filename: 'perf/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
    );
  }

  return {
    plugins,
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
    build: {
      // es2020, not es2022: the audience is Indian mobile, where older Android
      // WebViews are a real share. The output-size difference is negligible.
      target: 'es2020',
      // check-budgets.mjs reads this to resolve which chunks the "/" route pulls.
      manifest: true,
      sourcemap: ANALYZE,
      // 300 kB, not V1's 500 — the point is for three.js to be LOUD if it lands
      // somewhere it shouldn't.
      chunkSizeWarningLimit: 300,
      rollupOptions: {
        output: { manualChunks },
      },
    },
  };
});
