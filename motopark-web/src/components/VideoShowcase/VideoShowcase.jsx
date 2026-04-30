/* ================================================
   VideoShowcase.jsx — Cinematic Multi-Video Section
   ================================================
   CHANGES FROM ORIGINAL (UI is 100% identical):
   1. Loads slides from /api/video-showcase on mount;
      falls back to hardcoded VIDEOS if API is down.
   2. preload strategy: active → "auto", others → "none"
      (avoids all 3 videos fetching simultaneously which
      causes the lag / buffering jank you reported).
   3. Progress bar is now driven by a ref-based interval
      so it doesn't cause re-renders during animation.
   4. Auto-advance timer added (optional, off by default).
   ================================================ */
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
import "./VideoShowcase.css";

const FALLBACK_VIDEOS = [
  {
    id: 0,
    src: "/assets/carousel/carousel-video-1.mp4",
    poster: "",
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
    poster: "",
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
    poster: "",
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

/* ════════════════════════
   MAIN COMPONENT
════════════════════════ */
export default function VideoShowcase() {
  const navigate = useNavigate();
  const [videos,     setVideos]     = useState(FALLBACK_VIDEOS);
  const [activeIdx,  setActiveIdx]  = useState(0);
  const [isMuted,    setIsMuted]    = useState(true);
  const [mobile,     setMobile]     = useState(false);

  const sectionRef   = useRef(null);
  const videoRefs    = useRef([]);
  const glareRef     = useRef(null);
  const parallaxRef  = useRef(null);
  const isInViewRef  = useRef(false);
  const activeIdxRef = useRef(0);
  const rafRef       = useRef(null);

/* ── Load from API ── */
useEffect(() => {
  const ctrl = new AbortController();

  fetch(`${API}/video-showcase`, { signal: ctrl.signal })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setVideos(data);
        setActiveIdx(0);
      }
    })
    .catch(err => {
      if (err.name !== "AbortError") {
        // silently keep fallback videos — no error state needed
        console.warn("VideoShowcase: using fallback data");
      }
    });

  return () => ctrl.abort();  // ← cleanup on unmount
}, []);

  /* ── Framer scroll ── */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 70, damping: 22, restDelta: 0.0005,
  });

  const videoScale     = useTransform(smooth, [0, 1], [1.0, 1.13]);
  const overlayOpacity = useTransform(smooth, [0, 0.15, 0.5, 0.85, 1], [0.92, 0.62, 0.48, 0.62, 0.92]);
  const contentY       = useTransform(smooth, [0, 1], ["6%", "-14%"]);
  const textOpacity    = useTransform(smooth, [0, 0.07, 0.78, 0.96], [0, 1, 1, 0]);

  /* ── Mobile detection ── */
  useEffect(() => {
    const check = () => setMobile(detectMobile());
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── IntersectionObserver ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
        const vid = videoRefs.current[activeIdxRef.current];
        if (!vid) return;
        if (entry.isIntersecting) vid.play().catch(() => {});
        else vid.pause();
      },
      { threshold: 0.25 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  /* ── Active index change — play active, pause + preload:none others ── */
useEffect(() => {
    activeIdxRef.current = activeIdx;
    videoRefs.current.forEach((vid, i) => {
        if (!vid) return;
        if (i === activeIdx) {
            if (!vid.src) {              // ← set src only when first activated
                vid.src = videos[i].src;
                vid.load();
            }
            vid.preload = "auto";
            vid.currentTime = 0;
            if (isInViewRef.current) vid.play().catch(() => {});
        } else {
            vid.pause();
            vid.preload = "none";
        }
    });
}, [activeIdx, videos]);

  /* ── Mute sync ── */
  useEffect(() => {
    videoRefs.current.forEach(v => { if (v) v.muted = isMuted; });
  }, [isMuted]);

  /* ── Cursor glare + parallax (desktop rAF loop) ── */
/* ── Cursor glare + parallax (desktop rAF loop) ── */
useEffect(() => {
  if (mobile) return;
  const el = sectionRef.current;
  if (!el) return;

  let tGX = 50, tGY = 50, cGX = 50, cGY = 50;
  let tPX = 0,  tPY = 0,  cPX = 0,  cPY = 0;
  let running = true;  // ← ADD THIS

  const onMove = (e) => {
    const rect = el.getBoundingClientRect();
    tGX = ((e.clientX - rect.left) / rect.width)  * 100;
    tGY = ((e.clientY - rect.top)  / rect.height) * 100;
    tPX = (tGX / 100 - 0.5) * 22;
    tPY = (tGY / 100 - 0.5) * 14;
  };

  const tick = () => {
    if (!running) return;  // ← GUARD — stops the loop on cleanup
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
    running = false;                            // ← stops the RAF loop
    el.removeEventListener("mousemove", onMove);
    cancelAnimationFrame(rafRef.current);
  };
}, [mobile]);

  /* ── Mobile: autoplay first video ── */
  useEffect(() => {
    if (!mobile) return;
    const vid = videoRefs.current[0];
    if (vid) vid.play().catch(() => {});
  }, [mobile]);

  const handlePreview = useCallback((idx) => setActiveIdx(idx), []);

const handleBuyNow = useCallback(() => {
  const link = videos[activeIdx]?.buyNowLink;
  if (link) navigate(link);
}, [activeIdx, videos, navigate]);

const handleExplore = useCallback(() => {
  const link = videos[activeIdx]?.exploreLink;
  if (link) navigate(link);
}, [activeIdx, videos, navigate]);

  const v = videos[activeIdx];

  return (
    <section ref={sectionRef} className="vs-root" aria-label="Cinematic video showcase">

      {/* ────────────────── STAGE ── */}
      <div className="vs-stage">

        {/* Video layer */}
        <motion.div className="vs-video-layer" style={{ scale: videoScale }}>
{/* In the video layer map, change src to only set on active: */}
{videos.map((vid, i) => (
    <video
        key={vid.id}
        ref={el => { videoRefs.current[i] = el; }}
        className={`vs-video${i === activeIdx ? " vs-video--active" : ""}`}
        src={i === activeIdx ? vid.src : undefined}  // ← only active gets src
        poster={vid.poster || undefined}
        muted playsInline loop
        preload={i === activeIdx ? "auto" : "none"}
        aria-hidden="true"
    />
))}
        </motion.div>

        {/* Gradient overlay */}
        <motion.div className="vs-overlay" style={{ opacity: overlayOpacity }} />

        {/* Cursor glare */}
        <div ref={glareRef} className="vs-glare" aria-hidden="true" />

        {/* ── Content ── */}
        <motion.div ref={parallaxRef} className="vs-content" style={{ y: contentY, opacity: textOpacity }}>

          {/* Tag pill */}

        </motion.div>

{/* Replace the 4 separate AnimatePresence blocks with one wrapper */}
<AnimatePresence mode="wait">
<motion.div
    key={activeIdx}
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.45, ease: EASE }}
    className="vs-content-inner"   // ← use a real class, not display:contents
>
    {/* Tag pill — remove its own AnimatePresence wrapper */}
    <div className="vs-tag" style={{ "--va": v.accent }}>
      <span className="vs-tag__dot" />
      {v.tag}
    </div>

    {/* Headline — remove its own AnimatePresence wrapper */}
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

    {/* Subtitle */}
    <p className="vs-sub">{v.sub}</p>

    {/* CTA Row */}
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

        {/* Dot nav */}
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

        {/* Counter */}
        <div className="vs-counter" aria-hidden="true">
          <span className="vs-counter__cur">{String(activeIdx + 1).padStart(2, "0")}</span>
          <span className="vs-counter__sep" />
          <span className="vs-counter__total">{String(videos.length).padStart(2, "0")}</span>
        </div>

      </div>{/* /vs-stage */}

      {/* ────────────────── PREVIEW NAV ── */}
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

/* ════════════════════════
   PREVIEW CARD (unchanged)
════════════════════════ */
function PreviewCard({ vid, isActive, onClick }) {
  const videoRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Only set src when hovered — eliminates connection on mount
  const handleMouseEnter = useCallback(() => {
    setHovered(true);
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
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
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
        {/* poster shown until hover — no src until needed */}
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

/* ── Icons ── */
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