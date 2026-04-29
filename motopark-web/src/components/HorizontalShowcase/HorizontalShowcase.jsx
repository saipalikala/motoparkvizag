/* ================================================
   HorizontalShowcase.jsx — INSANE LEVEL
   ✅ Cursor micro-parallax (3D tilt on hero center)
   ✅ Dynamic radial lighting follows cursor
   ✅ AnimatePresence cross-zoom+rotation morph transition
   ✅ Orbit depth separation (layered planes)
   ✅ Pill-style strip cards with glass effect
   ✅ Idle float animation on hero shoe
   ✅ Per-product dynamic color theme
   ✅ Wheel-on-container + drag scrubbing
   ✅ Cinematic entrance animation
   ================================================ */
import {
  useRef, useState, useEffect, useCallback, memo, useMemo,
} from "react";
import {
  motion, AnimatePresence, useMotionValue, animate,
  useSpring, useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { API } from "@/config/api";
import "./HorizontalShowcase.css";

const CARD_W = 260;
const GAP    = 18;

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
const Stars = ({ value = 4, accent = "#ff5638" }) => (
  <div className="hsc-stars" aria-label={`${Math.round(value)} of 5 stars`}>
    {[0,1,2,3,4].map((i) => (
      <svg key={i} width="9" height="9" viewBox="0 0 24 24"
           fill={i < Math.round(value) ? accent : "rgba(22,32,79,0.15)"}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ))}
  </div>
);

/* ─── Icons ─── */
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M3 12c4-4 14-4 18 0M3 12c4 4 14 4 18 0"/>
  </svg>
);

/* ════════════════════════════════════════════════
   STRIP CARD
════════════════════════════════════════════════ */
const StripCard = memo(({ product, isActive, onClick, accent }) => {
  const { addToCart } = useCart();

  return (
    <motion.article
      className={`hsc-card ${isActive ? "hsc-card--active" : ""}`}
      style={{ "--accent": accent }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
    >
      <div className="hsc-card-image">
        <img src={resolveImage(product)} alt={product.name} draggable="false"/>
      </div>
      <div className="hsc-card-body">
        <div className="hsc-card-meta">
          <h4 className="hsc-card-name">{product.name}</h4>
          <Stars value={product.rating || 4} accent={accent}/>
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
          <PlusIcon/>
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
  
  const navigate      = useNavigate();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 860;
  const trackRef      = useRef(null);
  const viewportRef   = useRef(null);
  const heroCenterRef = useRef(null);
const CARD_WIDTH = 278;
const maxIndex = Math.max(0, (products?.length || 1) - 1);
const constraints = {
  left: -(maxIndex * CARD_WIDTH),
  right: 0,
};
  /* ── framer x for strip ── */
  const x = useMotionValue(0);

  /* ── active index ── */
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  // const [constraints, setConstraints] = useState({ left: 0, right: 0 });

  /* ── dynamic accent per product ── */
  const accent = useMemo(
    () => ACCENT_PALETTE[activeIndex % ACCENT_PALETTE.length],
    [activeIndex]
  );

  /* ── micro-parallax springs ── */
  const rawTiltX = useMotionValue(0);
  const rawTiltY = useMotionValue(0);
  const tiltX = useSpring(rawTiltX, { stiffness: 120, damping: 18 });
  const tiltY = useSpring(rawTiltY, { stiffness: 120, damping: 18 });

  /* ── dynamic lighting position ── */
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });



  /* ── snap strip to index ── */
const snapTo = useCallback((index) => {
  const clampedIndex = Math.max(0, Math.min(index, products.length - 1));

  const targetX = -(clampedIndex * (CARD_W + GAP));

  animate(x, targetX, {
    type: "spring",
    stiffness: 280,
    damping: 32,
    mass: 0.8,
  });

  setActiveIndex(clampedIndex);
}, [x, products.length]);

const handleDragEnd = useCallback(() => {
  const currentX = x.get();
  const estimatedIndex = Math.round(-currentX / (CARD_W + GAP));

  snapTo(estimatedIndex);
}, [x, snapTo]);

  /* ── wheel on strip viewport ── */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !products.length) return;

    const max            = products.length - 1;
    const STEP_THRESHOLD = 60;
    const COOLDOWN_MS    = 280;
    let accum = 0;
    let lastSnapAt = 0;

    const onWheel = (e) => {
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;

      const idx = activeIndexRef.current;
      if ((idx <= 0 && delta < 0) || (idx >= max && delta > 0)) {
        accum = 0;
        return;
      }

      e.preventDefault();
      accum += delta;

      const now = Date.now();
      if (Math.abs(accum) >= STEP_THRESHOLD && now - lastSnapAt >= COOLDOWN_MS) {
        snapTo(idx + (accum > 0 ? 1 : -1));
        accum = 0;
        lastSnapAt = now;
      }
    };

    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [products.length, snapTo]);

  /* ── cursor parallax on hero center ── */
  const handleHeroMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx   = (e.clientX - rect.left) / rect.width  - 0.5;
    const ny   = (e.clientY - rect.top)  / rect.height - 0.5;
    rawTiltX.set(ny * -14);
    rawTiltY.set(nx *  18);
    setLightPos({
      x: Math.round((e.clientX - rect.left) / rect.width  * 100),
      y: Math.round((e.clientY - rect.top)  / rect.height * 100),
    });
  }, [rawTiltX, rawTiltY]);

  const handleHeroMouseLeave = useCallback(() => {
    rawTiltX.set(0);
    rawTiltY.set(0);
    setLightPos({ x: 50, y: 50 });
  }, [rawTiltX, rawTiltY]);

  if (!products.length) return null;

  const featured     = products[activeIndex];
  const featuredImg  = resolveImage(featured);

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
        {Array.from({ length: 25 }).map((_, i) => <span key={i}/>)}
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

      {/* ════════════
          HERO
      ════════════ */}
      <div className="hsc-hero">

        {/* LEFT — JUST DO IT */}
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
            With top brands in motor gear, you’ll find premium riding equipment built for performance, protection, and style.
          </p>
        </motion.div>

        {/* CENTER — shoe + orbits + parallax */}
{/* CENTER — shoe + orbits + parallax */}
        <motion.div
          ref={heroCenterRef}
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
          {/* Dynamic radial lighting */}
          <div
            className="hsc-light-blob"
            style={{
              background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, ${accent}44 0%, transparent 65%)`,
            }}
            aria-hidden="true"
          />

          {/* Orbit rings */}
          <div className="hsc-orbit hsc-orbit--1" aria-hidden="true"/>
          <div className="hsc-orbit hsc-orbit--2" aria-hidden="true"/>
          <div className="hsc-orbit hsc-orbit--3" aria-hidden="true"/>

          {/* Featured product image */}
          <AnimatePresence mode="wait">
            <motion.img
              key={featured?._id}
              src={featuredImg}
              alt={featured?.name}
              className="hsc-hero-shoe"
              draggable="false"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{    opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => navigate(`/product/${featured._id}`)}
            />
          </AnimatePresence>

          {/* View btn */}
          <button
            className="hsc-orbit-btn"
            onClick={() => navigate(`/product/${featured._id}`)}
            aria-label="View product"
          >
            <ViewIcon/>
          </button>
        </motion.div>

        {/* RIGHT — name, price, CTA */}
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
              <span className="hsc-cta-dot"/>
            </span>
            <span className="hsc-cta-label">
              GET IT NOW <ArrowIcon/>
            </span>
          </button>

          {/* Color swatches — visual only */}
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

      {/* ════════════
          STRIP
      ════════════ */}
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
          <span className="hsc-counter-rule"/>
          <span className="hsc-counter-total">
            / {String(products.length).padStart(2, "0")}
          </span>
        </div>

        <div ref={viewportRef} className="hsc-viewport">
<motion.div
  ref={trackRef}
  className="hsc-track"
  drag="x"
  dragConstraints={constraints}
  dragMomentum={true}
  dragElastic={0.12}
  onDragEnd={handleDragEnd}
  whileTap={{ cursor: "grabbing" }}
  style={{ 
    cursor: "grab",
    x: x,
    touchAction: "none"
  }}
>
            {products.map((product, i) => (
              <StripCard
                key={product._id}
                product={product}
                isActive={i === activeIndex}
                onClick={() => snapTo(i)}
                accent={ACCENT_PALETTE[i % ACCENT_PALETTE.length]}
              />
            ))}
          </motion.div>
        </div>

        <div className="hsc-dots" role="tablist">
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