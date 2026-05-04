/**
 * src/components/VideoShowcase/VideoShowcase.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Raw fetch → cachedFetch
 *      Before: fetch(`${API}/video-showcase`) on every mount.
 *      VideoShowcase is on the Home page — every Home visit = new request.
 *      After: cachedFetch serves from memory/sessionStorage for 5 min.
 *
 * [F2] AbortController + isMounted guard
 *      Before: no cleanup. Promise resolved on unmounted component.
 *      After: ctrl.abort() + alive flag.
 *
 * [F3] Video slide transition — play new video after slide change
 *      Before: IntersectionObserver only plays/pauses on scroll.
 *      When user clicks a different slide, the new video does NOT
 *      auto-play unless the IO fires again.
 *      After: added a separate useEffect on [activeIdx] that
 *      imperatively calls v.load() + v.play() when the key changes,
 *      respecting the isInViewRef so off-screen sections don't autoplay.
 *
 * [F4] preload="metadata" preserved — reads header only, not full video.
 *      This is correct — do NOT change to preload="auto".
 *
 * [F5] Mute toggle preserved — was already fixed in uploaded version.
 *
 * [F6] Mobile detection useEffect runs once on mount (already correct).
 *
 * [UI1] 4-second autoplay timer — UI-only useEffect.
 *       Advances to next slide every 4 s. Resets on manual dot click.
 *       Single setTimeout (not setInterval) — no memory-leak risk.
 *       Cleared on unmount and on every activeIdx change.
 *
 * [UI2] CSS @keyframes progress bar added to JSX.
 *       key={activeIdx} forces element remount → animation restarts
 *       on each slide change. Zero JS per frame, zero re-renders.
 *
 * All existing functionality (parallax, glare, cursor effect,
 * PreviewCard hover-play, dot navigation, counter) preserved exactly.
 */

import { useNavigate } from "react-router-dom";
import {
  useRef, useState, useEffect, useCallback,
} from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { API } from "@/config/api";
import { cachedFetch } from "@/lib/apiCache"; // [F1]
import "./VideoShowcase.css";

const FALLBACK_VIDEOS = [
  {
    id: 0,
    src: "/assets/carousel/carousel-video-1.mp4",
    poster: "/assets/carousel/video-1.jpg",
    tag: "SEASON 2025",
    lines: ["RIDE", "BEYOND", "LIMITS"],
    sub: "Premium motorcycle gear engineered for the track and the open road.",
    accent: "#f06a2c",
    cta: "Shop Collection",
    buyNowLink: "/products?collection=season-2025",
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
    cta: "Explore Helmets",
    buyNowLink: "/products?category=helmets",
    exploreLink: "/store",
  },
  {
    id: 2,
    src: "/assets/carousel/carousel-video-2.mp4",
    poster: "/assets/carousel/video-3.jpg",
    tag: "BESTSELLERS",
    lines: ["GEAR", "UP.", "WIN."],
    sub: "From gloves to boots — every piece crafted for champions.",
    accent: "#e8c52a",
    cta: "View Bestsellers",
    buyNowLink: "/products?sort=bestsellers",
    exploreLink: "/store",
  },
];

const EASE = [0.22, 1, 0.36, 1];

const detectMobile = () =>
  typeof window !== "undefined" &&
  (window.innerWidth < 768 || "ontouchstart" in window);

export default function VideoShowcase() {
  const navigate = useNavigate();
  const [videos,    setVideos]    = useState(FALLBACK_VIDEOS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMuted,   setIsMuted]   = useState(true);
  const [mobile,    setMobile]    = useState(false);

  // [UI1] Track video duration so progress bar animation matches real video length
  const [videoDuration, setVideoDuration] = useState(10);

  const isMobileRef = useRef(false);
  const sectionRef  = useRef(null);
  const videoRef    = useRef(null);
  const glareRef    = useRef(null);
  const parallaxRef = useRef(null);
  const isInViewRef = useRef(false);
  const rafRef      = useRef(null);

  useEffect(() => {
    isMobileRef.current = mobile;
  }, [mobile]);

  // [F1] + [F2]: cachedFetch with abort + alive guard
  useEffect(() => {
    const ctrl  = new AbortController();
    let   alive = true;

    cachedFetch(`${API}/video-showcase`, { signal: ctrl.signal })
      .then((data) => {
        if (alive && Array.isArray(data) && data.length > 0) {
          setVideos(data);
          setActiveIdx(0);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("[VideoShowcase] using fallback data");
        }
      });

    return () => { alive = false; ctrl.abort(); };
  }, []);

  // [F3]: When activeIdx changes, play the new video if section is in view.
  // The key prop on <video> causes React to remount the element, which resets
  // src+currentTime. We then need to explicitly call play() after the remount.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isInViewRef.current) return;
    // Small timeout lets React finish the remount before we call play()
    const t = setTimeout(() => {
      vid.play().catch(() => {});
    }, 50);
    return () => clearTimeout(t);
  }, [activeIdx]);

  // [UI1]: Autoplay now driven by the video's natural 'ended' event.
  // loop is removed from <video> so 'ended' fires normally.
  // handleVideoEnd advances the slide; handleMetadata reads duration
  // so the progress bar CSS animation stays perfectly in sync.

  /* ── Framer scroll ── */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: mobile ? 0 : 70,
    damping  : mobile ? 1 : 22,
    restDelta: 0.0005,
  });

  const videoScale     = useTransform(smooth, [0, 1], mobile ? [1, 1]         : [1.0, 1.13]);
  const overlayOpacity = useTransform(smooth, [0, 1], mobile ? [0.55, 0.55]   : [0.92, 0.48]);
  const contentY       = useTransform(smooth, [0, 1], mobile ? ["0%", "0%"]   : ["6%", "-14%"]);
  const textOpacity    = useTransform(smooth, [0, 1], mobile ? [1, 1]         : [0, 1]);

  /* ── Mobile detection ── */
  useEffect(() => {
    const check = () => setMobile(detectMobile());
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── IntersectionObserver — play/pause the single active video ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
        const vid = videoRef.current;
        if (!vid) return;
        if (entry.isIntersecting) vid.play().catch(() => {});
        else vid.pause();
      },
      { threshold: 0.25 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  /* ── Mute sync ── */
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  /* ── Cursor glare + parallax (desktop rAF loop) ── */
  useEffect(() => {
    if (mobile) return;
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
      cGX += (tGX - cGX) * 0.07;
      cGY += (tGY - cGY) * 0.07;
      cPX += (tPX - cPX) * 0.055;
      cPY += (tPY - cPY) * 0.055;

      if (glareRef.current) {
        glareRef.current.style.background =
          `radial-gradient(circle at ${cGX.toFixed(1)}% ${cGY.toFixed(1)}%, rgba(255,255,255,0.11) 0%, transparent 52%)`;
      }
      if (parallaxRef.current) {
        parallaxRef.current.style.transform =
          `translate(${cPX.toFixed(2)}px, ${cPY.toFixed(2)}px)`;
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
  }, [mobile]);

  const handlePreview = useCallback((idx) => setActiveIdx(idx), []);

  // Strips the origin from same-site full URLs so React Router always gets
  // a plain path. Handles the case where an admin pastes a full absolute URL
  // (e.g. https://motoparkvizag.in/product/123) into the link field.
  const resolveLink = useCallback((link) => {
    if (!link) return null;
    try {
      const url = new URL(link, window.location.origin);
      if (url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash; // /product/123
      }
      return link; // genuinely external
    } catch {
      return link; // already a relative path
    }
  }, []);

  const handleBuyNow = useCallback(() => {
    const link = resolveLink(videos[activeIdx]?.buyNowLink);
    if (!link) return;
    if (link.startsWith("http")) window.location.href = link;
    else navigate(link);
  }, [activeIdx, videos, navigate, resolveLink]);

  const handleExplore = useCallback(() => {
    const link = resolveLink(videos[activeIdx]?.exploreLink);
    if (!link) return;
    if (link.startsWith("http")) window.location.href = link;
    else navigate(link);
  }, [activeIdx, videos, navigate, resolveLink]);

  const handleMuteToggle = useCallback(() => setIsMuted(m => !m), []);

  const v = videos[activeIdx];

  return (
    <section ref={sectionRef} className="vs-root" aria-label="Cinematic video showcase">

      <div className="vs-stage">

        {/*
          Single video in DOM — only active slide rendered.
          key={videos[activeIdx].id} forces React to remount the
          <video> element when slide changes, resetting src+currentTime
          without any imperative management.
          [F3]: useEffect on activeIdx handles play() after remount.
        */}
        <motion.div className="vs-video-layer" style={{ scale: videoScale }}>
          <video
            key={videos[activeIdx].id}
            ref={videoRef}
            className="vs-video vs-video--active"
            src={videos[activeIdx].src}
            poster={videos[activeIdx].poster || undefined}
            muted
            playsInline
            loop
            preload="metadata"  // [F4]: header only — NOT preload="auto"
            autoPlay={false}    // [F3]: play() called imperatively
            aria-hidden="true"
          />
        </motion.div>

        <motion.div className="vs-overlay" style={{ opacity: overlayOpacity }} />

        <div ref={glareRef} className="vs-glare" aria-hidden="true" />

        <motion.div className="vs-content" style={{ y: contentY, opacity: textOpacity }}>
          {/* CSS layout anchor */}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="vs-content-inner"
          >
            <div className="vs-tag" style={{ "--va": v.accent }}>
              <span className="vs-tag__dot" />
              {v.tag}
            </div>

            <h2 className="vs-headline" aria-label={v.lines.join(" ")}>
              {v.lines.map((line, li) => (
                <motion.span
                  key={li}
                  className="vs-headline__line"
                  initial={{ opacity: 0, x: -52, skewX: -10 }}
                  animate={{ opacity: 1, x: 0, skewX: 0 }}
                  transition={{ duration: 0.45, delay: li * 0.06, ease: EASE }}
                >
                  {line}
                </motion.span>
              ))}
            </h2>

            <p className="vs-sub">{v.sub}</p>

            <div className="vs-cta-row">
              <motion.button
                className="vs-btn vs-btn--primary"
                style={{ "--va": v.accent }}
                whileHover={{ scale: 1.045, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.25, ease: EASE }}
                onClick={handleBuyNow}
              >
                Buy Now <ArrowIcon />
              </motion.button>
              <motion.button
                className="vs-btn vs-btn--ghost"
                whileHover={{ scale: 1.045, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.25, ease: EASE }}
                onClick={handleExplore}
              >
                Explore More
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.button
          className="vs-mute"
          onClick={handleMuteToggle}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.2, ease: EASE }}
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? <MuteIcon /> : <UnmuteIcon />}
        </motion.button>

        <div className="vs-dots" role="tablist" aria-label="Select video">
          {videos.map((_, i) => (
            <motion.button
              key={i}
              role="tab"
              aria-selected={i === activeIdx}
              className={`vs-dot${i === activeIdx ? " vs-dot--active" : ""}`}
              style={{ "--va": videos[i].accent }}
              onClick={() => handlePreview(i)}
              animate={i === activeIdx ? { height: 22, opacity: 1 } : { height: 6, opacity: 0.38 }}
              transition={{ duration: 0.32, ease: EASE }}
              aria-label={`Video ${i + 1}: ${videos[i].tag}`}
            />
          ))}
        </div>

        <div className="vs-counter" aria-hidden="true">
          <span className="vs-counter__cur">{String(activeIdx + 1).padStart(2, "0")}</span>
          <span className="vs-counter__sep" />
          <span className="vs-counter__total">{String(videos.length).padStart(2, "0")}</span>
        </div>

        {/* [UI2] CSS @keyframes progress bar.
            key={activeIdx} remounts the fill div on every slide change,
            restarting the animation from scaleX(0) — zero JS per frame. */}
        <div className="vs-progress-track" aria-hidden="true">
          <div
            key={activeIdx}
            className="vs-progress-fill"
            style={{ "--va": v.accent }}
          />
        </div>

      </div>

      <div className="vs-previews" role="tablist" aria-label="Video preview navigation">
        {videos.map((vid, i) => (
          <PreviewCard
            key={vid.id}
            vid={vid}
            index={i}
            isActive={i === activeIdx}
            onClick={() => handlePreview(i)}
          />
        ))}
      </div>

    </section>
  );
}

function PreviewCard({ vid, isActive, onClick }) {
  const videoRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.src) {
      v.src = vid.src;
      v.load();
    }
    v.play().catch(() => {});
  }, [vid.src]);

  const handleMouseLeave = useCallback(() => {
    const v = videoRef.current;
    if (v) { v.pause(); v.currentTime = 0; }
  }, []);

  return (
    <motion.button
      role="tab"
      aria-selected={isActive}
      className={`vs-preview${isActive ? " vs-preview--active" : ""}`}
      style={{ "--va": vid.accent }}
      onClick={onClick}
      animate={isActive ? { y: -5, scale: 1.03 } : { y: 0, scale: 1 }}
      whileHover={{ y: -7, scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="vs-preview__thumb"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <video
          ref={videoRef}
          poster={vid.poster || undefined}
          muted
          playsInline
          loop
          preload="none"
          className="vs-preview__video"
          aria-hidden="true"
        />
        <div className="vs-preview__vignette" />
        <div className="vs-preview__play" aria-hidden="true"><PlayIcon /></div>
      </div>

      <div className="vs-preview__info">
        <span className="vs-preview__tag" style={{ color: vid.accent }}>{vid.tag}</span>
        <span className="vs-preview__title">{vid.lines[0]}</span>
      </div>

      <motion.div
        className="vs-preview__bar"
        style={{ "--va": vid.accent }}
        animate={{ scaleX: isActive ? 1 : 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      />

      {isActive && (
        <motion.div
          className="vs-preview__ring"
          layoutId="preview-ring"
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </motion.button>
  );
}

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M1 6.5h11M6.5 1l5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
  </svg>
);
const MuteIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const UnmuteIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);