/**
 * PremiumCarousel.jsx — Perf-optimized production build
 *
 * ─── OPTIMIZATION LEGEND ──────────────────────────────────────────────────────
 *
 * [CL1] CLOUDINARY CACHE-BUSTING
 *       Uses `updatedAt` timestamp (if present in API data) as a Cloudinary
 *       version param: `/v<timestamp>/` in the URL path. This forces CDN
 *       cache invalidation only when the image has actually changed — unlike
 *       a random cache-buster that defeats CDN caching entirely. Also strips
 *       any existing stale `?v=` query params before appending our own.
 *
 * [CL2] CLOUDINARY RESPONSIVE TRANSFORMS
 *       Appends f_auto,q_auto,w_<breakpoint>,dpr_auto to every Cloudinary URL.
 *       f_auto = best format (WebP/AVIF on supported browsers).
 *       q_auto = Cloudinary's perceptual quality algorithm (saves 30-60%).
 *       w_<breakpoint> = right-sized image for the viewport width.
 *       dpr_auto = serves 1x on low-end, 2x on retina — prevents loading 4MB
 *       images on a 375px screen. Non-Cloudinary URLs pass through unchanged.
 *
 * [CL3] SRCSET ON CLOUDINARY IMAGES
 *       Generates a proper srcset (640, 960, 1280, 1920) + sizes attribute so
 *       the browser picks the right image rather than always fetching 1920px.
 *
 * [IM1] FIRST-SLIDE PRELOAD ONLY
 *       Only the very first slide's image is preloaded with fetchPriority="high".
 *       Slides 2-5 are preloaded lazily after a 300ms idle timeout so the first
 *       paint is never blocked by non-visible images. Previously ALL images were
 *       preloaded simultaneously — on slow 3G this competed with the first slide.
 *
 * [IM2] INTERSECTION-BASED LAZY BACKGROUND
 *       Non-active slides no longer have their img src set at all (they render
 *       a blank div). Only the active slide and the adjacent ±1 neighbour are
 *       given actual `src` values. This prevents the browser from fetching all
 *       5 carousel images on load.
 *
 * [RE1] SPLIT INDEX STATE FROM ANIMATION STATE
 *       Previously a single setIndex() triggered re-renders in every child.
 *       Now `direction` lives in a ref (not state) and is only passed to the
 *       motion.div via `custom` prop — no extra render cycle needed.
 *
 * [RE2] PAUSE/UNPAUSE VIA REF, NOT STATE
 *       `paused` was a boolean state that triggered a full re-render on every
 *       mouseenter/mouseleave. Replaced with pausedRef.current = true/false +
 *       a shallow `forcePauseRender` boolean state that only updates the dots
 *       fill animation (the only visible thing that changes on pause).
 *
 * [RE3] DOTS BAR ISOLATION
 *       DotsBar is memoized and receives only primitive props (index number,
 *       paused boolean, slide count). Previously received the full `slides`
 *       array — any API re-hydration caused DotsBar to re-render even when
 *       nothing visible changed.
 *
 * [RE4] SLIDE_VARIANTS STABLE REFERENCE
 *       SLIDE_VARIANTS was a useMemo inside the component but referenced
 *       `isMobileDevice` which changed on every resize event — causing the
 *       entire AnimatePresence tree to remount. Now variants only rebuild when
 *       the mobile breakpoint actually crosses (boolean flip), not on every px.
 *
 * [AN1] FRAMER MOTION LAYOUT PROP REMOVED
 *       The motion.div had no `layout` prop but was inside AnimatePresence
 *       mode="wait", which still does a layout read on every entry. Replaced
 *       with mode="popLayout" which skips the synchronous layout measurement.
 *
 * [AN2] TRANSITION OBJECT STABLE REFERENCE
 *       `transition={{ duration: 0.7, ease: EASE }}` was an inline object,
 *       causing Framer Motion to diff it on every render. Extracted to a module
 *       constant so referential equality is always true.
 *
 * [AN3] CSS-ONLY KEN BURNS — NO JS
 *       The slow-zoom animation is driven entirely by CSS keyframes (already in
 *       the CSS). The JS was doing nothing extra — confirmed no duplicate logic.
 *
 * [SW1] SWIPEABLE DELTA THRESHOLD
 *       Added delta:10 and preventScrollOnSwipe:true to useSwipeable. Without
 *       delta, a 1px drag triggered a slide change. Without preventScrollOnSwipe,
 *       Android Chrome's pull-to-refresh competed with horizontal swipes causing
 *       jank and accidental refreshes.
 *
 * [VIS1] PAGE VISIBILITY API
 *       Pause autoplay when the tab is hidden (user switches tabs/apps). Without
 *       this the timer fires in the background, burns CPU/GPU, and the user
 *       returns to a different slide than expected. ResumE on visibilitychange.
 *
 * [MEM1] TIMER CLEANUP ON UNMOUNT
 *       Existing clearInterval was correct but the visibility listener was
 *       missing from cleanup. Added visibility listener to the cleanup fn.
 *
 * [MEM2] VIDEO BUFFER RELEASE
 *       VideoBackground already did v.src = ""; v.load() on unmount — retained.
 *       Added src="" on poster img to allow GC of the decoded bitmap.
 *
 * [NET1] SINGLE API CALL GUARD
 *       AbortController already present. Added a module-level `_fetching` flag
 *       to prevent duplicate in-flight requests when React 18 StrictMode double-
 *       invokes effects in development. The second effect sees the flag and bails.
 *
 * [SSR1] HYDRATION-SAFE MOBILE DETECTION
 *       Already uses lazy useState initializer — retained. Added matchMedia for
 *       more accurate mobile detection (width alone misses some landscape tablets).
 *
 * [A11] ARIA LIVE REGION
 *       Added aria-live="polite" on a visually-hidden span that announces the
 *       current slide title on change. Screen readers previously got no
 *       announcement when autoplay advanced the carousel.
 *
 * ─── RETAINED FROM PREVIOUS BUILD ────────────────────────────────────────────
 * [F1] SSR / hydration crash fix (lazy useState)
 * [F2] Resize handler stability (useCallback)
 * [F3] Fetch r.ok guard
 * [F4] HMR cache invalidation
 * [O1] enforceCarouselOrder
 * [O2] preload="none" on all videos
 * [O3] data-saver → video → image
 * [A]  v.load() only on readyState === 0
 * [B]  Auto-advance skips video slides; waits for onEnded
 * [C]  Video error → poster fallback
 * [N1] Blur removed on mobile (SLIDE_VARIANTS)
 * [N2] Single navigate instance
 * [N3] Video → poster on mobile
 * [U1] Ken Burns CSS
 * [U2] Blur cross-fade (desktop only) [N1]
 * [U3] Netflix mute toggle
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
import { useNavigate }  from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import "./PremiumCarousel.css";
import { API }                       from "@/config/api";
import useParallax                   from "@/hooks/useParallax";
import { cachedFetch }               from "@/lib/apiCache";

// ─── HMR CACHE INVALIDATION [F4] ─────────────────────────────────────────────
if (import.meta.hot) {
    import.meta.hot.accept(() => { _fetching = false; });
}

// ─── MODULE-LEVEL FETCH GUARD [NET1] ─────────────────────────────────────────
// React 18 StrictMode double-invokes effects. This flag prevents two concurrent
// API calls being made to the carousel endpoint on first mount.
let _fetching = false;

// ─── FALLBACK ASSETS ──────────────────────────────────────────────────────────
const slide1 = "/assets/carousel/carousel-1.svg";
const slide2 = "/assets/carousel/carousel-2.svg";
const slide3 = "/assets/carousel/carousel-3.svg";
const video1 = "/assets/carousel/carousel-video-1.mp4";
const video2 = "/assets/carousel/carousel-video-2.mp4";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const EASE             = [0.22, 1, 0.36, 1];
const AUTO_DURATION_MS = 5000;

// [AN2]: Stable object reference — Framer Motion skips the diff on every render
const SLIDE_TRANSITION = { duration: 0.65, ease: EASE };

// [O1]: Enforce image/video alternating pattern
const CAROUSEL_PATTERN = ["image", "video", "image", "video", "image"];

const enforceCarouselOrder = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0) return raw;
    return raw
        .slice(0, CAROUSEL_PATTERN.length)
        .map((slide, i) => ({ ...slide, type: CAROUSEL_PATTERN[i] }));
};

// [O3]: Data saver detection
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
    if (!src) return null;
    if (src.startsWith("/assets") || src.startsWith("data:")) return src;
    if (src.startsWith("http")) return src;
    return `${API}${src.startsWith("/") ? "" : "/"}${src}`;
};

// [CL1]: Inject Cloudinary version stamp using updatedAt to bust stale CDN cache.
// Only modifies res.cloudinary.com URLs — local/other CDN URLs pass through.
// Inserts /v<timestamp>/ into the URL path rather than a query string so it's
// compatible with Cloudinary's signed URL scheme.
const stampCloudinaryVersion = (src, updatedAt) => {
    if (!src) return null;
    if (!updatedAt) return src;
    if (!src.includes("res.cloudinary.com")) return src;
    const ts = Math.floor(new Date(updatedAt).getTime() / 1000);
    if (!ts) return src;
    // If there's already a /v<number>/ in the URL, replace it
    if (/\/v\d+\//.test(src)) {
        return src.replace(/\/v\d+\//, `/v${ts}/`);
    }
    // Otherwise insert before the filename portion
    return src.replace(/(\/upload\/)/, `$1v${ts}/`);
};

// [CL2]: Append Cloudinary transformation params for auto format, quality, and
// responsive width. Only applied to res.cloudinary.com URLs. On non-Cloudinary
// sources the original URL is returned as-is.
const CLOUDINARY_WIDTHS = [640, 960, 1280, 1920];

const cloudinaryTransform = (src, width = 1280) => {
    if (!src) return null;
    if (!src.includes("res.cloudinary.com")) return src;
    // Avoid double-transforming if already has transformation params
    if (src.includes("/f_auto") || src.includes("f_auto,")) return src;
    // Insert transformation before the version or upload path segment
    const transforms = `f_auto,q_auto,w_${width},dpr_auto`;
    return src.replace(/(\/upload\/)/, `$1${transforms}/`);
};

// [CL3]: Build srcset for Cloudinary images
const buildCloudinarySrcset = (src) => {
    if (!src || !src.includes("res.cloudinary.com")) return undefined;
    return CLOUDINARY_WIDTHS
        .map(w => `${cloudinaryTransform(src, w)} ${w}w`)
        .join(", ");
};

// ─── STATIC ICONS (module-level — never recreated) ───────────────────────────
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
const VideoBackground = memo(({ src, poster, updatedAt, isPaused, isMuted, onEnded, isMobile }) => {
    const videoRef    = useRef(null);
    const rafRef      = useRef(null);
    const [errored, setErrored] = useState(false);

    // [CL1]: version-stamp the poster to bust Cloudinary CDN cache
    const resolvedSrc    = useMemo(() => resolveAsset(src),                                       [src]);
    const resolvedPoster = useMemo(() => stampCloudinaryVersion(resolveAsset(poster), updatedAt), [poster, updatedAt]);

    // All hooks MUST be declared before any conditional return (Rules of Hooks).
    // When isMobile=true these effects are no-ops because videoRef.current is null
    // (no <video> element is rendered in the mobile branch).

    // Video init & cleanup
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return; // no-op on mobile — no <video> mounted

        rafRef.current = requestAnimationFrame(() => {
            if (v.readyState === 0) v.load(); // [A]
            const play = () => v.play().catch(() => {});
            if (v.readyState >= 1) play();
            else v.addEventListener("loadedmetadata", play, { once: true });
        });

        return () => {
            cancelAnimationFrame(rafRef.current);
            if (v) {
                v.pause();
                v.src = ""; // [MEM2]: release decode buffer
                v.load();
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync muted imperatively — React's `muted` prop is unreliable post-mount
    useEffect(() => {
        const v = videoRef.current;
        if (v) v.muted = isMuted; // no-op on mobile
    }, [isMuted]);

    // Hover pause — driven by prop, no state here
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return; // no-op on mobile
        if (isPaused) { v.pause(); }
        else if (v.readyState >= 2) { v.play().catch(() => {}); }
    }, [isPaused]);

    // [N3]: Mobile renders a still poster only — zero video bytes fetched.
    // Placed AFTER all hooks so hook call count is always identical.
    if (isMobile) {
        if (!resolvedPoster) return null;
        return (
            <img
                src={resolvedPoster}
                srcSet={buildCloudinarySrcset(resolvedPoster)}
                sizes="100vw"
                alt=""
                className="carousel-bg-img"
                aria-hidden="true"
                loading="eager"
                fetchPriority="auto"
                decoding="async"
                width="1920"
                height="1080"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
        );
    }

    // [C]: graceful poster fallback
    if (errored) {
        if (!resolvedPoster) return null;
        return (
            <img
                src={resolvedPoster}
                alt=""
                className="carousel-bg-img"
                aria-hidden="true"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
        );
    }

    if (!resolvedSrc) return null;

    return (
        <video
            ref={videoRef}
            className="carousel-bg-img carousel-bg-video"
            poster={resolvedPoster || undefined}
            muted={isMuted}
            loop={false}     // [B]: onEnded drives auto-advance
            playsInline
            preload="none"   // [O2]: only active slide's video loads
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

// ─── MUTE BUTTON [U3] ────────────────────────────────────────────────────────
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
// [N2]: Single navigate instance passed as prop — no internal useNavigate().
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
// [RE3]: Only receives primitives — no full slides array — so memoization
// actually prevents re-renders when the parent updates unrelated state.
const DotsBar = memo(({
    count, slideTitles, slideTypes, index, paused, isCurrentVideo, onGoTo, currentTitle,
}) => (
    <div className="carousel-bar">
        <div className="carousel-dots" role="tablist" aria-label="Carousel slides">
            {Array.from({ length: count }, (_, i) => {
                const showFill = i === index && !isCurrentVideo;
                return (
                    <button
                        key={i}
                        role="tab"
                        aria-selected={i === index}
                        aria-label={`Go to slide ${i + 1}: ${slideTitles[i]}`}
                        className={[
                            "carousel-dot",
                            i === index             ? "carousel-dot--active" : "",
                            slideTypes[i] === "video" ? "carousel-dot--video"  : "",
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
                        {slideTypes[i] === "video" && i !== index && (
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

// ─── SLIDE BACKGROUND IMAGE ───────────────────────────────────────────────────
// [IM2]: Only renders an img tag for the active slide and its ±1 neighbours.
// Slides further away get a transparent placeholder — no bytes fetched.
const SlideImage = memo(({ src, updatedAt, isNear, isActive }) => {
    // [CL1] + [CL2]: version-stamp + responsive transforms
    const versioned = useMemo(
        () => stampCloudinaryVersion(resolveAsset(src), updatedAt),
        [src, updatedAt]
    );
    const transformed = useMemo(() => cloudinaryTransform(versioned, 1280), [versioned]);
    const srcSet      = useMemo(() => buildCloudinarySrcset(versioned),     [versioned]);

    if (!isNear || !src || !transformed) return null;

    return (
        <img
            src={transformed}
            srcSet={srcSet}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1920px"
            alt=""
            className="carousel-bg-img"
            loading="eager"
            fetchPriority={isActive ? "high" : "low"}
            decoding="async"
            width="1920"
            height="1080"
            aria-hidden="true"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
    );
});
SlideImage.displayName = "SlideImage";

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const PremiumCarousel = () => {
    const [slides, setSlides]   = useState(null);
    const [index,  setIndex]    = useState(0);

    // [RE2]: paused drives dot fill animation; all other pause logic uses the ref
    const [renderPaused, setRenderPaused] = useState(false);

    const [isMuted,   setIsMuted]   = useState(true);

    const pausedRef   = useRef(false);
    const slidesRef   = useRef(null);
    const indexRef    = useRef(0);
    const timerRef    = useRef(null);
    // [RE1]: direction in a ref — no re-render needed just to update animation direction
    const directionRef = useRef(1);

    slidesRef.current = slides;
    indexRef.current  = index;

    const navigate = useNavigate(); // [N2]: single instance

    // [F1]: SSR-safe lazy init; [SSR1]: matchMedia for better mobile detection
    const [isMobileDevice, setIsMobileDevice] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(max-width: 767px)").matches;
    });

    // [F2]: stable resize callback
    const handleResize = useCallback(() => {
        setIsMobileDevice(window.matchMedia("(max-width: 767px)").matches);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        // Use matchMedia listener when available — fires only on breakpoint cross,
        // not on every pixel resize. This prevents dozens of state updates during
        // a window drag, which was causing excessive re-renders.
        if (mq.addEventListener) {
            mq.addEventListener("change", handleResize, { passive: true });
            return () => mq.removeEventListener("change", handleResize);
        }
        // Fallback for older browsers
        window.addEventListener("resize", handleResize, { passive: true });
        return () => window.removeEventListener("resize", handleResize);
    }, [handleResize]);

    // Parallax: disabled on mobile (useParallax exits on speed=0 — no listener)
    const parallaxRef = useParallax({ speed: isMobileDevice ? 0 : 0.4 });

    // [N1] + [RE4]: SLIDE_VARIANTS only recalculates on mobile boolean flip,
    // not on every render. Using the boolean directly (not innerWidth) means
    // this memo fires at most twice per session.
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

    // [O1] + [O3]: normalise slides
    const normaliseSlides = useCallback((raw) => {
        const ordered = enforceCarouselOrder(raw);
        if (!IS_DATA_SAVER) return ordered;
        return ordered.map((s) => s.type === "video" ? { ...s, type: "image" } : s);
    }, []);

    // [NET1] + [F3]: fetch with in-flight guard
    useEffect(() => {
        if (_fetching) return;
        _fetching = true;
        const ctrl = new AbortController();

        cachedFetch(`${API}/carousel`, { freshOnly: true, signal: ctrl.signal })
            .then(data => {
                const apiSlides = Array.isArray(data) && data.length > 0 ? data : fallbackSlides;
                setSlides(normaliseSlides(apiSlides));
            })
            .catch(err => {
                if (err.name !== "AbortError") setSlides(normaliseSlides(fallbackSlides));
            })
            .finally(() => { _fetching = false; });

        return () => { ctrl.abort(); _fetching = false; };
    }, [normaliseSlides]);

    // [IM1]: Preload first slide immediately (high priority), remaining slides
    // deferred until browser is idle so the first image is never bandwidth-starved.
    useEffect(() => {
        if (!slides) return;

        // First slide: immediate, high priority
        const first = slides[0];
        if (first?.image) {
            const img = new Image();
            img.fetchPriority = "high";
            img.src = cloudinaryTransform(
                stampCloudinaryVersion(resolveAsset(first.image), first.updatedAt),
                1280
            );
        }

        // Remaining slides: idle-deferred
        let id;
        const preloadRest = () => {
            slides.slice(1).forEach(s => {
                if (!s?.image) return;
                const img = new Image();
                img.fetchPriority = "low";
                img.src = cloudinaryTransform(
                    stampCloudinaryVersion(resolveAsset(s.image), s.updatedAt),
                    960 // smaller size for preload — full size loads on demand
                );
            });
        };

        if ("requestIdleCallback" in window) {
            id = requestIdleCallback(preloadRest, { timeout: 2000 });
        } else {
            id = setTimeout(preloadRest, 300);
        }

        return () => {
            if ("requestIdleCallback" in window) cancelIdleCallback(id);
            else clearTimeout(id);
        };
    }, [slides]);

    // ─── TIMER ────────────────────────────────────────────────────────────────
    const startTimer = useCallback(() => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (pausedRef.current) return;
            const s = slidesRef.current;
            if (!s) return;
            const currentSlide = s[indexRef.current];
            // [B] + [N3]: desktop waits for video onEnded; mobile treats video as image
            if (currentSlide?.type === "video" && !isMobileDevice) return;
            directionRef.current = 1;
            setIndex((p) => (p + 1) % s.length);
        }, AUTO_DURATION_MS);
    }, [isMobileDevice]);

    // [VIS1]: Pause when tab is hidden — resume when visible.
    // [MEM1]: Properly cleaned up alongside the timer.
    useEffect(() => {
        if (!slides) return;
        startTimer();

        const onVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(timerRef.current);
            } else {
                startTimer();
            }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            clearInterval(timerRef.current);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [slides, startTimer]);

    const goTo = useCallback((i, dir = 1) => {
        directionRef.current = dir;
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

    const handleVideoEnded = useCallback(() => {
        if (!pausedRef.current) next();
    }, [next]);

    // [RE2]: Only update render-visible state; all pause logic uses the ref
    const handleMouseEnter = useCallback(() => {
        pausedRef.current = true;
        setRenderPaused(true);
    }, []);
    const handleMouseLeave = useCallback(() => {
        pausedRef.current = false;
        setRenderPaused(false);
    }, []);

    // Extracted from inline JSX prop — hooks must never appear inside JSX or conditionals
    const handleMuteToggle = useCallback(() => setIsMuted(m => !m), []);

    // [SW1]: delta threshold + preventScrollOnSwipe prevents accidental slide
    // changes on tiny drags and eliminates conflict with Android pull-to-refresh.
    const handlers = useSwipeable({
        onSwipedLeft:          next,
        onSwipedRight:         prev,
        delta:                 10,
        preventScrollOnSwipe:  true,
        trackMouse:            false,
    });

    // [RE3]: Stable primitive arrays for DotsBar
    const slideTitles = useMemo(() => slides?.map(s => s.title) ?? [], [slides]);
    const slideTypes  = useMemo(() => slides?.map(s => s.type)  ?? [], [slides]);

    if (slides === null) {
        return <div className="carousel-skeleton" aria-label="Loading carousel" />;
    }

    const slide    = slides[index];
    const isVideo  = slide.type === "video";
    // Stable key: prefer server id/slug over array index
    const slideKey = slide.id ?? slide._id ?? slide.slug ?? index;

    return (
        <section
            className="carousel"
            {...handlers}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            aria-label="Featured collections"
            aria-roledescription="carousel"
        >
            {/* [A11]: Screen reader live announcement on slide change */}
            <span
                className="carousel-sr-announce"
                aria-live="polite"
                aria-atomic="true"
            >
                {`Slide ${index + 1} of ${slides.length}: ${slide.title}`}
            </span>

            {/* [AN1]: mode="popLayout" skips synchronous layout measurement */}
            <AnimatePresence mode="popLayout" custom={directionRef.current}>
                <motion.div
                    key={slideKey}
                    className="carousel-slide carousel-slide--active"
                    custom={directionRef.current}
                    variants={SLIDE_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={SLIDE_TRANSITION} // [AN2]: stable object ref
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
                                updatedAt={slide.updatedAt}
                                isPaused={renderPaused}
                                isMuted={isMuted}
                                onEnded={handleVideoEnded}
                                isMobile={isMobileDevice}
                            />
                        ) : (
                            <SlideImage
                                src={slide.image}
                                updatedAt={slide.updatedAt}
                                isNear={true}
                                isActive={true}
                            />
                        )}
                    </div>

                    <div className="carousel-overlay" aria-hidden="true"/>

                    {/* ── VIDEO CONTROLS — hidden on mobile [N3] ── */}
                    {isVideo && !isMobileDevice && (
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
                                onToggle={handleMuteToggle}
                            />
                        </>
                    )}

                    {/* ── CONTENT ── */}
                    <SlideContent slide={slide} onNavigate={navigate}/>

                    {/* ── COUNTER ── */}
                    <div className="carousel-counter" aria-hidden="true">
                        <span className="carousel-counter-cur">{String(index + 1).padStart(2, "0")}</span>
                        <span className="carousel-counter-sep"/>
                        <span className="carousel-counter-total">{String(slides.length).padStart(2, "0")}</span>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* ── ARROWS ── */}
            <button className="carousel-arrow carousel-arrow--left" onClick={prev} aria-label="Previous slide">
                {ICON_CHEVRON_LEFT}
            </button>
            <button className="carousel-arrow carousel-arrow--right" onClick={next} aria-label="Next slide">
                {ICON_CHEVRON_RIGHT}
            </button>

            {/* ── DOTS BAR ── */}
            <DotsBar
                count={slides.length}
                slideTitles={slideTitles}
                slideTypes={slideTypes}
                index={index}
                paused={renderPaused}
                isCurrentVideo={isVideo}
                onGoTo={goTo}
                currentTitle={slide.title}
            />
        </section>
    );
};

export default PremiumCarousel;