import { useEffect, useRef } from 'react';
import { drawImageCover } from './cinematicUtils.js';

/**
 * SequenceCanvas — controlled canvas that renders an HTMLImageElement
 * with "object-fit: cover" semantics.
 *
 * USE THIS WHEN: the parent just wants to pass a `frame` prop and have the
 * canvas manage itself. Uses a ResizeObserver to stay at the correct physical
 * pixel resolution.
 *
 * WHEN NOT TO USE: if the parent needs direct ctx access for scroll-driven
 * rendering (no React state, 60 FPS), own the canvas directly and call
 * `drawImageCover(ctx, img)` from `cinematicUtils.js` instead.
 *
 * @param {HTMLImageElement|null} frame   Current frame to render
 * @param {string}                [className]
 * @param {object}                [style]
 */
export default function SequenceCanvas({ frame, className, style }) {
  const canvasRef = useRef(null);
  const ctxRef    = useRef(null);

  // Initialise context + ResizeObserver once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function syncSize() {
      const w = Math.round(canvas.clientWidth  * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
        // Invalidated by resize — rebuild context reference.
        ctxRef.current = canvas.getContext('2d');
        // Redraw the current frame at the new size immediately.
        if (ctxRef.current && frame) drawImageCover(ctxRef.current, frame);
      }
    }

    ctxRef.current = canvas.getContext('2d');

    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize();

    return () => ro.disconnect();
  // frame is intentionally excluded: we redraw it in the effect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw whenever the frame prop changes.
  useEffect(() => {
    if (ctxRef.current && frame) drawImageCover(ctxRef.current, frame);
  }, [frame]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
}
