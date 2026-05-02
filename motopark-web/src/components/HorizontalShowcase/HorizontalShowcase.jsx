/* ================================================
   HorizontalShowcase.jsx — FIXED & PRODUCTION-READY

   BUGS FIXED:
   ✅ [CRITICAL] Index overflow — constraints used wrong CARD_WIDTH
      (278 vs CARD_W=260+GAP=18=278 which happened to work, BUT
      the constraints object was computed once at render time using
      a stale products.length — now recomputed in useMemo).
   ✅ [CRITICAL] dragConstraints with dragMomentum:true causes
      post-momentum overshoot past the last card, leading to
      out-of-index state and blank space. Fixed by disabling
      dragMomentum and using onDragEnd snap exclusively.
   ✅ [CRITICAL] snapTo is called with unclamped estimatedIndex —
      negative values possible when dragging right past first card.
      Added explicit clamp in handleDragEnd.
   ✅ [HIGH] isMobile computed at module init — won't update on
      resize. Replaced with useEffect + state + resize listener.
   ✅ [HIGH] activeIndexRef not kept in sync properly — moved to
      useEffect correctly.
   ✅ [HIGH] Clicking a StripCard fires snapTo(i) — this is correct,
      but motion.div drag swallows pointer events during drag so
      card click fires AFTER drag ends. Added isDragging ref to
      guard StripCard onClick.
   ✅ [MEDIUM] Wheel handler closes over stale activeIndexRef —
      reads from ref correctly already but ref update was async.
      Now updates ref synchronously in snapTo.
   ✅ [MEDIUM] overflow:visible on .hsc-section causes the strip
      cards to overflow outside the rounded section on mobile,
      appearing under the navbar. Changed to overflow:hidden with
      explicit visible only on hero center.
   ✅ [MEDIUM] color: #c41212 hardcoded on .hsc-section (red text)
      — should be white/transparent.
   ✅ [LOW] hsc-orbit-btn CSS is commented out but button is still
      rendered in JSX — button was invisible but still receiving
      pointer events. Removed from JSX.
   ================================================ */

import {
  useRef, useState, useEffect, useCallback, memo, useMemo,
} from "react";
import {
  motion, AnimatePresence, useMotionValue, animate,
  useSpring,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { API } from "@/config/api";
import "./HorizontalShowcase.css";

const CARD_W = 260;
const GAP    = 18;
const STEP   = CARD_W + GAP; // 278px per card step

/* ─── Per-product accent color palette ─── */
const ACCENT_PALETTE = [
  "#ff5638", "#3b82f6", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

function resolveImage(product) {
  const raw = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
  if (!raw) return "/placeholder.png";
  return raw.startsWith("http") ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

/* ─── Star rating ─── */
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
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
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
   FIX: onClick receives isDragging ref to guard accidental
   trigger on drag-release.
════════════════════════════════════════════════ */
const StripCard = memo(({ product, isActive, onClick, accent, isDraggingRef }) => {
  const { addToCart } = useCart();

  const handleClick = useCallback(() => {
    // FIX: do not fire navigate/snapTo if we were just dragging
    if (isDraggingRef.current) return;
    onClick();
  }, [onClick, isDraggingRef]);

  return (
    <motion.article
      className={`hsc-card ${isActive ? "hsc-card--active" : ""}`}
      style={{ "--accent": accent }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
    >
      <div className="hsc-card-image">
        <img src={resolveImage(product)} alt={product.name} draggable="false" loading="lazy" />
      </div>
      <div className="hsc-card-body">
        <div className="hsc-card-meta">
          <h4 className="hsc-card-name">{product.name}</h4>
          <Stars value={product.rating || 4} accent={accent} />
          <span className="hsc-card-price">
            ₹{product.price?.toLocaleString("en-IN")}
          </span>
          <span className="hsc-card-colors">3 COLORS</span>
        </div>
        <button
          className="hsc-card-plus"
          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
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
function HorizontalShowcase({ products = [] }) {
  const navigate    = useNavigate();
  const viewportRef = useRef(null);

  /* FIX: isMobile as state, updated on resize */
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 860 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 860);
    const mq = window.matchMedia("(max-width: 860px)");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── framer x for strip ── */
  const x = useMotionValue(0);

  /* ── active index ── */
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  /* ── isDragging ref — prevents click after drag ── */
  const isDraggingRef = useRef(false);

  /* FIX: constraints computed from actual products length, memoized */
  const constraints = useMemo(() => ({
    left:  products.length > 0 ? -((products.length - 1) * STEP) : 0,
    right: 0,
  }), [products.length]);

  /* ── dynamic accent per product ── */
  const accent = useMemo(
    () => ACCENT_PALETTE[activeIndex % ACCENT_PALETTE.length],
    [activeIndex]
  );

  /* ── micro-parallax springs ── */
  const rawTiltX = useMotionValue(0);
  const rawTiltY = useMotionValue(0);
  const tiltX    = useSpring(rawTiltX, { stiffness: 120, damping: 18 });
  const tiltY    = useSpring(rawTiltY, { stiffness: 120, damping: 18 });

  /* ── dynamic lighting position ── */
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });

  /* ── snap strip to index ── 
     FIX: updates activeIndexRef synchronously (not via effect)
     so wheel handler reads the correct value immediately.        */
  const snapTo = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, products.length - 1));

    animate(x, -(clamped * STEP), {
      type:      "spring",
      stiffness: 280,
      damping:   32,
      mass:      0.8,
    });

    activeIndexRef.current = clamped;   // FIX: synchronous update
    setActiveIndex(clamped);
  }, [x, products.length]);

  /* FIX: handleDragEnd clamps estimatedIndex to [0, length-1]
     and also accounts for partial drags that land between snaps. */
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback(() => {
    const currentX        = x.get();
    const rawIndex        = -currentX / STEP;
    const estimatedIndex  = Math.round(rawIndex);
    const clamped         = Math.max(0, Math.min(estimatedIndex, products.length - 1));

    snapTo(clamped);

    // FIX: keep isDragging true for one more tick so click guard fires
    requestAnimationFrame(() => {
      isDraggingRef.current = false;
    });
  }, [x, snapTo, products.length]);

  /* ── wheel on strip viewport ── */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !products.length) return;

    const STEP_THRESHOLD = 60;
    const COOLDOWN_MS    = 280;
    let accum     = 0;
    let lastSnapAt = 0;

    const onWheel = (e) => {
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;

      const idx = activeIndexRef.current;
      const max = products.length - 1;

      // FIX: proper boundary check using ref (synchronously updated)
      if ((idx <= 0 && delta < 0) || (idx >= max && delta > 0)) {
        accum = 0;
        return;
      }

      e.preventDefault();
      accum += delta;

      const now = Date.now();
      if (Math.abs(accum) >= STEP_THRESHOLD && now - lastSnapAt >= COOLDOWN_MS) {
        snapTo(idx + (accum > 0 ? 1 : -1));
        accum      = 0;
        lastSnapAt = now;
      }
    };

    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [products.length, snapTo]);

  /* ── cursor parallax on hero center ── */
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

  if (!products.length) return null;

  const featured    = products[activeIndex];
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
      {/* ── BG watermark ── */}
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
            <span>JUST</span>
            <span>DO</span>
            <span className="hsc-title-accent">IT</span>
          </h1>
          <p className="hsc-hero-desc">
            With top brands in motor gear, you'll find premium riding equipment
            built for performance, protection, and style.
          </p>
        </motion.div>

        {/* CENTER */}
        <motion.div
          className="hsc-hero-center"
          style={isMobile ? {} : {
            rotateX:          tiltX,
            rotateY:          tiltY,
            transformStyle:   "preserve-3d",
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

          <div className="hsc-orbit hsc-orbit--1" aria-hidden="true" />
          <div className="hsc-orbit hsc-orbit--2" aria-hidden="true" />
          <div className="hsc-orbit hsc-orbit--3" aria-hidden="true" />

          <AnimatePresence mode="wait">
            <motion.img
              key={featured?._id}
              src={featuredImg}
              alt={featured?.name}
              className="hsc-hero-shoe"
              draggable="false"
              loading="eager"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{    opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => navigate(`/product/${featured._id}`)}
            />
          </AnimatePresence>

          {/* FIX: hsc-orbit-btn removed — CSS was commented out, button
              was invisible but still intercepting pointer events, causing
              occasional missed clicks on the hero shoe image.            */}
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
              transition={{ duration: 0.3 }}
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
              transition={{ duration: 0.3, delay: 0.05 }}
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
            <span className="hsc-cta-label">
              GET IT NOW <ArrowIcon />
            </span>
          </button>

          <div className="hsc-swatches" aria-hidden="true">
            {ACCENT_PALETTE.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className={`hsc-swatch ${i === activeIndex % 4 ? "hsc-swatch--active" : ""}`}
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
              transition={{ duration: 0.22 }}
            >
              {String(activeIndex + 1).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
          <span className="hsc-counter-rule" />
          <span className="hsc-counter-total">
            / {String(products.length).padStart(2, "0")}
          </span>
        </div>

        <div ref={viewportRef} className="hsc-viewport">
          {/* FIX: dragMomentum:false prevents post-release overshoot past boundaries.
              dragElastic:0 removes the rubber-band that lets the track go beyond
              constraints, which was the root cause of out-of-index positioning.    */}
          <motion.div
            className="hsc-track"
            drag="x"
            dragConstraints={constraints}
            dragMomentum={false}
            dragElastic={0}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: "grabbing" }}
            style={{
              cursor: "grab",
              x,
              touchAction: "none",
            }}
          >
            {products.map((product, i) => (
              <StripCard
                key={product._id}
                product={product}
                isActive={i === activeIndex}
                onClick={() => snapTo(i)}
                accent={ACCENT_PALETTE[i % ACCENT_PALETTE.length]}
                isDraggingRef={isDraggingRef}
              />
            ))}
          </motion.div>
        </div>

        <div className="hsc-dots" role="tablist" aria-label="Product navigation">
          {products.map((_, i) => (
            <button
              key={i}
              className={`hsc-dot ${i === activeIndex ? "hsc-dot--active" : ""}`}
              onClick={() => snapTo(i)}
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