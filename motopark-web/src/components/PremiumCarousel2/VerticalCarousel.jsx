/**
 * VerticalCarousel.jsx — MotoPark Home Page Section
 *
 * SCOPE
 * ─────────────────────────────────────────────────────────────────────────────
 * Image-only vertical-swipe carousel. Slides advance upward (next) or downward
 * (prev). Full-bleed section (100vw × 100vh), sits behind Navbar.
 *
 * DATA
 *   - Fetches from GET /carousel (same endpoint as AdminCarouselManager).
 *   - Only image slides are rendered; video slides (type:"video") fall back to
 *     their poster/image field, so all 5 admin slots work seamlessly.
 *
 * TRANSITIONS
 *   - AnimatePresence mode="sync" for true crossfade + vertical translate.
 *   - New slide enters from below (next) or above (prev).
 *   - Slide image does a subtle Ken Burns zoom while active.
 *
 * NAVIGATION
 *   - Mouse wheel / trackpad scroll (debounced, one step per gesture).
 *   - Pointer drag (vertical swipe) via native Pointer Events.
 *   - Keyboard: ArrowUp / ArrowDown / Home / End.
 *   - Side dot-track indicator (clickable).
 *   - Autoplay every AUTO_DURATION_MS ms.
 *
 * ADMIN COMPATIBILITY
 *   Fields consumed from each slide object:
 *     image      — background (required; falls back to video poster)
 *     title      — headline text
 *     subtitle   — body text
 *     cta        — primary button label
 *     route      — navigates to /category/<route>
 *     updatedAt  — Cloudinary cache-bust version stamp
 *     _id / id / slug — React key
 *
 * [VIS1] Page Visibility API pauses autoplay on hidden tab.
 * [A11]  ARIA live region (imperative, no re-render).
 * [RE5]  Hover pause via data attribute → CSS only.
 * [NET1] In-flight fetch guard.
 * [SSR1] Hydration-safe mobile detection.
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
import "./VerticalCarousel.css";
import { API }         from "@/config/api";
import { cachedFetch } from "@/lib/apiCache";

// ─── HMR guard ────────────────────────────────────────────────────────────────
if (import.meta.hot) {
    import.meta.hot.accept(() => { _fetching = false; });
}
let _fetching = false;

// ─── Fallback assets ──────────────────────────────────────────────────────────
const slide1 = "/assets/carousel/carousel-1.svg";
const slide2 = "/assets/carousel/carousel-2.svg";
const slide3 = "/assets/carousel/carousel-3.svg";

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTO_DURATION_MS = 5500;
const EASE_OUT         = [0.16, 1, 0.3, 1];

const SLIDE_TRANSITION = { duration: 0.85, ease: EASE_OUT };
const TR_EYEBROW       = { duration: 0.5,  delay: 0.12, ease: EASE_OUT };
const TR_TITLE         = { duration: 0.65, delay: 0.22, ease: EASE_OUT };
const TR_SUB           = { duration: 0.65, delay: 0.34, ease: EASE_OUT };
const TR_ACTIONS       = { duration: 0.65, delay: 0.44, ease: EASE_OUT };
const TR_META          = { duration: 0.5,  delay: 0.5,  ease: EASE_OUT };

// ─── Fallback slides (image-only) ─────────────────────────────────────────────
// ─── Fallback slides (image-only) ─────────────────────────────────────────────
const fallbackSlides = [
    { id: 1, title: "Premium Riding Helmets",  subtitle: "Engineered for safety, designed for style",  cta: "Shop Helmets", desktopImage: slide1, mobileImage: slide1, route: "helmets"  },
    { id: 2, title: "All Weather Jackets",     subtitle: "Protection for every ride, every season",   cta: "Shop Jackets", desktopImage: slide2, mobileImage: slide2, route: "jackets"  },
    { id: 3, title: "Travel Luggage Systems",  subtitle: "Adventure-ready gear built to last",        cta: "Shop Luggage", desktopImage: slide3, mobileImage: slide3, route: "luggage"  },
];

// ─── Cloudinary helpers (mirrors PremiumCarousel) ─────────────────────────────
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
const cloudinaryTransform = (src, width = 1280) => {
    if (!src || !src.includes("res.cloudinary.com")) return src;
    if (src.includes("/f_auto") || src.includes("f_auto,")) return src;
    return src.replace(/(\/upload\/)/, `$1f_auto,q_auto,w_${width},dpr_auto/`);
};
const CLOUDINARY_WIDTHS = [640, 960, 1280, 1920];
const buildSrcset = (src) => {
    if (!src || !src.includes("res.cloudinary.com")) return undefined;
    return CLOUDINARY_WIDTHS.map(w => `${cloudinaryTransform(src, w)} ${w}w`).join(", ");
};

// ─── Normalise API data — keep image-only, use .image for video slides ────────
// ─── Normalise API data — resolve desktopImage / mobileImage / legacy image ──
const normaliseSlides = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0) return fallbackSlides;
    return raw
        .filter(s => s.desktopImage || s.image || s.poster)
        .map(s => ({
            ...s,
            desktopImage: s.desktopImage || s.image || s.poster || "",
            mobileImage:  s.mobileImage  || s.desktopImage || s.image || s.poster || "",
        }))
        .slice(0, 8);
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconArrow = (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const IconChevronUp = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const IconChevronDown = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// ─── Vertical pointer drag hook ───────────────────────────────────────────────
function useVerticalDrag({ onNext, onPrev, sectionRef }) {
    const drag = useRef({ active: false, startY: 0, startX: 0, startTime: 0, isV: null });

    const onPointerDown = useCallback((e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        drag.current = { active: true, startY: e.clientY, startX: e.clientX, startTime: performance.now(), isV: null };
        sectionRef.current?.setPointerCapture?.(e.pointerId);
    }, [sectionRef]);

    const onPointerMove = useCallback((e) => {
        const d = drag.current;
        if (!d.active) return;
        const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
        if (d.isV === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
            d.isV = Math.abs(dy) >= Math.abs(dx);
        }
        if (!d.isV) return;
        e.preventDefault();
    }, []);

    const onPointerUp = useCallback((e) => {
        const d = drag.current;
        if (!d.active) return;
        d.active = false;
        if (!d.isV) return;
        const dy  = e.clientY - d.startY;
        const vel = Math.abs(dy) / Math.max(performance.now() - d.startTime, 1);
        if (Math.abs(dy) > 40 || vel > 0.3) dy < 0 ? onNext() : onPrev();
    }, [onNext, onPrev]);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

// ─── Slide background image ───────────────────────────────────────────────────
const SlideBg = memo(({ src, updatedAt, isActive }) => {
    const versioned   = useMemo(() => stampCloudinaryVersion(resolveAsset(src), updatedAt), [src, updatedAt]);
    const transformed = useMemo(() => cloudinaryTransform(versioned, 1280), [versioned]);
    const srcSet      = useMemo(() => buildSrcset(versioned), [versioned]);
    if (!src || !transformed) return null;
    return (
        <img
            src={transformed}
            srcSet={srcSet}
            sizes="(max-width: 768px) 100vw, 100vw"
            alt=""
            className="vc-bg-img"
            loading="eager"
            fetchPriority={isActive ? "high" : "low"}
            decoding="async"
            width="1920" height="1080"
            aria-hidden="true"
            onError={e => { e.currentTarget.style.display = "none"; }}
        />
    );
});
SlideBg.displayName = "SlideBg";

// ─── Slide content ────────────────────────────────────────────────────────────
const SlideContent = memo(({ slide, index, total, onCtaClick, onAllClick }) => (
    <div className="vc-content">
        {/* eyebrow */}
        <motion.span
            className="vc-eyebrow"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={TR_EYEBROW}
        >
            MotoPark Collection
        </motion.span>

        {/* title */}
        <motion.h2
            className="vc-title"
            initial={{ opacity: 0, y: 52 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={TR_TITLE}
        >
            {slide.title}
        </motion.h2>

        {/* subtitle */}
        <motion.p
            className="vc-subtitle"
            initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={TR_SUB}
        >
            {slide.subtitle}
        </motion.p>

        {/* actions */}
        <motion.div
            className="vc-actions"
            initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={TR_ACTIONS}
        >
            <button className="vc-cta" onClick={onCtaClick}>
                {slide.cta || "Explore Collection"}{IconArrow}
            </button>
            <button className="vc-ghost" onClick={onAllClick}>
                View All Gear
            </button>
        </motion.div>

        {/* slide counter in content */}
        <motion.div
            className="vc-meta"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={TR_META}
        >
            <span className="vc-meta-cur">{String(index + 1).padStart(2, "0")}</span>
            <span className="vc-meta-sep"/>
            <span className="vc-meta-total">{String(total).padStart(2, "0")}</span>
        </motion.div>
    </div>
));
SlideContent.displayName = "SlideContent";

// ─── Dot track (right rail) ───────────────────────────────────────────────────
const DotTrack = memo(({ count, active, paused, onGoTo }) => (
    <div className="vc-dots" role="tablist" aria-label="Carousel slides">
        {Array.from({ length: count }, (_, i) => {
            const isActive = i === active;
            return (
                <button
                    key={i}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    aria-label={`Go to slide ${i + 1}`}
                    className={["vc-dot", isActive ? "vc-dot--active" : ""].filter(Boolean).join(" ")}
                    onClick={() => onGoTo(i, i > active ? 1 : -1)}
                >
                    {isActive && (
                        <span
                            className="vc-dot-fill"
                            style={{ animationPlayState: paused ? "paused" : "running" }}
                        />
                    )}
                </button>
            );
        })}
    </div>
));
DotTrack.displayName = "DotTrack";

// ─── Arrow buttons (right side, stacked) ──────────────────────────────────────
const NavArrows = memo(({ onPrev, onNext }) => (
    <div className="vc-arrows">
        <button className="vc-arrow" onClick={onPrev} aria-label="Previous slide">
            {IconChevronUp}
        </button>
        <button className="vc-arrow" onClick={onNext} aria-label="Next slide">
            {IconChevronDown}
        </button>
    </div>
));
NavArrows.displayName = "NavArrows";

// ─── Slide variants (vertical) ────────────────────────────────────────────────
const makeVariants = () => ({
    enter: (d) => ({ opacity: 0, y: d > 0 ? "6%"  : "-6%",  scale: 1.03 }),
    center:       ({ opacity: 1, y: "0%", scale: 1 }),
    exit:  (d) => ({ opacity: 0, y: d > 0 ? "-4%" : "4%",   scale: 0.97 }),
});
const SLIDE_VARIANTS = makeVariants();

// ─── Main component ───────────────────────────────────────────────────────────
const VerticalCarousel = () => {
    const [slides,  setSlides]  = useState(null);
    const [index,   setIndex]   = useState(0);

    const pausedRef    = useRef(false);
    const slidesRef    = useRef(null);
    const indexRef     = useRef(0);
    const timerRef     = useRef(null);
    const directionRef = useRef(1);
    const sectionRef   = useRef(null);
    const liveRef      = useRef(null);
    const wheelRef     = useRef(false);     // debounce wheel events

    slidesRef.current = slides;
    indexRef.current  = index;

    const navigate = useNavigate();

// SSR-safe mobile flag [SSR1] — also used to pick desktopImage vs mobileImage
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== "undefined" && window.matchMedia("(max-width:767px)").matches
    );
    useEffect(() => {
        const mq = window.matchMedia("(max-width:767px)");
        const h  = () => setIsMobile(mq.matches);
        mq.addEventListener ? mq.addEventListener("change", h, { passive: true })
                            : window.addEventListener("resize", h, { passive: true });
        return () => mq.removeEventListener ? mq.removeEventListener("change", h)
                                            : window.removeEventListener("resize", h);
    }, []);

    // Fetch [NET1]
    useEffect(() => {
        if (_fetching) return;
        _fetching = true;
        const ctrl = new AbortController();
      cachedFetch(`${API}/carousel?source=vertical`, { freshOnly: true, signal: ctrl.signal })
            .then(data => setSlides(normaliseSlides(data)))
            .catch(err  => { if (err.name !== "AbortError") setSlides(normaliseSlides([])); })
            .finally(()  => { _fetching = false; });
        return () => { ctrl.abort(); _fetching = false; };
    }, []);

    // Preload [IM1]
    useEffect(() => {
        if (!slides) return;
const preload = (s, priority) => {
            const src = isMobile
                ? (s?.mobileImage  || s?.desktopImage || s?.image)
                : (s?.desktopImage || s?.image);
            if (!src) return;
            const img = new Image();
            img.fetchPriority = priority;
            img.src = cloudinaryTransform(
                stampCloudinaryVersion(resolveAsset(src), s.updatedAt), isMobile ? 960 : 1280
            );
        };
        preload(slides[0], "high");
        let id;
        const rest = () => slides.slice(1).forEach(s => preload(s, "low"));
        if ("requestIdleCallback" in window) id = requestIdleCallback(rest, { timeout: 2000 });
        else id = setTimeout(rest, 400);
        return () => { "requestIdleCallback" in window ? cancelIdleCallback(id) : clearTimeout(id); };
    }, [slides]);

    // Autoplay + visibility [VIS1, MEM1]
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

    // CTA nav
    const handleCta = useCallback(() => {
        navigate(`/category/${slides?.[index]?.route}`);
    }, [navigate, slides, index]);
    const handleAll = useCallback(() => { navigate("/store"); }, [navigate]);

    // Pointer drag
  const dragHandlers = {};

    // Mouse wheel — one step per gesture (debounced)
const handleWheel = useCallback(() => {}, []);

    // Keyboard [A11b]
    const onKeyDown = useCallback((e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); next(); }
        if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
        if (e.key === "Home") { e.preventDefault(); goTo(0, -1); }
        if (e.key === "End")  { e.preventDefault(); slides && goTo(slides.length - 1, 1); }
    }, [next, prev, goTo, slides]);

    // ARIA live [A11a]
    useEffect(() => {
        if (!slides || !liveRef.current) return;
        liveRef.current.textContent =
            `Slide ${index + 1} of ${slides.length}: ${slides[index]?.title ?? ""}`;
    }, [index, slides]);

    // ── Loading ──
    if (slides === null) {
        return <div className="vc-skeleton" role="img" aria-label="Loading" aria-busy="true"/>;
    }

    const slide    = slides[index];
    const slideKey = slide._id ?? slide.id ?? slide.slug ?? index;

    return (
        <section
            ref={sectionRef}
            className="vc"
            aria-label="Featured collections"
            aria-roledescription="carousel"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            // onWheel={handleWheel}
            {...dragHandlers}
        >
            {/* ARIA live */}
            <span ref={liveRef} className="vc-sr" aria-live="polite" aria-atomic="true"/>

            {/* ── Slides ── */}
            <AnimatePresence mode="sync" custom={directionRef.current}>
                <motion.div
                    key={slideKey}
                    className="vc-slide vc-slide--active"
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
                    <div className="vc-bg-wrap">
                       <SlideBg
                            src={isMobile
                                ? (slide.mobileImage  || slide.desktopImage || slide.image)
                                : (slide.desktopImage || slide.image)}
                            updatedAt={slide.updatedAt}
                            isActive={true}
                        />
                    </div>

                    {/* Overlays */}
                    <div className="vc-overlay" aria-hidden="true"/>
                    <div className="vc-overlay-bottom" aria-hidden="true"/>

                    {/* Content */}
                    <SlideContent
                        slide={slide}
                        index={index}
                        total={slides.length}
                        onCtaClick={handleCta}
                        onAllClick={handleAll}
                    />
                </motion.div>
            </AnimatePresence>

            {/* ── Right rail: dots + arrows ── */}
            <DotTrack
                count={slides.length}
                active={index}
                paused={false}
                onGoTo={goTo}
            />
            null
            {/* ── Scroll hint (visible until first interaction) ── */}
null
        </section>
    );
};

export default VerticalCarousel;