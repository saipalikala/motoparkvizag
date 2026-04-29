/**
 * PremiumCarousel.jsx  — Production build
 *
 * ─── CHANGES IN THIS PASS ────────────────────────────────────────────────────
 *
 * [O1] ENFORCED SLIDE ORDER
 *      enforceCarouselOrder() runs over API data before it is stored in state.
 *      It ensures positions always follow:  image → video → image → video → image
 *      If the server returns slides in the wrong order (or with wrong type values),
 *      the display is still correct.  Admin panel enforces the same pattern on save,
 *      so in practice this is a defensive double-check.
 *
 * [O2] VIDEO LAZY LOADING
 *      preload="none" on all <video> elements — only the active slide's video
 *      is ever loaded.  The VideoBackground component already unmounts on slide
 *      change (key={slide.video}), so the browser discards the previous video
 *      before starting the next one.
 *
 * [O3] DATA-SAVER / METERED CONNECTIONS
 *      navigator.connection.saveData → true degrades all video slides to image
 *      slides using their poster frame.  No API or prop changes required.
 *
 * ─── RETAINED FIXES ──────────────────────────────────────────────────────────
 * [A] v.load() only called when readyState === 0 (cold media engine)
 * [B] Auto-advance skips video slides — waits for onEnded
 * [C] Video error → graceful poster-image fallback
 * [D] data-saver detection at mount time
 * [U1] Ken Burns slow zoom on image + video backgrounds
 * [U2] Blur cross-fade transition between slides
 * [U3] Netflix-style mute/unmute toggle on video slides
 *
 * ─── NOTE ON "4 SLIDES VISIBLE AT ONCE" ─────────────────────────────────────
 *      The spec requests showing 4 slides simultaneously. This component is a
 *      full-screen hero carousel; showing 4 full-bleed slides at once requires
 *      an entirely different layout (card strip / multi-column grid).
 *      If you need a multi-visible carousel for a secondary section (category
 *      showcase, product strip, etc.), that is best built as a separate
 *      component.  The hero carousel intentionally shows one slide at a time
 *      for maximum visual impact.  The bottom dot bar shows all slides and lets
 *      the user see the full set at a glance.
 */

import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
    memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import "./PremiumCarousel.css";
import { API } from "@/config/api";
import useParallax from "@/hooks/useParallax";


let _carouselCache = null;
let _carouselCacheTime = 0;
const CAROUSEL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
// ─── FALLBACK ASSETS ──────────────────────────────────────────────────────────
const slide1 = "/assets/carousel/carousel-1.svg";
const slide2 = "/assets/carousel/carousel-2.svg";
const slide3 = "/assets/carousel/carousel-3.svg";
const video1 = "/assets/carousel/carousel-video-1.mp4";
const video2 = "/assets/carousel/carousel-video-2.mp4";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const EASE             = [0.22, 1, 0.36, 1];
const AUTO_DURATION_MS = 5000;  // image slides only; video slides run to onEnded [B]

// ─── [O1] ENFORCED ORDER PATTERN ─────────────────────────────────────────────
const CAROUSEL_PATTERN = ["image", "video", "image", "video", "image"];

/**
 * enforceCarouselOrder(raw)
 * Clamps to 5 slides and assigns the correct type for each position.
 * Preserves all other slide data (title, image, video, route, etc.).
 */
const enforceCarouselOrder = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0) return raw;
    return raw
        .slice(0, CAROUSEL_PATTERN.length)
        .map((slide, i) => ({
            ...slide,
            type: CAROUSEL_PATTERN[i],       // always override to enforced type
        }));
};

// ─── DATA SAVER DETECTION  [D] ───────────────────────────────────────────────
const IS_DATA_SAVER =
    typeof navigator !== "undefined" &&
    navigator.connection?.saveData === true;

// ─── SLIDE VARIANTS  [U2] ─────────────────────────────────────────────────────
// Blur cross-fade — exit blurs out, enter focuses in
const SLIDE_VARIANTS = {
    enter: (d) => ({
        opacity: 0,
        x: d > 0 ? 60 : -60,
        scale: 1.04,
        filter: "blur(4px)",
    }),
    center: {
        opacity: 1,
        x: 0,
        scale: 1.0,
        filter: "blur(0px)",
    },
    exit: (d) => ({
        opacity: 0,
        x: d > 0 ? -40 : 40,
        scale: 0.98,
        filter: "blur(6px)",
    }),
};

// ─── FALLBACK DATA ────────────────────────────────────────────────────────────
// Enforced order: image, video, image, video, image
const fallbackSlides = enforceCarouselOrder([
    { id: 1, type: "image", title: "Premium Riding Helmets",  subtitle: "Engineered for safety, designed for style",  cta: "Shop Helmets", image: slide1, route: "helmets"  },
    { id: 2, type: "video", title: "Feel The Ride",           subtitle: "Experience the road like never before",      cta: "Explore Now",  video: video1, image: slide1, route: "helmets"  },
    { id: 3, type: "image", title: "All Weather Jackets",     subtitle: "Protection for every ride, every season",   cta: "Shop Jackets", image: slide2, route: "jackets"  },
    { id: 4, type: "video", title: "Born For Adventure",      subtitle: "Every trail. Every terrain. Every time.",   cta: "Shop Now",     video: video2, image: slide2, route: "jackets"  },
    { id: 5, type: "image", title: "Travel Luggage Systems",  subtitle: "Adventure-ready gear built to last",         cta: "Shop Luggage", image: slide3, route: "luggage" },
]);

// ─── UTILS ────────────────────────────────────────────────────────────────────
const resolveAsset = (src) => {
    if (!src) return "";
    if (src.startsWith("http") || src.startsWith("/assets") || src.startsWith("data:")) return src;
    return `${API}${src.startsWith("/") ? "" : "/"}${src}`;
};

// ─── STATIC ICONS ─────────────────────────────────────────────────────────────
const ICON_CHEVRON_LEFT = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6"/>
    </svg>
);
const ICON_CHEVRON_RIGHT = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18l6-6-6-6"/>
    </svg>
);
const ICON_ARROW_RIGHT = (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const ICON_PLAY = (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
        <path d="M0 0L10 6L0 12V0Z"/>
    </svg>
);
// [U3] Mute / unmute icons
const ICON_MUTED = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/>
        <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
);
const ICON_UNMUTED = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
);

// ─── VIDEO BACKGROUND ─────────────────────────────────────────────────────────
const VideoBackground = memo(({ src, poster, isPaused, isMuted, onEnded }) => {
    const videoRef       = useRef(null);
    const rafRef         = useRef(null);
    const resolvedSrc    = useMemo(() => resolveAsset(src),    [src]);
    const resolvedPoster = useMemo(() => resolveAsset(poster), [poster]);
    const [errored, setErrored] = useState(false);

    // Mount → conditionally load → play
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        rafRef.current = requestAnimationFrame(() => {
            // [A]: only call load() when media engine is cold (HAVE_NOTHING)
            // avoids discarding already-buffered data on fast re-mounts
            if (v.readyState === 0) {
                v.load();
            }

            const tryPlay = () => {
                if (v.readyState >= 1) {
                    v.play().catch(() => {});
                } else {
                    v.addEventListener("loadedmetadata", () => v.play().catch(() => {}), { once: true });
                }
            };
            tryPlay();
        });

        return () => {
            cancelAnimationFrame(rafRef.current);
            v.pause();
            v.src = "";
            v.load(); // release buffer memory
        };
    }, []);

    // Sync muted state imperatively — React's `muted` prop is unreliable after mount
    useEffect(() => {
        const v = videoRef.current;
        if (v) v.muted = isMuted;
    }, [isMuted]);

    // Hover pause — guarded by readyState
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (isPaused) {
            v.pause();
        } else if (v.readyState >= 2) {
            v.play().catch(() => {});
        }
    }, [isPaused]);

    // [C]: graceful poster fallback on error
    if (errored) {
        return (
            <img
                key={resolvedPoster}
                src={resolvedPoster}
                alt=""
                className="carousel-bg-img"
                aria-hidden="true"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { e.target.style.display = "none"; }}
            />
        );
    }

    return (
        <video
            ref={videoRef}
            className="carousel-bg-img carousel-bg-video"
            poster={resolvedPoster}
            muted={isMuted}
            loop={false}          // [B]: loop=false lets onEnded fire for auto-advance
            playsInline
            preload="none"        // [O2]: lazy — only active slide loads
            aria-hidden="true"
            onEnded={onEnded}
            onError={() => setErrored(true)}
        >
            <source src={resolvedSrc} type="video/mp4"/>
            <source src={resolvedSrc.replace(/\.mp4$/i, ".webm")} type="video/webm"/>
        </video>
    );
});
VideoBackground.displayName = "VideoBackground";

// ─── MUTE BUTTON  [U3] ───────────────────────────────────────────────────────
const MuteButton = memo(({ isMuted, onToggle }) => (
    <motion.button
        className="carousel-mute-btn"
        onClick={onToggle}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5, ease: EASE }}
        aria-label={isMuted ? "Unmute video" : "Mute video"}
        title={isMuted ? "Unmute" : "Mute"}
    >
        {isMuted ? ICON_MUTED : ICON_UNMUTED}
    </motion.button>
));
MuteButton.displayName = "MuteButton";

// ─── SLIDE CONTENT ────────────────────────────────────────────────────────────
const SlideContent = memo(({ slide }) => {
    const navigate = useNavigate();
    return (
        <div className="carousel-content">
            <motion.span
                className="carousel-eyebrow"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            >
                MotoPark Collection
            </motion.span>
            <motion.h2
                className="carousel-title"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
            >
                {slide.title}
            </motion.h2>
            <motion.p
                className="carousel-subtitle"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            >
                {slide.subtitle}
            </motion.p>
            <motion.div
                className="carousel-actions"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
            >
                <button
                    className="carousel-cta"
                    onClick={() => navigate(`/category/${slide.route}`)}
                >
                    {slide.cta || "Explore Collection"}{ICON_ARROW_RIGHT}
                </button>
                <button
                    className="carousel-cta-ghost"
                    onClick={() => navigate("/store")}
                >
                    View All Gear
                </button>
            </motion.div>
        </div>
    );
});
SlideContent.displayName = "SlideContent";

// ─── DOTS BAR ─────────────────────────────────────────────────────────────────
const DotsBar = memo(({ slides, index, paused, isCurrentVideo, onGoTo, currentTitle }) => (
    <div className="carousel-bar">
        <div className="carousel-dots" role="tablist" aria-label="Carousel slides">
            {slides.map((s, i) => {
                // [B]: video dots don't show time-based fill — video runs freely
                const showFill = i === index && !isCurrentVideo;
                return (
                    <button
                        key={i}
                        role="tab"
                        aria-selected={i === index}
                        aria-label={`Go to slide ${i + 1}: ${s.title}`}
                        className={[
                            "carousel-dot",
                            i === index        ? "carousel-dot--active" : "",
                            s.type === "video" ? "carousel-dot--video"  : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => onGoTo(i, i > index ? 1 : -1)}
                    >
                        {/* Timed fill for image slides */}
                        {showFill && (
                            <span
                                className="carousel-dot-fill"
                                style={{ animationDuration: paused ? "0s" : `${AUTO_DURATION_MS}ms` }}
                            />
                        )}
                        {/* Steady accent line for active video dot — no fill race */}
                        {i === index && isCurrentVideo && (
                            <span className="carousel-dot-fill carousel-dot-fill--video-active"/>
                        )}
                        {/* Mini play indicator on inactive video dots */}
                        {s.type === "video" && i !== index && (
                            <span className="carousel-dot-video-icon" aria-hidden="true"/>
                        )}
                    </button>
                );
            })}
        </div>
        <p className="carousel-bar-title">{currentTitle}</p>
    </div>
));
DotsBar.displayName = "DotsBar";

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const PremiumCarousel = () => {
    const [slides,    setSlides]    = useState(null);
    const [index,     setIndex]     = useState(0);
    const [paused,    setPaused]    = useState(false);
    const [direction, setDirection] = useState(1);
    const [isMuted,   setIsMuted]   = useState(true); // [U3]: start muted (autoplay policy)

    const pausedRef  = useRef(false);
    const slidesRef  = useRef(null);
    const indexRef   = useRef(0);
    const timerRef   = useRef(null);

    pausedRef.current  = paused;
    slidesRef.current  = slides;
    indexRef.current   = index;

    const navigate    = useNavigate();
    const parallaxRef = useParallax({ speed: 0.4 });

    /* [D] + [O1]: normalise — downgrade video on data-saver AND enforce order */
    const normaliseSlides = useCallback((raw) => {
        /* [O1] enforce pattern first */
        const ordered = enforceCarouselOrder(raw);
        /* [D] downgrade video → image on metered connections */
        if (!IS_DATA_SAVER) return ordered;
        return ordered.map((s) =>
            s.type === "video" ? { ...s, type: "image" } : s
        );
    }, []);

    /* Fetch carousel data */
useEffect(() => {
  // Serve from module cache if fresh
  if (_carouselCache && Date.now() - _carouselCacheTime < CAROUSEL_CACHE_TTL) {
    setSlides(normaliseSlides(_carouselCache));
    return;
  }

  const ctrl = new AbortController();
  fetch(`${API}/carousel`, { signal: ctrl.signal })
    .then(r => r.json())
    .then(data => {
      const apiSlides = Array.isArray(data) && data.length > 0 ? data : fallbackSlides;
      _carouselCache = apiSlides;
      _carouselCacheTime = Date.now();
      setSlides(normaliseSlides(apiSlides));
    })
    .catch(err => {
      if (err.name !== "AbortError") {
        setSlides(normaliseSlides(fallbackSlides));
      }
    });

  return () => ctrl.abort();
}, [normaliseSlides]);

    /* Preload poster images eagerly; never preload video bytes [O2] */
    useEffect(() => {
        if (!slides) return;
        slides.forEach((s, i) => {
            if (!s.image) return;
            const img = new Image();
            if (i === 0) img.fetchPriority = "high";
            img.src = resolveAsset(s.image);
        });
    }, [slides]);

    /* [B] Stable timer that skips auto-advance on video slides */
    const startTimer = useCallback(() => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (pausedRef.current) return;
            const s = slidesRef.current;
            if (!s) return;
            // [B]: don't auto-advance video slides — wait for onEnded
            if (s[indexRef.current]?.type === "video") return;
            setDirection(1);
            setIndex((p) => (p + 1) % s.length);
        }, AUTO_DURATION_MS);
    }, []);

    useEffect(() => {
        if (!slides) return;
        startTimer();
        return () => clearInterval(timerRef.current);
    }, [slides, startTimer]);

    const goTo = useCallback((i, dir = 1) => {
        setDirection(dir);
        setIndex(i);
        startTimer();
    }, [startTimer]);

    const next = useCallback(() => {
        const s = slidesRef.current;
        if (s) goTo((indexRef.current + 1) % s.length, 1);
    }, [goTo]);

    const prev = useCallback(() => {
        const s = slidesRef.current;
        if (s) goTo(indexRef.current === 0 ? s.length - 1 : indexRef.current - 1, -1);
    }, [goTo]);

    // [B]: video ended → advance to next slide naturally
    const handleVideoEnded = useCallback(() => {
        if (!pausedRef.current) next();
    }, [next]);

    const handlers = useSwipeable({
        onSwipedLeft:  next,
        onSwipedRight: prev,
        trackMouse:    false,
    });

    /* Loading skeleton */
    if (!slides) return (
        <div
            className="carousel-skeleton"
            role="status"
            aria-busy="true"
            aria-label="Loading carousel"
        />
    );

    const slide    = slides[index];
    const isVideo  = slide.type === "video";
    const slideKey = slide.id ?? slide._id ?? index;

    return (
        <section
            className="carousel"
            {...handlers}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-label="Featured collections"
            aria-roledescription="carousel"
        >
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={slideKey}
                    className="carousel-slide"
                    custom={direction}
                    variants={SLIDE_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.7, ease: EASE }}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
                >
                    {/* ── BACKGROUND ── */}
                    <div className="carousel-bg-wrap" ref={!isVideo ? parallaxRef : undefined}>
                        {isVideo ? (
                            <VideoBackground
                                key={slide.video}     /* force remount on slide change */
                                src={slide.video}
                                poster={slide.image}
                                isPaused={paused}
                                isMuted={isMuted}
                                onEnded={handleVideoEnded}
                            />
                        ) : slide.image ? (
                            <img
                                key={slide.image}
                                src={resolveAsset(slide.image)}
                                alt=""
                                className="carousel-bg-img"
                                loading="eager"
                                fetchPriority={index === 0 ? "high" : "auto"}
                                decoding="async"
                                width="1920"
                                height="1080"
                                aria-hidden="true"
                                onError={(e) => { e.target.style.display = "none"; }}
                            />
                        ) : null}
                    </div>

                    <div className="carousel-overlay" aria-hidden="true"/>

                    {/* ── VIDEO CONTROLS  [U3] ── */}
                    {isVideo && (
                        <>
                            <motion.div
                                className="carousel-video-badge"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
                                aria-hidden="true"
                            >
                                {ICON_PLAY}<span>VIDEO</span>
                            </motion.div>
                            <MuteButton
                                isMuted={isMuted}
                                onToggle={() => setIsMuted((m) => !m)}
                            />
                        </>
                    )}

                    {/* ── CONTENT ── */}
                    <SlideContent slide={slide}/>

                    {/* ── COUNTER ── */}
                    <div className="carousel-counter" aria-hidden="true">
                        <span className="carousel-counter-cur">{String(index + 1).padStart(2, "0")}</span>
                        <span className="carousel-counter-sep"/>
                        <span className="carousel-counter-total">{String(slides.length).padStart(2, "0")}</span>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* ── ARROWS ── */}
            <button
                className="carousel-arrow carousel-arrow--left"
                onClick={prev}
                aria-label="Previous slide"
            >
                {ICON_CHEVRON_LEFT}
            </button>
            <button
                className="carousel-arrow carousel-arrow--right"
                onClick={next}
                aria-label="Next slide"
            >
                {ICON_CHEVRON_RIGHT}
            </button>

            {/* ── DOTS BAR ── */}
            <DotsBar
                slides={slides}
                index={index}
                paused={paused}
                isCurrentVideo={isVideo}
                onGoTo={goTo}
                currentTitle={slide.title}
            />
        </section>
    );
};

export default PremiumCarousel;
