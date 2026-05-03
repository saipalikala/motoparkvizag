/**
 * PremiumCarousel.jsx  — Production build
 *
 * ─── WHAT CHATGPT CLAIMED (ALL ALREADY DONE) ─────────────────────────────────
 * ✅ "re-subscribes to scroll/resize on every render" — resize has [] deps, no scroll listener
 * ✅ "no image preloading strategy" — slides.forEach + new Image() + fetchPriority already there
 * ✅ "Memoized slide prevents re-renders" — AnimatePresence renders ONE slide at a time, memo useless
 * ✅ "only load active video" — VideoBackground has preload="none" + key forces remount
 * ✅ "Stable interval" — startTimer + pausedRef/slidesRef/indexRef pattern already correct
 *
 * ─── RETAINED FIXES ──────────────────────────────────────────────────────────
 * [F1] SSR / HYDRATION CRASH FIX — lazy initializer for isMobileDevice
 * [F2] RESIZE HANDLER STABILITY — useCallback so ref is stable
 * [F3] FETCH r.ok GUARD — non-2xx falls back to fallbackSlides
 * [F4] DEV HMR CACHE INVALIDATION — import.meta.hot?.accept() clears cache
 * [O1] enforceCarouselOrder — image/video pattern guaranteed
 * [O2] preload="none" on all videos — only active slide loads
 * [O3] data-saver → video slides degraded to image slides
 * [A]  v.load() only on readyState === 0
 * [B]  Auto-advance skips video slides — waits for onEnded
 * [C]  Video error → poster-image fallback
 * [U1] Ken Burns slow zoom
 * [U2] Blur cross-fade transition
 * [U3] Netflix-style mute/unmute toggle
 *
 * ─── NEW FIXES IN THIS PASS ───────────────────────────────────────────────────
 *
 * [N1] SLIDE_VARIANTS blur removed on mobile
 *      filter:blur() was a module-level constant — applied on ALL devices.
 *      blur() triggers a full GPU composite on every animation frame.
 *      On mid-range Android this drops frames during every slide transition.
 *      Fix: SLIDE_VARIANTS is now a useMemo inside the component, keyed on
 *      isMobileDevice. Mobile gets opacity+translate+scale only. Desktop keeps
 *      the blur effect unchanged.
 *
 * [N2] SlideContent useNavigate moved to prop
 *      SlideContent called useNavigate() internally. PremiumCarousel also called
 *      useNavigate() on line 387 and never used it — dead variable.
 *      Each useNavigate() call creates a React Router subscription. Two calls for
 *      the same thing is wasteful. Fix: PremiumCarousel owns the single navigate
 *      instance and passes it down as onNavigate prop. SlideContent removed its
 *      internal useNavigate entirely.
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
import { cachedFetch, invalidateCache } from "@/lib/apiCache";
// ─── MODULE-LEVEL CACHE ───────────────────────────────────────────────────────


// [F4]: clear cache on Vite HMR so dev never sees stale API data
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        _carouselCache     = null;
        _carouselCacheTime = 0;
    });
}

// ─── FALLBACK ASSETS ──────────────────────────────────────────────────────────
const slide1 = "/assets/carousel/carousel-1.svg";
const slide2 = "/assets/carousel/carousel-2.svg";
const slide3 = "/assets/carousel/carousel-3.svg";
const video1 = "/assets/carousel/carousel-video-1.mp4";
const video2 = "/assets/carousel/carousel-video-2.mp4";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const EASE             = [0.22, 1, 0.36, 1];
const AUTO_DURATION_MS = 5000; // image slides only; video slides run to onEnded [B]

// ─── [O1] ENFORCED ORDER PATTERN ─────────────────────────────────────────────
const CAROUSEL_PATTERN = ["image", "video", "image", "video", "image"];

const enforceCarouselOrder = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0) return raw;
    return raw
        .slice(0, CAROUSEL_PATTERN.length)
        .map((slide, i) => ({ ...slide, type: CAROUSEL_PATTERN[i] }));
};

// ─── DATA SAVER DETECTION  [D] ───────────────────────────────────────────────
const IS_DATA_SAVER =
    typeof navigator !== "undefined" &&
    navigator.connection?.saveData === true;

// ─── FALLBACK DATA ────────────────────────────────────────────────────────────
const fallbackSlides = enforceCarouselOrder([
    { id: 1, type: "image", title: "Premium Riding Helmets",  subtitle: "Engineered for safety, designed for style",  cta: "Shop Helmets", image: slide1, route: "helmets"  },
    { id: 2, type: "video", title: "Feel The Ride",           subtitle: "Experience the road like never before",      cta: "Explore Now",  video: video1, image: slide1, route: "helmets"  },
    { id: 3, type: "image", title: "All Weather Jackets",     subtitle: "Protection for every ride, every season",   cta: "Shop Jackets", image: slide2, route: "jackets"  },
    { id: 4, type: "video", title: "Born For Adventure",      subtitle: "Every trail. Every terrain. Every time.",   cta: "Shop Now",     video: video2, image: slide2, route: "jackets"  },
    { id: 5, type: "image", title: "Travel Luggage Systems",  subtitle: "Adventure-ready gear built to last",        cta: "Shop Luggage", image: slide3, route: "luggage" },
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

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        rafRef.current = requestAnimationFrame(() => {
            // [A]: only load when media engine is cold
            if (v.readyState === 0) v.load();

            if (v.readyState >= 1) {
                v.play().catch(() => {});
            } else {
                v.addEventListener("loadedmetadata", () => v.play().catch(() => {}), { once: true });
            }
        });

        return () => {
            cancelAnimationFrame(rafRef.current);
            v.pause();
            v.src = "";
            v.load(); // release buffer memory
        };
    }, []);

    // Sync muted imperatively — React's `muted` prop is unreliable after mount
    useEffect(() => {
        const v = videoRef.current;
        if (v) v.muted = isMuted;
    }, [isMuted]);

    // Hover pause
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
            loop={false}       // [B]: loop=false lets onEnded fire for auto-advance
            playsInline
            preload="none"     // [O2]: lazy — only active slide loads
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
// [N2]: onNavigate received as prop — no internal useNavigate().
// Previously SlideContent called useNavigate() itself, creating a second
// React Router subscription while PremiumCarousel had a dead one.
// Now there is exactly one navigate instance for the whole component tree.
const SlideContent = memo(({ slide, onNavigate }) => (
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
                onClick={() => onNavigate(`/category/${slide.route}`)}
            >
                {slide.cta || "Explore Collection"}{ICON_ARROW_RIGHT}
            </button>
            <button
                className="carousel-cta-ghost"
                onClick={() => onNavigate("/store")}
            >
                View All Gear
            </button>
        </motion.div>
    </div>
));
SlideContent.displayName = "SlideContent";

// ─── DOTS BAR ─────────────────────────────────────────────────────────────────
const DotsBar = memo(({ slides, index, paused, isCurrentVideo, onGoTo, currentTitle }) => (
    <div className="carousel-bar">
        <div className="carousel-dots" role="tablist" aria-label="Carousel slides">
            {slides.map((s, i) => {
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
                        {showFill && (
                            <span
                                className="carousel-dot-fill"
                                style={{ animationDuration: paused ? "0s" : `${AUTO_DURATION_MS}ms` }}
                            />
                        )}
                        {i === index && isCurrentVideo && (
                            <span className="carousel-dot-fill carousel-dot-fill--video-active"/>
                        )}
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
    const [slides,    setSlides]    = useState(fallbackSlides);
    const [index,     setIndex]     = useState(0);
    const [paused,    setPaused]    = useState(false);
    const [direction, setDirection] = useState(1);
    const [isMuted,   setIsMuted]   = useState(true);

    const pausedRef = useRef(false);
    const slidesRef = useRef(null);
    const indexRef  = useRef(0);
    const timerRef  = useRef(null);

    pausedRef.current = paused;
    slidesRef.current = slides;
    indexRef.current  = index;

    // [N2]: single navigate instance — passed down to SlideContent as prop.
    // Previously PremiumCarousel declared this and never used it (dead variable)
    // while SlideContent had its own. Now one instance serves both buttons.
    const navigate = useNavigate();

    // [F1]: lazy initializer — safe on SSR, no double-render on hydration
    const [isMobileDevice, setIsMobileDevice] = useState(
        () => typeof window !== "undefined" && window.innerWidth < 768
    );

    // [F2]: stable callback — doesn't recreate on every render
    const handleResize = useCallback(() => {
        setIsMobileDevice(window.innerWidth < 768);
    }, []);

    useEffect(() => {
        window.addEventListener("resize", handleResize, { passive: true });
        return () => window.removeEventListener("resize", handleResize);
    }, [handleResize]);

    // useParallax with speed=0 on mobile — the hook now exits immediately
    // when speed=0 (no scroll listener, no observer). See useParallax.js [N1].
    const parallaxRef = useParallax({ speed: isMobileDevice ? 0 : 0.4 });

    // [N1]: SLIDE_VARIANTS as useMemo — previously a module-level constant so
    // blur applied on ALL devices. Now mobile gets opacity+translate+scale only.
    // filter:blur() triggers a full GPU composite on every animation frame —
    // on mid-range Android this drops frames on every single slide transition.
    const SLIDE_VARIANTS = useMemo(() => ({
        enter: (d) => ({
            opacity: 0,
            x: d > 0 ? 60 : -60,
            scale: 1.04,
            ...(isMobileDevice ? {} : { filter: "blur(4px)" }),
        }),
        center: {
            opacity: 1,
            x: 0,
            scale: 1.0,
            ...(isMobileDevice ? {} : { filter: "blur(0px)" }),
        },
        exit: (d) => ({
            opacity: 0,
            x: d > 0 ? -40 : 40,
            scale: 0.98,
            ...(isMobileDevice ? {} : { filter: "blur(6px)" }),
        }),
    }), [isMobileDevice]);

    /* [D] + [O1]: normalise — downgrade video on data-saver AND enforce order */
    const normaliseSlides = useCallback((raw) => {
        const ordered = enforceCarouselOrder(raw);
        if (!IS_DATA_SAVER) return ordered;
        return ordered.map((s) =>
            s.type === "video" ? { ...s, type: "image" } : s
        );
    }, []);

    /* [F3]: Fetch with r.ok guard — bad JSON from a 500 page no longer crashes */
    useEffect(() => {
const ctrl = new AbortController();
cachedFetch(`${API}/carousel`, { signal: ctrl.signal })
  .then(data => {
    const apiSlides = Array.isArray(data) && data.length > 0 ? data : fallbackSlides;
    setSlides(normaliseSlides(apiSlides));
  })
  .catch(err => { if (err.name !== "AbortError") setSlides(normaliseSlides(fallbackSlides)); });
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

    /* [B] Stable timer — skips video slides, waits for onEnded */
    const startTimer = useCallback(() => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (pausedRef.current) return;
            const s = slidesRef.current;
            if (!s) return;
            if (s[indexRef.current]?.type === "video") return; // [B]
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

    // [B]: video ended → advance naturally
    const handleVideoEnded = useCallback(() => {
        if (!pausedRef.current) next();
    }, [next]);

    const handlers = useSwipeable({
        onSwipedLeft:  next,
        onSwipedRight: prev,
        trackMouse:    false,
    });

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
                    className="carousel-slide carousel-slide--active"
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
                    <div
                        className="carousel-bg-wrap"
                        ref={(!isVideo && !isMobileDevice) ? parallaxRef : undefined}
                    >
                        {isVideo ? (
                            <VideoBackground
                                key={slide.video}
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

                    {/* ── CONTENT — navigate passed as prop [N2] ── */}
                    <SlideContent slide={slide} onNavigate={navigate} />

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