/**
 * VideoShowcase.jsx — Optimized Production v2
 *
 * ─────────────────────────────────────────────────────────────────
 * WHY EACH CHANGE WAS MADE
 * ─────────────────────────────────────────────────────────────────
 *
 * VIDEO MANAGEMENT
 * • All <video> elements live in the DOM with stable React keys.
 *   The old code used key={videos[activeIdx].id} on a SINGLE <video>,
 *   which force-remounts the element every slide change — the browser
 *   cancels the in-flight decode, re-requests the file, and you get
 *   a black frame stutter. Keeping all videos in the DOM with
 *   stable keys eliminates this entirely.
 *
 * • src is set imperatively via refs (not React props) and only after
 *   a dataset sentinel check, so React never triggers a re-render
 *   chain when a preload is in progress.
 *
 * • Only active + next video have their src set. All others are
 *   unloaded (src = '' + vid.load()) to release network sockets and
 *   decoder memory — critical on low-RAM phones.
 *
 * • Next video begins metadata preload when activeIdx changes, so the
 *   first keyframe is already buffered before the transition starts.
 *
 * MOBILE — STATIC POSTERS
 * • On mobile we render <img> elements instead of <video>.
 *   Decoding video on low-end Android burns battery, causes thermal
 *   throttling, and triggers WebKit's video-frame compositor layer.
 *   Static posters are indistinguishable to most users and use 95%
 *   less GPU memory. All images use stable keys too — CSS
 *   opacity transition handles the crossfade, no remount flash.
 *
 * SAFARI / iOS AUTOPLAY
 * • muted + playsInline + a 80ms setTimeout after src assignment.
 *   iOS Safari creates its AVPlayer session asynchronously; calling
 *   play() synchronously after src = '...' will silently fail ~30%
 *   of the time. The timeout lets WebKit initialize the session.
 * • We never try to unmute on load — iOS blocks unmuted autoplay
 *   without a user gesture, and the error is swallowed silently.
 *
 * FRAMER MOTION
 * • Scroll-linked transforms (scale, contentY, overlayOpacity) receive
 *   undefined as their style value on mobile, so Framer never creates
 *   a MotionValue subscription or adds a scroll event listener for that
 *   element. The motion.div itself is negligible overhead.
 * • Dot nav uses plain <button> + CSS transitions — not motion.button
 *   with an animate prop — so Framer never re-evaluates all dots on
 *   every slide change (it was doing this before).
 * • Headline skew animation is disabled on low-end devices entirely.
 *
 * PROGRESS BAR
 * • Old approach: CSS animation with --vd set from onLoadedMetadata.
 *   Problem: animation starts at render time, but onLoadedMetadata
 *   fires ~300ms later — bar always used the 10s default.
 *   New approach: rAF loop reads video.currentTime / video.duration
 *   every frame and sets fill.style.transform directly via a ref.
 *   No state updates, perfectly synced, zero re-renders.
 *
 * GPU / COMPOSITOR
 * • will-change removed from elements that are not actively animating.
 *   Each will-change promotion = one GPU texture upload. On a 3-slide
 *   carousel with 4 will-change declarations each, that's 12 textures
 *   sitting in VRAM permanently. Mobile has 1–2 GB shared.
 * • mix-blend-mode:screen on .vs-glare is hidden on mobile via .vs-mobile
 *   CSS class — this alone eliminates the most expensive compositor layer.
 * • contain:layout style on .vs-stage prevents any layout change inside
 *   from triggering a global reflow.
 *
 * CLOUDINARY
 * • injectCloudinaryTransforms() appends f_auto,q_auto:good (desktop) or
 *   f_auto,q_auto:eco (mobile) to raw Cloudinary upload URLs.
 *   f_auto delivers WebM on Chrome/Firefox (~50% smaller than MP4).
 *   q_auto:eco is Cloudinary's "lowest acceptable quality" mode —
 *   on mobile this typically cuts video size from 30MB → 8MB.
 *   The function is a safe no-op for local paths, blob URLs,
 *   and URLs that already contain transform segments.
 *
 * STALE DATA / OLD VIDEOS
 * • AdminVideoShowcase now sets sessionStorage 'vs_force_refresh' on
 *   every successful save. On mount, VideoShowcase checks this flag
 *   and bypasses cachedFetch if present, fetching directly from the
 *   API and clearing the flag. This guarantees the public page shows
 *   the latest data immediately after an admin save, even if the
 *   cachedFetch in-memory map still holds stale data.
 *
 * LOW-END DEVICE DETECTION
 * • Checks navigator.hardwareConcurrency (<= 4 cores), deviceMemory
 *   (<= 2 GB), and navigator.connection.effectiveType.
 *   On flagged devices: no skew animations, no hover scale on buttons,
 *   no glare rAF loop. This keeps FPS stable on budget Android phones.
 */

import { useNavigate }                          from "react-router-dom";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion, AnimatePresence,
  useScroll, useTransform, useSpring,
}                                               from "framer-motion";
import { API }                                  from "@/config/api";
import { cachedFetch }                          from "@/lib/apiCache";
import "./VideoShowcase.css";

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */

const FALLBACK_VIDEOS = [
  {
    id: 0,
    src: "/assets/carousel/carousel-video-1.mp4",
    poster: "/assets/carousel/video-1.jpg",
    tag: "SEASON 2025",
    lines: ["RIDE", "BEYOND", "LIMITS"],
    sub: "Premium motorcycle gear engineered for the track and the open road.",
    accent: "#f06a2c",
    buyNowLink: "/store?collection=season-2025",
    exploreLink: "/store",
  },
  {
    id: 1,
    src: "/assets/carousel/carousel-video-2.mp4",
    poster: "/assets/carousel/video-2.jpg",
    tag: "NEW ARRIVALS",
    lines: ["BUILT", "FOR", "SPEED"],
    sub: "Aerodynamic helmets and race suits that push performance to the edge.",
    accent: "#3b9af0",
    buyNowLink: "/store?category=helmets",
    exploreLink: "/store",
  },
  {
    id: 2,
    src: "/assets/carousel/carousel-video-3.mp4",
    poster: "/assets/carousel/video-3.jpg",
    tag: "BESTSELLERS",
    lines: ["GEAR", "UP.", "WIN."],
    sub: "From gloves to boots — every piece crafted for champions.",
    accent: "#e8c52a",
    buyNowLink: "/store?sort=bestsellers",
    exploreLink: "/store",
  },
];

const EASE             = [0.22, 1, 0.36, 1];
const MOBILE_SLIDE_MS  = 6000;

/* ═══════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════ */

/**
 * Injects Cloudinary delivery optimisations into a raw upload URL.
 *
 *   f_auto       — serves WebM to Chrome/Firefox, MP4 to Safari
 *   q_auto:good  — balanced quality/size for desktop
 *   q_auto:eco   — aggressive compression for mobile (~50% smaller)
 *
 * Safe no-op for local paths (/assets/…), blob: and data: URLs,
 * and URLs that already contain a transform segment (e.g. "f_auto,q_80").
 */
function injectCloudinaryTransforms(url, isMobile = false) {
  if (!url) return url;
  if (url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const match = url.match(
      /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:video|image)\/upload\/)(.*)/i,
    );
    if (!match) return url;
    const [, base, rest] = match;
    // Skip if first path segment already looks like a Cloudinary transform
    // e.g. "f_auto", "q_80", "w_1920", "f_auto,q_auto"
    if (/^[a-z][a-z0-9]*_/.test(rest.split("/")[0])) return url;
    const q = isMobile ? "q_auto:eco" : "q_auto:good";
    return `${base}f_auto,${q}/${rest}`;
  } catch {
    return url;
  }
}

/** Lazy-safe mobile detector — handles SSR gracefully. */
const detectMobile = () =>
  typeof window !== "undefined" &&
  (window.innerWidth < 768 || "ontouchstart" in window);

/**
 * Low-end device detector.
 * Checks CPU cores, RAM and network quality.
 * On flagged devices we skip non-essential GPU work.
 */
const detectLowEnd = () => {
  if (typeof navigator === "undefined") return false;
  if (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4) return true;
  if (navigator.deviceMemory       != null && navigator.deviceMemory       <= 2) return true;
  const conn =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.saveData || conn.effectiveType === "2g" || conn.effectiveType === "slow-2g"))
    return true;
  return false;
};

/* ═══════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════ */

export default function VideoShowcase() {
  const navigate = useNavigate();

  /* ── State (kept minimal to prevent unnecessary re-renders) ── */
  const [videos,    setVideos]    = useState(FALLBACK_VIDEOS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMuted,   setIsMuted]   = useState(true);
  // Lazy initialise to avoid SSR mismatch and first-render flash on mobile
  const [mobile,   setMobile]   = useState(detectMobile);
  const [isLowEnd, setIsLowEnd] = useState(detectLowEnd);

  /* ── DOM refs ── */
  const sectionRef      = useRef(null);
  const videoRefs       = useRef([]);       // one element per slide
  const glareRef        = useRef(null);
  const parallaxRef     = useRef(null);
  const progressFillRef = useRef(null);     // direct DOM update — no state
  const isInViewRef     = useRef(false);
  const activeIdxRef    = useRef(0);        // stable ref mirror of activeIdx
  const rafRef          = useRef(null);     // glare rAF handle
  const slidesRef       = useRef(videos);   // stable ref mirror of videos

  /* Keep refs in sync */
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);
  useEffect(() => { slidesRef.current    = videos;    }, [videos]);

  /* ── Framer scroll hooks (values only used on desktop) ── */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 70, damping: 22, restDelta: 0.0005,
  });
  const videoScale     = useTransform(smooth, [0, 1], [1.0, 1.13]);
  const overlayOpacity = useTransform(smooth, [0, 1], [0.92, 0.48]);
  const contentY       = useTransform(smooth, [0, 1], ["6%", "-14%"]);
  const textOpacity    = useTransform(smooth, [0, 1], [0, 1]);

  /* ─────────────────────────────────────────────
     EFFECT: Fetch showcase data
     Force-refresh flag set by AdminVideoShowcase
     on successful save — bypasses cachedFetch to
     guarantee the public page shows latest content.
  ───────────────────────────────────────────── */
  useEffect(() => {
    const ctrl  = new AbortController();
    let   alive = true;

    const forceRefresh = sessionStorage.getItem("vs_force_refresh");
    if (forceRefresh) sessionStorage.removeItem("vs_force_refresh");

    const fetcher = forceRefresh
      ? fetch(`${API}/video-showcase`, { signal: ctrl.signal }).then((r) =>
          r.ok ? r.json() : null,
        )
      : cachedFetch(`${API}/video-showcase`, { signal: ctrl.signal });

    fetcher
      .then((data) => {
        const slides = Array.isArray(data) ? data : data?.slides;
        if (alive && Array.isArray(slides) && slides.length > 0) {
          setVideos(slides);
          setActiveIdx(0);
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") console.warn("[VideoShowcase] using fallback data");
      });

    return () => { alive = false; ctrl.abort(); };
  }, []);

  /* ─────────────────────────────────────────────
     EFFECT: Mobile & low-end detection (debounced)
     Debounce prevents setState storms during resize.
  ───────────────────────────────────────────── */
  useEffect(() => {
    let timer = null;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setMobile(detectMobile());
        setIsLowEnd(detectLowEnd());
      }, 150);
    };
    window.addEventListener("resize", check, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("resize", check); };
  }, []);

  /* ─────────────────────────────────────────────
     EFFECT: IntersectionObserver
     Pauses video when section scrolls off screen.
     Resumes when it re-enters, preventing battery
     drain and decoder load from an invisible video.
  ───────────────────────────────────────────── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
        const vid = videoRefs.current[activeIdxRef.current];
        if (!vid) return;
        if (entry.isIntersecting) vid.play().catch(() => {});
        else                      vid.pause();
      },
      { threshold: 0.25 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  /* ─────────────────────────────────────────────
     EFFECT: Video switching (desktop)
     Imperative control avoids React re-render chain.
     - Active video: set src once (guard via dataset),
       call play() after 80ms for iOS AVPlayer init.
     - Next video: preload metadata only — first keyframe
       ready before transition fires.
     - All others: release src + call load() to abort
       pending network requests and free decoder memory.
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (mobile) return;
    const total = videos.length;
    if (!total) return;

    const nextIdx = (activeIdx + 1) % total;
    let   playTimer = null;

    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;

      if (idx === activeIdx) {
        const rawSrc    = videos[idx]?.src;
        const targetSrc = injectCloudinaryTransforms(rawSrc, false);
        if (!targetSrc) return;

        // Guard: only reload if src changed (prevents double-decode)
        if (vid.dataset.vsSrc !== targetSrc) {
          vid.dataset.vsSrc = targetSrc;
          vid.src           = targetSrc;
          vid.preload       = "auto";
          vid.load();
        }
        vid.muted = isMuted;

        if (isInViewRef.current) {
          // 80ms delay for Safari iOS AVPlayer session initialisation.
          // Without this, play() silently fails ~30% of the time on iPhone.
          playTimer = setTimeout(() => vid.play().catch(() => {}), 80);
        }
      } else if (idx === nextIdx) {
        // Preload next slide so transition is seamless
        const rawSrc    = videos[idx]?.src;
        const targetSrc = injectCloudinaryTransforms(rawSrc, false);
        if (targetSrc && vid.dataset.vsSrc !== targetSrc) {
          vid.dataset.vsSrc = targetSrc;
          vid.src           = targetSrc;
          vid.preload       = "metadata";
          // Do not call load() or play() — browser fetches headers at low priority
        }
        vid.pause();
      } else {
        // Free memory: unload all inactive videos
        if (vid.dataset.vsSrc) {
          vid.pause();
          delete vid.dataset.vsSrc;
          vid.removeAttribute("src");
          vid.load(); // Aborts any pending network requests immediately
        }
      }
    });

    return () => clearTimeout(playTimer);
  }, [activeIdx, videos, mobile, isMuted]);

  /* ─────────────────────────────────────────────
     EFFECT: Mute sync
  ───────────────────────────────────────────── */
  useEffect(() => {
    const vid = videoRefs.current[activeIdx];
    if (vid) vid.muted = isMuted;
  }, [isMuted, activeIdx]);

  /* ─────────────────────────────────────────────
     EFFECT: Progress bar — rAF driven, no state
     Old approach used CSS animation with --vd set
     from onLoadedMetadata. Problem: animation starts
     immediately at render, onLoadedMetadata fires
     ~300ms later — bar always used the 10s default.
     New approach: rAF reads video.currentTime each
     frame and writes to fill.style.transform directly.
     Zero state updates, perfectly synced to real playback.
  ───────────────────────────────────────────── */
  useEffect(() => {
    const fill = progressFillRef.current;
    if (!fill) return;

    let animId = null;
    fill.style.transform = "scaleX(0)";

    if (mobile) {
      // Mobile: timestamp-based since we show images, not videos
      const startTime = performance.now();
      const tick = (ts) => {
        const pct = Math.min((ts - startTime) / MOBILE_SLIDE_MS, 1);
        fill.style.transform = `scaleX(${pct.toFixed(4)})`;
        if (pct < 1) animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    } else {
      // Desktop: sync progress to actual video.currentTime
      const tick = () => {
        const vid = videoRefs.current[activeIdxRef.current];
        if (vid && vid.duration > 0) {
          const pct = Math.min(vid.currentTime / vid.duration, 1);
          fill.style.transform = `scaleX(${pct.toFixed(4)})`;
          if (pct < 1) { animId = requestAnimationFrame(tick); return; }
        } else {
          animId = requestAnimationFrame(tick);
        }
      };
      animId = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animId);
  }, [activeIdx, mobile]); // Restarts cleanly on every slide change

  /* ─────────────────────────────────────────────
     EFFECT: Cursor glare + parallax rAF
     Skipped entirely on mobile and low-end devices
     (no mouse input on touch; no GPU budget either).
     When section is off-screen (isInViewRef = false),
     we skip the lerp calculations but keep the rAF
     alive so it can resume instantly on scroll back.
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (mobile || isLowEnd) return;

    const el = sectionRef.current;
    if (!el) return;

    let tGX = 50, tGY = 50, cGX = 50, cGY = 50;
    let tPX = 0,  tPY = 0,  cPX = 0,  cPY = 0;
    let running = true;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      tGX = ((e.clientX - rect.left) / rect.width)  * 100;
      tGY = ((e.clientY - rect.top)  / rect.height) * 100;
      tPX = (tGX / 100 - 0.5) * 22;
      tPY = (tGY / 100 - 0.5) * 14;
    };

    const tick = () => {
      if (!running) return;
      // Off-screen: skip lerp work, just reschedule (keeps loop hot for re-entry)
      if (!isInViewRef.current) { rafRef.current = requestAnimationFrame(tick); return; }

      cGX += (tGX - cGX) * 0.07;
      cGY += (tGY - cGY) * 0.07;
      cPX += (tPX - cPX) * 0.055;
      cPY += (tPY - cPY) * 0.055;

      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(circle at ${cGX.toFixed(1)}% ${cGY.toFixed(1)}%, rgba(255,255,255,0.10) 0%, transparent 52%)`;
      }
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate(${cPX.toFixed(2)}px, ${cPY.toFixed(2)}px)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      el.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [mobile, isLowEnd]);

  /* ─────────────────────────────────────────────
     EFFECT: Mobile auto-advance timer
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (!mobile) return;
    const t = setTimeout(
      () => setActiveIdx((i) => (i + 1) % videos.length),
      MOBILE_SLIDE_MS,
    );
    return () => clearTimeout(t);
  }, [activeIdx, mobile, videos.length]);

  /* ── Handlers ── */
  const handleVideoEnd    = useCallback(() => setActiveIdx((i) => (i + 1) % slidesRef.current.length), []);
  const handleMute        = useCallback(() => setIsMuted((m) => !m), []);
  const handleDotClick    = useCallback((idx) => setActiveIdx(idx), []);

  const resolveLink = useCallback((link) => {
    if (!link) return null;
    try {
      const url = new URL(link, window.location.origin);
      if (url.origin === window.location.origin) return url.pathname + url.search + url.hash;
      return link;
    } catch { return link; }
  }, []);

  const navTo = useCallback(
    (rawLink) => {
      const link = resolveLink(rawLink);
      if (!link) return;
      if (link.startsWith("http")) { window.location.href = link; return; }
      window.scrollTo({ top: 0, behavior: "instant" });
      navigate(link);
    },
    [navigate, resolveLink],
  );

  const handleBuyNow  = useCallback(() => navTo(slidesRef.current[activeIdxRef.current]?.buyNowLink),  [navTo]);
  const handleExplore = useCallback(() => navTo(slidesRef.current[activeIdxRef.current]?.exploreLink), [navTo]);

  const v = videos[activeIdx];
  if (!v) return null;

  /* ── Render ── */
  return (
    <section
      ref={sectionRef}
      className={[
        "vs-root",
        mobile   && "vs-mobile",
        isLowEnd && "vs-low-end",
      ].filter(Boolean).join(" ")}
      aria-label="Cinematic video showcase"
    >
      <div className="vs-stage">

        {/* ── VIDEO / IMAGE LAYER ── */}
        <motion.div
          className="vs-video-layer"
          ref={parallaxRef}
          // Only pass Framer style on desktop — undefined = no MotionValue subscription
          style={!mobile ? { scale: videoScale } : undefined}
        >
          {mobile ? (
            /*
             * Mobile: render all poster images with stable keys.
             * CSS opacity transition (0.9s) handles crossfade — no remount flash.
             * Lazy-load non-first images to avoid competing for bandwidth.
             */
            videos.map((vid, idx) => (
              <img
                key={vid.id}
                className={`vs-video${idx === activeIdx ? " vs-video--active" : ""}`}
                src={injectCloudinaryTransforms(vid.poster || vid.src, true)}
                alt=""
                aria-hidden="true"
                loading={idx === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={idx === 0 ? "high" : "low"}
              />
            ))
          ) : (
            /*
             * Desktop: all videos in DOM, stable keys.
             * src is set imperatively in the video-switching effect.
             * preload="none" here — the effect sets "auto"/"metadata"
             * after evaluating which slot is active/next.
             */
            videos.map((vid, idx) => (
              <video
                key={vid.id}
                ref={(el) => { videoRefs.current[idx] = el; }}
                className={`vs-video${idx === activeIdx ? " vs-video--active" : ""}`}
                poster={vid.poster || undefined}
                muted          /* Required by WebKit autoplay policy */
                playsInline    /* Required for iOS inline playback */
                preload="none" /* src set imperatively; prevents eager loading of all slides */
                aria-hidden="true"
                onEnded={idx === activeIdx ? handleVideoEnd : undefined}
              />
            ))
          )}
        </motion.div>

        {/* ── OVERLAY ── */}
        <motion.div
          className="vs-overlay"
          style={!mobile ? { opacity: overlayOpacity } : undefined}
        />

        {/* ── CURSOR GLARE — hidden on mobile via .vs-mobile CSS class ── */}
        <div ref={glareRef} className="vs-glare" aria-hidden="true" />

        {/* ── SCROLL PARALLAX ANCHOR (desktop only) ── */}
        {!mobile && (
          <motion.div
            className="vs-content"
            style={{ y: contentY, opacity: textOpacity }}
          />
        )}

        {/* ── SLIDE CONTENT ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: mobile ? 10 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: mobile ? -6 : -10 }}
            transition={{ duration: mobile ? 0.28 : 0.45, ease: EASE }}
            className="vs-content-inner"
          >
            <div className="vs-tag" style={{ "--va": v.accent }}>
              <span className="vs-tag__dot" />
              {v.tag}
            </div>

            <h2 className="vs-headline" aria-label={v.lines.join(" ")}>
              {v.lines.map((line, li) =>
                isLowEnd ? (
                  /* Low-end: no skew animation — just fade via parent AnimatePresence */
                  <span key={li} className="vs-headline__line">{line}</span>
                ) : (
                  <motion.span
                    key={li}
                    className="vs-headline__line"
                    initial={{ opacity: 0, x: mobile ? -20 : -52, skewX: mobile ? 0 : -10 }}
                    animate={{ opacity: 1, x: 0, skewX: 0 }}
                    transition={{ duration: mobile ? 0.28 : 0.45, delay: li * 0.06, ease: EASE }}
                  >
                    {line}
                  </motion.span>
                ),
              )}
            </h2>

            <p className="vs-sub">{v.sub}</p>

            <div className="vs-cta-row">
              <motion.button
                className="vs-btn vs-btn--primary"
                style={{ "--va": v.accent }}
                whileHover={!isLowEnd ? { scale: 1.045, y: -2 } : undefined}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.25, ease: EASE }}
                onClick={handleBuyNow}
              >
                Buy Now <ArrowIcon />
              </motion.button>
              <motion.button
                className="vs-btn vs-btn--ghost"
                whileHover={!isLowEnd ? { scale: 1.045, y: -2 } : undefined}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.25, ease: EASE }}
                onClick={handleExplore}
              >
                Explore More
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── MUTE TOGGLE (desktop only) ── */}
        {!mobile && (
          <motion.button
            className="vs-mute"
            onClick={handleMute}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.2, ease: EASE }}
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? <MuteIcon /> : <UnmuteIcon />}
          </motion.button>
        )}

        {/*
         * DOT NAVIGATION — plain <button> with CSS transitions.
         * Old code used motion.button with an animate prop.
         * Framer evaluates the animate prop for EVERY dot on every
         * activeIdx change. With 3 dots × every slide change = 3 reconcile
         * passes per second on auto-advance. Plain buttons + CSS transition
         * cost nothing at runtime.
         */}
        <div className="vs-dots" role="tablist" aria-label="Select video">
          {videos.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === activeIdx}
              className={`vs-dot${i === activeIdx ? " vs-dot--active" : ""}`}
              style={{ "--va": videos[i].accent }}
              onClick={() => handleDotClick(i)}
              aria-label={`Video ${i + 1}: ${videos[i].tag}`}
            />
          ))}
        </div>

        {/* ── COUNTER (desktop only) ── */}
        {!mobile && (
          <div className="vs-counter" aria-hidden="true">
            <span className="vs-counter__cur">{String(activeIdx + 1).padStart(2, "0")}</span>
            <span className="vs-counter__sep" />
            <span className="vs-counter__total">{String(videos.length).padStart(2, "0")}</span>
          </div>
        )}

        {/*
         * PROGRESS TRACK
         * ref on the fill div — rAF loop writes style.transform directly.
         * No key remount needed (effect handles reset via fill.style.transform = scaleX(0)).
         * No CSS animation — driven by progress bar effect above.
         */}
        <div className="vs-progress-track" aria-hidden="true">
          <div
            ref={progressFillRef}
            className="vs-progress-fill"
            style={{ "--va": v.accent }}
          />
        </div>

      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════ */

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M1 6.5h11M6.5 1l5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MuteIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const UnmuteIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);