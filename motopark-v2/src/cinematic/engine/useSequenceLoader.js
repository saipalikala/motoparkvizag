import { useState, useEffect, useRef } from 'react';
import { frameUrl } from './cinematicUtils.js';

/**
 * useSequenceLoader — generic image-sequence preloader for the cinematic engine.
 *
 * ─── Architecture ─────────────────────────────────────────────────────────────
 *
 * The frame array lives at MODULE scope in `_cache` (not React state). This means:
 *
 *   • Zero re-renders as individual images load — only `loaded` and `loadedCount`
 *     are React state, flipped at most twice per session per key.
 *   • The array survives React unmount/remount within the same browser tab.
 *   • Multiple components that share a `cacheKey` share the same array.
 *   • Memory is released when the browser decides — no manual management needed.
 *
 * ─── Why createImageBitmap? ────────────────────────────────────────────────────
 *
 * The old approach (`new Image(); img.src = url`) schedules an async decode but
 * the browser may still finalize that decode on the main thread the first time
 * `drawImage()` is called with that image — causing a frame drop.
 *
 * `createImageBitmap(blob)` decodes entirely off the main thread and returns a
 * GPU-uploadable bitmap. `ctx.drawImage(bitmap, ...)` is then as fast as a
 * texture blit — no further decode, no jank.
 *
 * Fallback: if `createImageBitmap` is unavailable (shouldn't happen in any
 * supported browser, but just in case) we fall back to `new Image()`.
 *
 * ─── Loading order ────────────────────────────────────────────────────────────
 *
 * 1. Priority indices (caller-supplied — typically [0, last])
 * 2. Frame 0 (ensures the canvas is never blank at first paint)
 * 3. Remaining frames in batches of 15 via requestIdleCallback
 *    Batches run in scroll order so "early" frames are always ready first.
 *
 * ─── Parameters ───────────────────────────────────────────────────────────────
 *
 * @param {object}   cfg
 * @param {string}   cfg.frameBaseUrl   URL prefix, e.g. '/cinematic/sequence/ezgif-frame-'
 * @param {string}   cfg.frameExt       Extension,  e.g. '.jpg'
 * @param {number}   cfg.framePadding   Zero-pad width, e.g. 3 → '001'
 * @param {number}   cfg.totalFrames    Total frame count. 0 = no frames / skip loading.
 * @param {number[]} [cfg.priority]     0-based indices to load first
 * @param {string}   [cfg.cacheKey]     Unique key; defaults to `frameBaseUrl`
 *
 * @returns {{ frames: Array<ImageBitmap|null>, loaded: boolean, loadedCount: number }}
 */

// ── Module-level cache ─────────────────────────────────────────────────────────
/** @type {Map<string, Array<ImageBitmap|null>>} */
const _cache = new Map();

// ── createImageBitmap availability ────────────────────────────────────────────
const _hasCIB = typeof window !== 'undefined' && typeof createImageBitmap === 'function';

// ── rIC shim (Safari < 17.4 and Firefox ESR have no rIC) ─────────────────────
const _rIC =
  typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
    ? (cb, opts) => window.requestIdleCallback(cb, opts)
    : (cb) => window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 4);

const _cIC =
  typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function'
    ? (id) => window.cancelIdleCallback(id)
    : (id) => window.clearTimeout(id);

// ── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Load a single frame into the cache slot.
 * Resolves immediately if already loaded (non-null slot).
 *
 * Uses createImageBitmap(blob) when available so the decode happens
 * entirely off the main thread. Falls back to HTMLImageElement.
 */
async function _loadOne(frames, idx, url) {
  if (frames[idx] !== null) return frames[idx];

  if (_hasCIB) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob   = await resp.blob();
      const bitmap = await createImageBitmap(blob);
      frames[idx] = bitmap;
      return bitmap;
    } catch {
      // Slot stays null — caller skips null slots gracefully
      return null;
    }
  }

  // Fallback: HTMLImageElement with async decode hint
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload  = () => {
      // img.decode() ensures the browser fully decodes before we store it,
      // reducing the chance of a main-thread decode on first drawImage call.
      img.decode().then(() => { frames[idx] = img; resolve(img); }).catch(() => {
        frames[idx] = img; resolve(img);
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Schedule fn in the next idle period; returns a cancellable Promise. */
function _scheduleIdle(fn, opts = { timeout: 5000 }) {
  let id;
  const p = new Promise((resolve) => {
    id = _rIC(() => Promise.resolve(fn()).then(resolve), opts);
  });
  p.cancel = () => _cIC(id);
  return p;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSequenceLoader({
  frameBaseUrl,
  frameExt = '.jpg',
  framePadding = 3,
  totalFrames = 0,
  priority = [],
  cacheKey,
}) {
  const key = cacheKey ?? frameBaseUrl;

  // Initialise the cache slot once.
  if (!_cache.has(key)) {
    _cache.set(key, totalFrames > 0 ? new Array(totalFrames).fill(null) : []);
  }
  const frames = _cache.get(key);

  const [loaded, setLoaded] = useState(() => frames.length > 0 && frames[0] !== null);
  const [loadedCount, setLoadedCount] = useState(() => frames.filter(Boolean).length);

  const cancelledRef = useRef(false);
  const idleOpsRef   = useRef([]);

  useEffect(() => {
    if (totalFrames === 0) return;

    cancelledRef.current = false;

    async function runBatch(indices) {
      for (const i of indices) {
        if (cancelledRef.current) return;
        if (frames[i] !== null) continue;
        await _loadOne(frames, i, frameUrl(frameBaseUrl, frameExt, framePadding, i));
      }
    }

    async function loadAll() {
      // ── Step 1: priority frames (typically [0, last]) ──────────────────────
      const prioritySet = new Set(
        priority.filter(i => i >= 0 && i < totalFrames)
      );
      if (prioritySet.size > 0) {
        await runBatch([...prioritySet]);
      }

      // ── Step 2: frame 0 — guarantees the canvas is never blank ─────────────
      if (frames[0] === null && !cancelledRef.current) {
        await _loadOne(frames, 0, frameUrl(frameBaseUrl, frameExt, framePadding, 0));
      }
      if (!cancelledRef.current && frames[0] !== null) {
        setLoaded(true);
      }

      // ── Step 3: remaining in scroll order, idle-batched ────────────────────
      const loadedSet = new Set([...prioritySet, 0]);
      const remaining = Array.from({ length: totalFrames }, (_, i) => i)
        .filter(i => !loadedSet.has(i));

      const BATCH_SIZE = 15;
      for (let start = 0; start < remaining.length; start += BATCH_SIZE) {
        if (cancelledRef.current) return;
        const batch = remaining.slice(start, start + BATCH_SIZE);
        const op = _scheduleIdle(async () => {
          await runBatch(batch);
          if (!cancelledRef.current) {
            setLoadedCount(frames.filter(Boolean).length);
          }
        });
        idleOpsRef.current.push(op);
        await op;
      }

      if (!cancelledRef.current) {
        setLoadedCount(totalFrames);
      }
    }

    loadAll();

    return () => {
      cancelledRef.current = true;
      idleOpsRef.current.forEach(op => op?.cancel?.());
      idleOpsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, totalFrames]);

  return { frames, loaded, loadedCount };
}
