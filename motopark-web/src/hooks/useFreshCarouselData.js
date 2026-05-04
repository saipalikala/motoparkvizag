// ─────────────────────────────────────────────────────────────────────────────
//  PremiumCarousel — data-fetching pattern
//
//  Drop this hook into your component (or keep it co-located).
//  The key change: freshOnly: true means the carousel NEVER renders
//  from cache — it always waits for the network response.
//  The skeleton is shown in the meantime (you already have .carousel-skeleton).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
// import { cachedFetch } from "./apiCache"; 
//   // adjust path as needed
import { cachedFetch } from "../lib/apiCache";

const CAROUSEL_API = "/api/carousel";       // ← your actual endpoint

/**
 * useFreshCarouselData
 *
 * Always fetches from the network on mount.
 * Returns { slides, loading, error }.
 *
 * Why freshOnly instead of force?
 *   force  = skip cache read but WRITE the result back to cache.
 *   freshOnly = skip cache read AND skip cache write.
 *              Carousel data is ephemeral (Cloudinary URLs can be
 *              deleted at any time), so we don't want it polluting
 *              the session cache for other consumers.
 */
export function useFreshCarouselData() {
  const [slides, setSlides]   = useState(null);   // null = "not yet loaded"
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const abortRef              = useRef(null);

  useEffect(() => {
    // Cancel any in-flight request from a previous render cycle
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    cachedFetch(CAROUSEL_API, {
      freshOnly: true,              // ← THE KEY CHANGE
      signal: controller.signal,
    })
      .then((data) => {
        // Normalise: your API might return { slides: [...] } or just [...]
        setSlides(Array.isArray(data) ? data : data.slides ?? []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return { slides, loading, error };
}


// ─────────────────────────────────────────────────────────────────────────────
//  Inside your PremiumCarousel component, use it like this:
// ─────────────────────────────────────────────────────────────────────────────

/*
export default function PremiumCarousel() {
  const { slides, loading, error } = useFreshCarouselData();

  // 1. Show skeleton while loading — this is what prevents the stale flash.
  //    You already have .carousel-skeleton defined in your CSS.
  if (loading || slides === null) {
    return <div className="carousel-skeleton" aria-hidden="true" />;
  }

  // 2. Graceful error state — don't render a broken carousel
  if (error || slides.length === 0) {
    return null; // or a fallback banner
  }

  // 3. Only reach here once FRESH data is confirmed — no stale images possible
  return (
    <section className="carousel">
      {slides.map((slide, i) => (
        <CarouselSlide key={slide.id ?? i} slide={slide} ... />
      ))}
      ...
    </section>
  );
}
*/


// ─────────────────────────────────────────────────────────────────────────────
//  OPTIONAL: If you want slide images to not flicker even on slow connections,
//  preload them as soon as the data arrives.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Preloads all slide images in parallel.
 * Call this right after setSlides() if you want zero image pop-in.
 *
 * Usage:
 *   .then((data) => {
 *     const fresh = Array.isArray(data) ? data : data.slides ?? [];
 *     preloadSlideImages(fresh).then(() => setSlides(fresh));
 *   })
 *
 * This keeps the skeleton visible until ALL images are in the browser cache.
 * Trade-off: slightly longer skeleton time vs. guaranteed no-flash.
 * Only do this if your slides array is small (≤ 6 images).
 */
export function preloadSlideImages(slides) {
  const urls = slides
    .map((s) => s.image ?? s.imageUrl ?? s.bg ?? null)
    .filter(Boolean);

  return Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload  = resolve;
          img.onerror = resolve; // don't block on broken images
          img.src     = src;
        })
    )
  );
}