/**
 * PremiumCarousel.jsx — MotoPark Hero Section
 *
 * IMAGE ONLY. Video support removed.
 * Each slide serves desktopImage (> 768 px) or mobileImage (≤ 768 px).
 * Falls back: mobileImage → desktopImage, desktopImage → legacy image field.
 *
 * ALL RETAINED OPTIMISATIONS:
 * [CL1-3] Cloudinary versioning / transforms / srcset
 * [IM1]   Preload strategy
 * [RE1-4] Ref-based direction / mobile / pause
 * [AN2]   Stable transition objects / CSS Ken Burns
 * [SW1]   Native pointer events (usePointerDrag)
 * [VIS1]  Page Visibility API
 * [MEM1]  Timer cleanup
 * [NET1]  In-flight fetch guard
 * [SSR1]  Hydration-safe mobile detection
 * [D2]    Arrows hidden on desktop
 * [D3]    Progress bar segments
 * [D4]    Crossfade + scale transition
 * [D5]    Content animation
 * [RE5]   Hover pause via data attribute
 * [A11a]  ARIA live region
 * [A11b]  Keyboard navigation
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
import "./PremiumCarousel.css";
import { API }         from "@/config/api";
import useParallax     from "@/hooks/useParallax";
import { cachedFetch } from "@/lib/apiCache";

// ─── HMR CACHE INVALIDATION ──────────────────────────────────────────────────
if (import.meta.hot) {
    import.meta.hot.accept(() => { _fetching = false; });
}

// ─── FETCH GUARD [NET1] ───────────────────────────────────────────────────────
// NOTE: module-level guard only prevents duplicate fetches within the same
// render cycle. It is reset in the cleanup so remounts always re-fetch.
let _fetching = false;

// ─── FALLBACK ASSETS ──────────────────────────────────────────────────────────
const slide1 = "/assets/carousel/carousel-1.svg";
const slide2 = "/assets/carousel/carousel-2.svg";
const slide3 = "/assets/carousel/carousel-3.svg";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const EASE             = [0.22, 1, 0.36, 1];
const EASE_OUT         = [0.0, 0.0, 0.2, 1.0];
const AUTO_DURATION_MS = 5000;

// Stable Framer Motion transition refs [AN2]
const SLIDE_TRANSITION   = { duration: 0.7,  ease: EASE };
const CONTENT_TR_EYEBROW = { duration: 0.55, delay: 0.1, ease: EASE_OUT };
const CONTENT_TR_TITLE   = { duration: 0.65, delay: 0.2, ease: EASE_OUT };
const CONTENT_TR_SUB     = { duration: 0.65, delay: 0.3, ease: EASE_OUT };
const CONTENT_TR_ACTIONS = { duration: 0.65, delay: 0.4, ease: EASE_OUT };

// ─── FALLBACK SLIDES (image-only) ─────────────────────────────────────────────
const fallbackSlides = [
    { id: 1, title: "Premium Riding Helmets", subtitle: "Engineered for safety, designed for style", cta: "Shop Helmets", desktopImage: slide1, mobileImage: slide1, route: "helmets"  },
    { id: 2, title: "All Weather Jackets",    subtitle: "Protection for every ride, every season",  cta: "Shop Jackets", desktopImage: slide2, mobileImage: slide2, route: "jackets"  },
    { id: 3, title: "Travel Luggage Systems", subtitle: "Adventure-ready gear built to last",       cta: "Shop Luggage", desktopImage: slide3, mobileImage: slide3, route: "luggage"  },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const resolveAsset = (src) => {
    if (!src) return null;
    if (src.startsWith("/assets") || src.startsWith("data:")) return src;
    if (src.startsWith("http")) return src;
    return `${API}${src.startsWith("/") ? "" : "/"}${src}`;
};

const stampCloudinaryVersion = (src, updatedAt) => {
    if (!src || !updatedAt || !src.includes("res.cloudinary.com")) return src;
    const ts = Math.floor(new Date(updatedAt).getTime() / 1000);
    if (!ts) return src;
    if (/\/v\d+\//.test(src)) return src.replace(/\/v\d+\//, `/v${ts}/`);
    return src.replace(/(\/upload\/)/, `$1v${ts}/`);
};

const CLOUDINARY_WIDTHS = [640, 960, 1280, 1920];
const cloudinaryTransform = (src, width = 1280) => {
    if (!src || !src.includes("res.cloudinary.com")) return src;
    if (src.includes("/f_auto") || src.includes("f_auto,")) return src;
    return src.replace(/(\/upload\/)/, `$1f_auto,q_auto,w_${width},dpr_auto/`);
};
const buildCloudinarySrcset = (src) => {
    if (!src || !src.includes("res.cloudinary.com")) return undefined;
    return CLOUDINARY_WIDTHS.map(w => `${cloudinaryTransform(src, w)} ${w}w`).join(", ");
};

/**
 * Pick the correct image URL for the current viewport.
 * Falls back: mobileImage → desktopImage → legacy image field.
 */
const resolveSlideImage = (slide, isMobile) => {
    if (isMobile) {
        return slide.mobileImage || slide.desktopImage || slide.image || null;
    }
    return slide.desktopImage || slide.image || null;
};

/**
 * Normalise API response — ensure every slide has desktopImage / mobileImage.
 * Handles legacy DB documents that only have `image`.
 */
const normaliseSlides = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0) return fallbackSlides;
    return raw.map(s => ({
        ...s,
        desktopImage: s.desktopImage || s.image || "",
        mobileImage:  s.mobileImage  || s.desktopImage || s.image || "",
    }));
};

// ─── STATIC ICONS ─────────────────────────────────────────────────────────────
const ICON_ARROW_RIGHT = (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// ─── POINTER DRAG HOOK [SW1] ──────────────────────────────────────────────────
function usePointerDrag({ onNext, onPrev, sectionRef }) {
    const drag = useRef({ active: false, startX: 0, startY: 0, startTime: 0, isH: null, captured: false });

    const onPointerDown = useCallback((e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        // Do NOT capture pointer here — capturing on every pointerdown swallows
        // all subsequent click events on child buttons. Capture only once we
        // confirm a horizontal drag in onPointerMove.
        drag.current = { active: true, startX: e.clientX, startY: e.clientY, startTime: performance.now(), isH: null, captured: false, pointerId: e.pointerId };
    }, []);

    const onPointerMove = useCallback((e) => {
        const d = drag.current;
        if (!d.active) return;
        const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
        if (d.isH === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
            d.isH = Math.abs(dx) >= Math.abs(dy);
            // Only capture pointer once we know it's a horizontal drag
            if (d.isH && !d.captured) {
                sectionRef.current?.setPointerCapture?.(d.pointerId);
                d.captured = true;
            }
        }
        if (!d.isH) return;
        e.preventDefault();
    }, [sectionRef]);

    const onPointerUp = useCallback((e) => {
        const d = drag.current;
        if (!d.active) return;
        d.active = false;
        // isH === null means clean tap — no drag detected, let click fire normally
        if (!d.isH) return;
        const dx  = e.clientX - d.startX;
        const vel = Math.abs(dx) / Math.max(performance.now() - d.startTime, 1);
        if (Math.abs(dx) > 40 || vel > 0.3) dx < 0 ? onNext() : onPrev();
    }, [onNext, onPrev]);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

// ─── SLIDE CONTENT [D5] ───────────────────────────────────────────────────────
const SlideContent = memo(({ slide, onNavigateCta, onNavigateStore }) => (
    <div className="carousel-content">
        <motion.span className="carousel-eyebrow"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }} transition={CONTENT_TR_EYEBROW}>
            MotoPark Collection
        </motion.span>
        <motion.h2 className="carousel-title"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }} transition={CONTENT_TR_TITLE}>
            {slide.title}
        </motion.h2>
        <motion.p className="carousel-subtitle"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }} transition={CONTENT_TR_SUB}>
            {slide.subtitle}
        </motion.p>
        <motion.div className="carousel-actions"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }} transition={CONTENT_TR_ACTIONS}>
            <button className="carousel-cta" onClick={onNavigateCta}>
                {slide.cta || "Explore Collection"}{ICON_ARROW_RIGHT}
            </button>
            <button className="carousel-cta-ghost" onClick={onNavigateStore}>
                View All Gear
            </button>
        </motion.div>
    </div>
));
SlideContent.displayName = "SlideContent";

// ─── PROGRESS BAR [D3] ────────────────────────────────────────────────────────
const ProgressBar = memo(({ count, index, paused, onGoTo, currentIndex }) => (
    <div className="carousel-progress" role="tablist" aria-label="Carousel slides">
        {Array.from({ length: count }, (_, i) => {
            const isActive = i === index;
            return (
                <button
                    key={i}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    aria-label={`Go to slide ${i + 1}`}
                    className={[
                        "carousel-progress__seg",
                        isActive ? "carousel-progress__seg--active" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => onGoTo(i, i > currentIndex ? 1 : -1)}
                >
                    {isActive && (
                        <span
                            className="carousel-progress__fill"
                            style={{ animationPlayState: paused ? "paused" : "running" }}
                        />
                    )}
                </button>
            );
        })}
    </div>
));
ProgressBar.displayName = "ProgressBar";

// ─── SLIDE IMAGE ──────────────────────────────────────────────────────────────
const SlideImage = memo(({ src, updatedAt, isActive, isMobile }) => {
    const versioned   = useMemo(() => stampCloudinaryVersion(resolveAsset(src), updatedAt), [src, updatedAt]);
    const transformed = useMemo(() => cloudinaryTransform(versioned, isMobile ? 960 : 1280), [versioned, isMobile]);
    const srcSet      = useMemo(() => buildCloudinarySrcset(versioned), [versioned]);

    if (!src || !transformed) return null;
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
            width={isMobile ? 960 : 1920}
            height={isMobile ? 540 : 1080}
            aria-hidden="true"
            onError={e => { e.currentTarget.style.display = "none"; }}
        />
    );
});
SlideImage.displayName = "SlideImage";

// ─── SLIDE VARIANTS (crossfade + scale) [D4] ─────────────────────────────────
const makeSlideVariants = (isMobile) => ({
    enter: () => ({ opacity: 0, scale: 1.03, ...(isMobile ? {} : { filter: "blur(3px)" }) }),
    center:    ({ opacity: 1, scale: 1,    ...(isMobile ? {} : { filter: "blur(0px)" }) }),
    exit:  () => ({ opacity: 0, scale: 0.97, ...(isMobile ? {} : { filter: "blur(4px)" }) }),
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const PremiumCarousel = () => {
    const [slides, setSlides] = useState(null);
    const [index,  setIndex]  = useState(0);

    const pausedRef      = useRef(false);
    const slidesRef      = useRef(null);
    const indexRef       = useRef(0);
    const timerRef       = useRef(null);
    const directionRef   = useRef(1);
    const sectionRef     = useRef(null);
    const liveRef        = useRef(null);

    slidesRef.current = slides;
    indexRef.current  = index;

    const navigate = useNavigate();

    // SSR-safe mobile detection [SSR1]
    const [isMobileDevice, setIsMobileDevice] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(max-width: 767px)").matches;
    });

    const handleResize = useCallback(() => {
        setIsMobileDevice(window.matchMedia("(max-width: 767px)").matches);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        if (mq.addEventListener) {
            mq.addEventListener("change", handleResize, { passive: true });
            return () => mq.removeEventListener("change", handleResize);
        }
        window.addEventListener("resize", handleResize, { passive: true });
        return () => window.removeEventListener("resize", handleResize);
    }, [handleResize]);

    // Parallax on desktop [RE1]
    const parallaxRef = useParallax({ speed: isMobileDevice ? 0 : 0.4 });

    // Slide variants — rebuild only on breakpoint flip [RE4]
    const SLIDE_VARIANTS = useMemo(() => makeSlideVariants(isMobileDevice), [isMobileDevice]);

    // Fetch [NET1] — always fetch fresh on mount, reset guard on unmount
    useEffect(() => {
        _fetching = false; // reset on every mount so remounts always re-fetch
        const ctrl = new AbortController();

        fetch(`${API}/carousel?source=premium`, {
            cache: "no-store",
            signal: ctrl.signal,
        })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                const apiSlides = Array.isArray(data) && data.length > 0
                    ? normaliseSlides(data)
                    : fallbackSlides;
                setSlides(apiSlides);
            })
            .catch(err => {
                if (err.name !== "AbortError") setSlides(fallbackSlides);
            });

        return () => { ctrl.abort(); _fetching = false; };
    }, []);

    // Preload images [IM1]
    useEffect(() => {
        if (!slides) return;
        const preload = (slide, priority, mobile) => {
            const src = resolveSlideImage(slide, mobile);
            if (!src) return;
            const img = new Image();
            img.fetchPriority = priority;
            img.src = cloudinaryTransform(
                stampCloudinaryVersion(resolveAsset(src), slide.updatedAt),
                mobile ? 960 : 1280
            );
        };
        preload(slides[0], "high", isMobileDevice);
        let id;
        const rest = () => slides.slice(1).forEach(s => preload(s, "low", isMobileDevice));
        if ("requestIdleCallback" in window) id = requestIdleCallback(rest, { timeout: 2000 });
        else id = setTimeout(rest, 300);
        return () => {
            if ("requestIdleCallback" in window) cancelIdleCallback(id);
            else clearTimeout(id);
        };
    }, [slides, isMobileDevice]);

    // Timer [VIS1, MEM1]
    const startTimer = useCallback(() => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (pausedRef.current) return;
            const s = slidesRef.current;
            if (!s) return;
            directionRef.current = 1;
            setIndex(p => (p + 1) % s.length);
        }, AUTO_DURATION_MS);
    }, []);

    useEffect(() => {
        if (!slides) return;
        startTimer();
        const onVis = () => {
            if (document.hidden) {
                clearInterval(timerRef.current);
                document.documentElement.setAttribute("data-page-hidden", "true");
            } else {
                document.documentElement.removeAttribute("data-page-hidden");
                startTimer();
            }
        };
        document.addEventListener("visibilitychange", onVis);
        return () => {
            clearInterval(timerRef.current);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [slides, startTimer]);

    // Navigation
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

    // Hover pause [RE5]
    const handleMouseEnter = useCallback(() => {
        pausedRef.current = true;
        sectionRef.current?.setAttribute("data-paused", "true");
    }, []);
    const handleMouseLeave = useCallback(() => {
        pausedRef.current = false;
        sectionRef.current?.removeAttribute("data-paused");
    }, []);

    const handleNavigateCta   = useCallback(() => { navigate(`/category/${slides?.[index]?.route}`); }, [navigate, slides, index]);
    const handleNavigateStore = useCallback(() => { navigate("/store"); }, [navigate]);

    // Pointer drag [SW1]
    const dragHandlers = usePointerDrag({ onNext: next, onPrev: prev, sectionRef });

    // ARIA live [A11a]
    useEffect(() => {
        if (!slides || !liveRef.current) return;
        liveRef.current.textContent = `Slide ${index + 1} of ${slides.length}: ${slides[index]?.title ?? ""}`;
    }, [index, slides]);

    // Keyboard nav [A11b]
    const onKeyDown = useCallback((e) => {
        if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
        if (e.key === "ArrowRight") { e.preventDefault(); next(); }
        if (e.key === "Home")       { e.preventDefault(); goTo(0, 1); }
        if (e.key === "End")        { e.preventDefault(); slides && goTo(slides.length - 1, -1); }
    }, [prev, next, goTo, slides]);

    // ─── LOADING ──────────────────────────────────────────────────────────────
    if (slides === null) {
        return (
            <div className="carousel-skeleton" role="img"
                aria-label="Loading carousel" aria-busy="true" />
        );
    }

    const slide    = slides[index];
    const slideKey = slide.id ?? slide._id ?? slide.slug ?? index;
    const imageSrc = resolveSlideImage(slide, isMobileDevice);

    return (
        <section
            ref={sectionRef}
            className="carousel"
            aria-label="Featured collections"
            aria-roledescription="carousel"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...dragHandlers}
        >
            {/* ARIA live region [A11a] */}
            <span ref={liveRef} className="carousel-sr-announce"
                aria-live="polite" aria-atomic="true" />

            {/* ── SLIDES [D4] ── */}
            <AnimatePresence mode="sync" custom={directionRef.current}>
                <motion.div
                    key={slideKey}
                    className="carousel-slide carousel-slide--active"
                    custom={directionRef.current}
                    variants={SLIDE_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={SLIDE_TRANSITION}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
                >
                    {/* Background */}
                    <div className="carousel-bg-wrap"
                        ref={!isMobileDevice ? parallaxRef : undefined}>
                        <SlideImage
                            src={imageSrc}
                            updatedAt={slide.updatedAt}
                            isActive={true}
                            isMobile={isMobileDevice}
                        />
                    </div>

                    <div className="carousel-overlay" aria-hidden="true" />

                    {/* Slide content */}
                    <SlideContent
                        slide={slide}
                        onNavigateCta={handleNavigateCta}
                        onNavigateStore={handleNavigateStore}
                    />

                    {/* Counter */}
                    <div className="carousel-counter" aria-hidden="true">
                        <span className="carousel-counter-cur">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="carousel-counter-sep" />
                        <span className="carousel-counter-total">
                            {String(slides.length).padStart(2, "0")}
                        </span>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* ── PROGRESS BAR [D3] ── */}
            <ProgressBar
                count={slides.length}
                index={index}
                paused={false}
                onGoTo={goTo}
                currentIndex={index}
            />
        </section>
    );
};

export default PremiumCarousel;