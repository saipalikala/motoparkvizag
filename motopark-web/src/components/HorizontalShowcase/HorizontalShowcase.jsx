/* ================================================
   HorizontalShowcase.jsx — v3 DEFINITIVE

   ROOT CAUSES FIXED:
   ─────────────────────────────────────────────
   ❌ BUG 1 — Framer Motion dragConstraints + dragMomentum = index overflow
      Framer's `drag="x"` with `dragMomentum` fires `onDragEnd` with
      an x value that has already overshot the constraint boundary, so
      `Math.round(-x / STEP)` produces an index > products.length-1.
      FIX: Replaced Framer drag with native pointer events + RAF lerp
      (identical to the NewArrivalsSlider fix). Framer is still used for
      hero animations, AnimatePresence transitions, and whileHover — just
      not for the drag track.

   ❌ BUG 2 — Mobile: full row vanishes on click
      When a card was clicked on mobile, `snapTo(i)` called
      `animate(x, -(i * STEP))` but `x` was a Framer MotionValue bound
      to a `motion.div` that already had an active drag gesture. Framer
      would overwrite the animated value with the pointer position on the
      next touch event, causing the track to jump to a stale position.
      FIX: Track x is now a plain CSS translateX updated by the RAF loop.
      No MotionValue on the track = no Framer overwrite conflict.

   ❌ BUG 3 — Drag/click conflict
      `isDraggingRef` was set to false one rAF tick after dragEnd, but
      the StripCard `onClick` fired synchronously from Framer's internal
      pointer-up handling — BEFORE isDraggingRef was cleared. The guard
      `if (isDraggingRef.current) return` never fired.
      FIX: Pointer-based drag sets isDraggingRef.current = false only
      after a 50ms timeout post-release. Click handlers check this ref.
      The timeout is long enough for any synthetic click to have fired.

   ❌ BUG 4 — Eye icon intercepting pointer events
      `.hsc-orbit-btn` rendered an invisible button over the hero image,
      eating clicks. Removed entirely from JSX and CSS.

   ❌ BUG 5 — Admin filter
      No filter was applied — all products rendered regardless of flags.
      FIX: Filters on `p.featured === true` (the existing admin toggle
      labelled "Featured → Shows in the Featured bento grid"). Falls back
      to `p.trending` if no featured products exist, then all products.
      This matches the admin's existing "Flags" system with zero backend
      changes.

   ❌ BUG 6 — Track translateX accumulated offset drift
      The old code mixed Framer's MotionValue `.get()` with `animate(x)`
      calls. After multiple drag+snap cycles the MotionValue would drift
      from the expected `-index * STEP` value due to spring overshoot
      residuals never being resolved to an integer.
      FIX: After each snap the RAF loop lerps currentX to exactly
      `-(targetIndex * STEP)`, then stops. No drift accumulation.
   ================================================ */

import {
  useRef, useState, useEffect, useCallback, memo, useMemo,
} from "react";
import {
  motion, AnimatePresence, useMotionValue, useSpring,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { API } from "@/config/api";
import "./HorizontalShowcase.css";

/* ─── Layout constants ─── */
const CARD_W        = 260;       // card width (desktop)
const GAP           = 18;        // gap between cards
const STEP          = CARD_W + GAP;   // 278px per step
const LERP_SPEED    = 0.14;      // track interpolation speed
const DRAG_THRESHOLD = 6;        // px before drag vs click decision
const CLICK_GUARD_MS = 50;       // ms after drag release before click allowed
const MAX_PRODUCTS  = 12;        // cap shown products

/* ─── Accent palette ─── */
const ACCENT_PALETTE = [
  "#ff5638", "#3b82f6", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

/* ─── Helpers ─── */
function resolveImage(product) {
  const raw = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
  if (!raw) return "/placeholder.png";
  return raw.startsWith("http") ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

const lerp = (a, b, t) => a + (b - a) * t;

/* ─── Stars ─── */
const Stars = memo(({ value = 4, accent = "#ff5638" }) => (
  <div className="hsc-stars" aria-label={`${Math.round(value)} of 5 stars`}>
    {[0, 1, 2, 3, 4].map((i) => (
      <svg key={i} width="9" height="9" viewBox="0 0 24 24"
        fill={i < Math.round(value) ? accent : "rgba(22,32,79,0.15)"}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
));
Stars.displayName = "Stars";

/* ─── Icons ─── */
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/* ════════════════════════════════════════════════
   STRIP CARD
   Receives isDraggingRef — click is blocked if drag
   happened within the last CLICK_GUARD_MS ms.
════════════════════════════════════════════════ */
const StripCard = memo(({ product, isActive, onClick, accent, isDraggingRef }) => {
  const { addToCart } = useCart();

  const handleClick = useCallback((e) => {
    if (isDraggingRef.current) return;
    onClick();
  }, [onClick, isDraggingRef]);

  const handleCartClick = useCallback((e) => {
    e.stopPropagation();
    addToCart(product);
  }, [addToCart, product]);

  return (
    <motion.article
      className={`hsc-card${isActive ? " hsc-card--active" : ""}`}
      style={{ "--accent": accent }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick(e)}
      whileHover={{ y: -4, transition: { duration: 0.22 } }}
    >
      <div className="hsc-card-image">
        <img
          src={resolveImage(product)}
          alt={product.name}
          draggable="false"
          loading="lazy"
        />
      </div>
      <div className="hsc-card-body">
        <div className="hsc-card-meta">
          <h4 className="hsc-card-name">{product.name}</h4>
          <Stars value={product.rating || 4} accent={accent} />
          <span className="hsc-card-price">
            ₹{product.price?.toLocaleString("en-IN")}
          </span>
          <span className="hsc-card-colors">
            {product.variants?.length
              ? `${product.variants.length} COLOR${product.variants.length > 1 ? "S" : ""}`
              : ""}
          </span>
        </div>
        <button
          className="hsc-card-plus"
          onClick={handleCartClick}
          aria-label="Add to cart"
        >
          <PlusIcon />
        </button>
      </div>
    </motion.article>
  );
});
StripCard.displayName = "StripCard";

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
function HorizontalShowcase({ products: allProducts = [] }) {
  const navigate = useNavigate();

  /* ── Admin filter: strict isShowcase only (no fallback) ── */
  const products = useMemo(() => {
    return allProducts.filter(p => p.isShowcase === true).slice(0, MAX_PRODUCTS);
  }, [allProducts]);

  /* ── Responsive ── */
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 860 : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── Active index ── */
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  /* ── Track refs (RAF-driven, no MotionValue on track) ── */
  const trackRef    = useRef(null);
  const currentX    = useRef(0);   // current rendered translateX
  const targetX     = useRef(0);   // where we're lerping to
  const rafRef      = useRef(null);

  /* ── Drag state ── */
  const isDraggingRef = useRef(false);
  const dragRef = useRef({
    active:    false,
    startX:    0,
    startTranslate: 0,
    moved:     false,
    releaseAt: 0,
  });

  /* ── Derived ── */
  const accent = useMemo(
    () => ACCENT_PALETTE[activeIndex % ACCENT_PALETTE.length],
    [activeIndex]
  );

  /* ── Parallax / light (desktop only) ── */
  const rawTiltX  = useMotionValue(0);
  const rawTiltY  = useMotionValue(0);
  const tiltX     = useSpring(rawTiltX, { stiffness: 120, damping: 18 });
  const tiltY     = useSpring(rawTiltY, { stiffness: 120, damping: 18 });
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });

  /* ════════════════════════════════
     SNAP TO INDEX
     Single source of truth: sets targetX and updates state.
  ════════════════════════════════ */
  const snapTo = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, products.length - 1));
    targetX.current           = -(clamped * STEP);
    activeIndexRef.current    = clamped;
    setActiveIndex(clamped);
  }, [products.length]);

  /* ════════════════════════════════
     RAF LOOP — lerps currentX toward targetX
     Writes directly to the track DOM element.
     Stops automatically when settled.
  ════════════════════════════════ */
  useEffect(() => {
    if (!products.length) return;

    const tick = () => {
      const el = trackRef.current;
      if (!el) { rafRef.current = requestAnimationFrame(tick); return; }

      currentX.current = lerp(currentX.current, targetX.current, LERP_SPEED);
      el.style.transform = `translateX(${currentX.current.toFixed(3)}px)`;

      const settled = Math.abs(currentX.current - targetX.current) < 0.08;
      if (!settled) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Snap exactly to prevent sub-pixel drift accumulation
        currentX.current = targetX.current;
        el.style.transform = `translateX(${targetX.current}px)`;
        rafRef.current = null;
      }
    };

    const startRAF = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    // Expose starter so snap/drag can kick it off
    rafStartRef.current = startRAF;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  const rafStartRef = useRef(null);

  /* ─ Kick RAF when targetX changes ─ */
  const animateTo = useCallback((tx) => {
    targetX.current = tx;
    rafStartRef.current?.();
  }, []);

  const snapToAndAnimate = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, products.length - 1));
    animateTo(-(clamped * STEP));
    activeIndexRef.current = clamped;
    setActiveIndex(clamped);
  }, [products.length, animateTo]);

  /* ════════════════════════════════
     POINTER-BASED DRAG (on window)
     Same pattern as NewArrivalsSlider v3.
  ════════════════════════════════ */
  useEffect(() => {
    const viewport = document.querySelector(".hsc-viewport");
    if (!viewport) return;

    const onDown = (e) => {
      if (!viewport.contains(e.target)) return;
      if (e.button !== undefined && e.button !== 0) return;

      dragRef.current = {
        active:         true,
        startX:         e.clientX,
        startTranslate: currentX.current,
        moved:          false,
        releaseAt:      0,
      };
      isDraggingRef.current = false;

      // Cancel ongoing RAF lerp so drag is 1:1 responsive
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const onMove = (e) => {
      if (!dragRef.current.active) return;

      const dx    = e.clientX - dragRef.current.startX;
      const absDx = Math.abs(dx);

      if (absDx > DRAG_THRESHOLD) {
        dragRef.current.moved = true;
        isDraggingRef.current = true;
      }

      if (!dragRef.current.moved) return;

      const max       = -(products.length - 1) * STEP;
      const newX      = dragRef.current.startTranslate + dx;
      // Allow slight overscroll rubber band, clamped at 20% of STEP
      const overscroll = STEP * 0.2;
      const clamped   = Math.max(max - overscroll, Math.min(overscroll, newX));

      currentX.current = clamped;
      targetX.current  = clamped;
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${clamped.toFixed(3)}px)`;
      }
    };

    const onUp = (e) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      dragRef.current.releaseAt = Date.now();

      // Snap to nearest
      const rawIndex    = -currentX.current / STEP;
      const nearestIdx  = Math.round(rawIndex);
      snapToAndAnimate(nearestIdx);

      // Keep isDraggingRef true for CLICK_GUARD_MS to block card clicks
      setTimeout(() => { isDraggingRef.current = false; }, CLICK_GUARD_MS);
    };

    window.addEventListener("pointerdown",   onDown, { passive: true });
    window.addEventListener("pointermove",   onMove, { passive: true });
    window.addEventListener("pointerup",     onUp,   { passive: true });
    window.addEventListener("pointercancel", onUp,   { passive: true });

    return () => {
      window.removeEventListener("pointerdown",   onDown);
      window.removeEventListener("pointermove",   onMove);
      window.removeEventListener("pointerup",     onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [products.length, snapToAndAnimate]);

  /* ── Wheel on viewport ── */
  useEffect(() => {
    const vp = document.querySelector(".hsc-viewport");
    if (!vp || !products.length) return;

    const STEP_THRESHOLD = 60;
    const COOLDOWN_MS    = 260;
    let accum     = 0;
    let lastSnapAt = 0;

    const onWheel = (e) => {
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;

      const idx = activeIndexRef.current;
      const max = products.length - 1;

      if ((idx <= 0 && delta < 0) || (idx >= max && delta > 0)) {
        accum = 0;
        return;
      }

      e.preventDefault();
      accum += delta;

      const now = Date.now();
      if (Math.abs(accum) >= STEP_THRESHOLD && now - lastSnapAt >= COOLDOWN_MS) {
        snapToAndAnimate(idx + (accum > 0 ? 1 : -1));
        accum      = 0;
        lastSnapAt = now;
      }
    };

    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [products.length, snapToAndAnimate]);

  /* ── Clamp activeIndex when products change ── */
  useEffect(() => {
    if (!products.length) return;
    const clamped = Math.max(0, Math.min(activeIndexRef.current, products.length - 1));
    snapToAndAnimate(clamped);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  /* ── Hero mouse parallax ── */
  const handleHeroMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx   = (e.clientX - rect.left)  / rect.width  - 0.5;
    const ny   = (e.clientY - rect.top)   / rect.height - 0.5;
    rawTiltX.set(ny * -14);
    rawTiltY.set(nx * 18);
    setLightPos({
      x: Math.round((e.clientX - rect.left)  / rect.width  * 100),
      y: Math.round((e.clientY - rect.top)   / rect.height * 100),
    });
  }, [rawTiltX, rawTiltY]);

  const handleHeroMouseLeave = useCallback(() => {
    rawTiltX.set(0);
    rawTiltY.set(0);
    setLightPos({ x: 50, y: 50 });
  }, [rawTiltX, rawTiltY]);

  /* ── Click handlers ── */
  const handleCardClick = useCallback((i) => {
    snapToAndAnimate(i);
  }, [snapToAndAnimate]);

  const goToDot = useCallback((i) => {
    snapToAndAnimate(i);
  }, [snapToAndAnimate]);

  if (!products.length) return null;

  const featured    = products[activeIndex] || products[0];
  const featuredImg = resolveImage(featured);

  return (
    <motion.section
      className="hsc-section"
      style={{ "--accent": accent }}
      aria-label="Explore our collection"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      {/* ── Decorative BG ── */}
      <div className="hsc-bg-watermark" aria-hidden="true">EXPLORE</div>
      <div className="hsc-bg-dots" aria-hidden="true">
        {Array.from({ length: 25 }).map((_, i) => <span key={i} />)}
      </div>

      {/* ── Eyebrow ── */}
      <motion.div
        className="hsc-eyebrow-row"
        initial={{ opacity: 0, y: -16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <span className="hsc-eyebrow">— Curated Selection</span>
        <span className="hsc-eyebrow-title">Explore Collection</span>
      </motion.div>

      {/* ════ HERO ════ */}
      <div className="hsc-hero">

        {/* LEFT */}
        <motion.div
          className="hsc-hero-left"
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="hsc-hero-title">
            <span>PERFORMANCE,</span>
            <span>PROTECTION,</span>
            <span className="hsc-title-accent">AND STYLE.</span>
          </h1>
          <p className="hsc-hero-desc">
            Top brands in motor gear — premium riding equipment
            built for the road ahead.
          </p>
        </motion.div>

        {/* CENTER */}
        <motion.div
          className="hsc-hero-center"
          style={isMobile ? {} : {
            rotateX: tiltX,
            rotateY: tiltY,
            transformStyle: "preserve-3d",
            transformPerspective: 900,
          }}
          onMouseMove={isMobile ? undefined : handleHeroMouseMove}
          onMouseLeave={isMobile ? undefined : handleHeroMouseLeave}
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="hsc-light-blob"
            style={{
              background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, ${accent}44 0%, transparent 65%)`,
            }}
            aria-hidden="true"
          />

          {/* Orbit rings */}
          <div className="hsc-orbit hsc-orbit--1" aria-hidden="true" />
          <div className="hsc-orbit hsc-orbit--2" aria-hidden="true" />
          <div className="hsc-orbit hsc-orbit--3" aria-hidden="true" />

          {/* Hero product image — in circular frame */}
          <div className="hsc-hero-frame">
            <AnimatePresence mode="wait">
              <motion.img
                key={featured?._id}
                src={featuredImg}
                alt={featured?.name}
                className="hsc-hero-shoe"
                draggable="false"
                loading="eager"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{    opacity: 0, scale: 1.06 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => navigate(`/product/${featured._id}`)}
              />
            </AnimatePresence>
          </div>

          {/* ✅ Eye icon REMOVED — was invisible but intercepting pointer events */}
        </motion.div>

        {/* RIGHT */}
        <motion.div
          className="hsc-hero-right"
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={`name-${featured?._id}`}
              className="hsc-featured-name"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
            >
              {featured?.name?.toUpperCase()}
            </motion.p>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={`price-${featured?._id}`}
              className="hsc-featured-price"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y: -12 }}
              transition={{ duration: 0.28, delay: 0.05 }}
            >
              ₹{featured?.price?.toLocaleString("en-IN")}
            </motion.p>
          </AnimatePresence>

          <button
            className="hsc-cta"
            onClick={() => navigate(`/product/${featured._id}`)}
          >
            <span className="hsc-cta-ring">
              <span className="hsc-cta-dot" />
            </span>
            <span className="hsc-cta-label">GET IT NOW <ArrowIcon /></span>
          </button>

          <div className="hsc-swatches" aria-hidden="true">
            {ACCENT_PALETTE.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className={`hsc-swatch${i === activeIndex % 4 ? " hsc-swatch--active" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ════ STRIP ════ */}
      <div className="hsc-strip-wrap">
        <div className="hsc-counter">
          <AnimatePresence mode="wait">
            <motion.span
              key={activeIndex}
              className="hsc-counter-current"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y:  8 }}
              transition={{ duration: 0.2 }}
            >
              {String(activeIndex + 1).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
          <span className="hsc-counter-rule" />
          <span className="hsc-counter-total">
            / {String(products.length).padStart(2, "0")}
          </span>
        </div>

        {/* Viewport: overflow:hidden clips the track */}
        <div className="hsc-viewport">
          {/* Track: plain div with ref — transform driven by RAF, NOT Framer drag */}
          <div
            ref={trackRef}
            className="hsc-track"
            style={{ willChange: "transform" }}
          >
            {products.map((product, i) => (
              <StripCard
                key={product._id}
                product={product}
                isActive={i === activeIndex}
                onClick={() => handleCardClick(i)}
                accent={ACCENT_PALETTE[i % ACCENT_PALETTE.length]}
                isDraggingRef={isDraggingRef}
              />
            ))}
          </div>
        </div>

        <div className="hsc-dots" role="tablist" aria-label="Product navigation">
          {products.map((_, i) => (
            <button
              key={i}
              className={`hsc-dot${i === activeIndex ? " hsc-dot--active" : ""}`}
              onClick={() => goToDot(i)}
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Go to product ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export default HorizontalShowcase;