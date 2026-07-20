/**
 * cinematicUtils.js — shared canvas utilities for the cinematic engine.
 *
 * These functions are intentionally framework-free (no React, no GSAP) so they
 * can be unit-tested in isolation and reused across any cinematic section.
 */

/**
 * Draw `img` onto `ctx` with "object-fit: cover" semantics.
 * The image fills the canvas entirely, cropped symmetrically on the longer axis.
 *
 * Supports both HTMLImageElement  (has .naturalWidth / .naturalHeight)
 * and      ImageBitmap            (has .width / .height — no naturalXxx).
 *
 * @param {CanvasRenderingContext2D}       ctx
 * @param {HTMLImageElement|ImageBitmap}  img
 * @param {{ clear?: boolean }}           [opts]
 *   clear — whether to clearRect before drawing (default true).
 *   Pass { clear: false } when drawing a second frame on top for cross-blending.
 */
export function drawImageCover(ctx, img, { clear = true } = {}) {
  if (!ctx || !img) return;

  // ImageBitmap uses .width/.height; HTMLImageElement uses .naturalWidth/.naturalHeight
  const iw = img.naturalWidth  ?? img.width;
  const ih = img.naturalHeight ?? img.height;
  if (!iw || !ih) return;

  const { width: cw, height: ch } = ctx.canvas;
  if (!cw || !ch) return;

  const scale = Math.max(cw / iw, ch / ih);
  const dw    = iw * scale;
  const dh    = ih * scale;
  const dx    = (cw - dw) / 2;
  const dy    = (ch - dh) / 2;

  if (clear) ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Compute an overlay's opacity for a given scroll `progress` [0, 1].
 * Fades in from `startProgress` → `peakProgress`, fades out to `endProgress`.
 *
 * @param {number} progress     Current scroll progress [0, 1]
 * @param {number} startProgress
 * @param {number} peakProgress
 * @param {number} endProgress
 * @returns {number} opacity [0, 1]
 */
export function overlayOpacity(progress, startProgress, peakProgress, endProgress) {
  if (progress < startProgress || progress > endProgress) return 0;
  if (progress <= peakProgress) {
    return (progress - startProgress) / (peakProgress - startProgress);
  }
  return 1 - (progress - peakProgress) / (endProgress - peakProgress);
}

/**
 * Zero-pad a 1-based frame number and build the full URL.
 *
 * @param {string} base    URL prefix,     e.g. '/cinematic/sequence/ezgif-frame-'
 * @param {string} ext     Suffix,         e.g. '.jpg'
 * @param {number} padding Zero-pad width, e.g. 3 → '001'
 * @param {number} idx0    0-based index
 * @returns {string}
 */
export function frameUrl(base, ext, padding, idx0) {
  return `${base}${String(idx0 + 1).padStart(padding, '0')}${ext}`;
}
