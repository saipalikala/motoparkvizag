/* ================================================
   NewArrivalsSlider.jsx — Nike-Style Hero Theater
   Upgrades applied:
   ✅ Hero overlay (left headline + right product info)
   ✅ Float animation on center product
   ✅ Orbit rings behind center product
   ✅ Improved depth (scale, rotation, blur)
   ✅ Dark radial gradient background
   ✅ Wheel-on-container scrubbing (boundary release)
   ✅ Drag, dot-nav, keyboard arrows
   ================================================ */
import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { API } from "@/config/api";
import "./NewArrivalsSlider.css";

/* ─── Image resolver ─── */
function resolveImage(product) {
  const raw = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

/* ─── Category label ─── */
function getCategoryLabel(product) {
  if (!product?.category) return null;
  if (typeof product.category === "object") return product.category.name;
  if (product.category.length !== 24) return product.category;
  return null;
}

/* ─── Icons ─── */
const HeartIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ─── Placeholder SVG ─── */
const PlaceholderProduct = () => (
  <svg viewBox="0 0 200 120" className="nat-placeholder" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="108" rx="70" ry="6" fill="rgba(0,0,0,0.3)" />
    <path d="M30 80 Q40 50 80 55 L160 70 Q175 75 170 90 L40 95 Q28 92 30 80 Z"
      fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
  </svg>
);

/* ════════════════════════════════
   SLOT GEOMETRY — improved depth
════════════════════════════════ */
function computeSlot(i, activeF) {
  const dist = i - activeF;
  const absDist = Math.abs(dist);
  const scale   = Math.max(0.48, 1 - absDist * 0.28);   // more depth
  const tx      = dist * 240;
  const ry      = -dist * 14;                             // stronger rotation
  const opacity = Math.max(0, 1 - absDist * 0.38);
  const blur    = Math.max(0, (absDist - 0.5) * 4);      // blur kicks in earlier
  const zIndex  = Math.round(100 - absDist * 20);
  return { scale, tx, ry, opacity, blur, zIndex };
}

/* ════════════════════════════════
   SINGLE FLOATING PRODUCT
════════════════════════════════ */
const FloatingProduct = ({
  product, slotProps, isCenter, onClick, onWish, wishlisted, onCart, inCart,
}) => {
  const { scale, tx, ry, opacity, blur, zIndex } = slotProps;
  const image = resolveImage(product);
  const cat   = getCategoryLabel(product);

  const style = {
    "--slot-transform": `translateX(${tx}px) scale(${scale}) rotateY(${ry}deg)`,
    transform: `translateX(${tx}px) scale(${scale}) rotateY(${ry}deg)`,
    opacity,
    filter:     blur > 0 ? `blur(${blur.toFixed(1)}px)` : "none",
    zIndex,
    pointerEvents: opacity < 0.12 ? "none" : "auto",
  };

  return (
    <div
      className={`nat-product ${isCenter ? "nat-product--center" : ""}`}
      style={style}
      onClick={onClick}
      role="button"
      tabIndex={isCenter ? 0 : -1}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Orbit rings — only visible on center via CSS opacity */}
      <div className="nat-orbit" />
      <div className="nat-orbit nat-orbit--inner" />

      <div className="nat-shadow-glow" />
      <span className="nat-new-pill">New</span>

      <div className="nat-img-wrap">
        {image
          ? <img src={image} alt={product.name} className="nat-img" draggable="false" />
          : <PlaceholderProduct />}
      </div>

      <div className="nat-info">
        {cat && <span className="nat-cat">{cat}</span>}
        <h3 className="nat-name">{product.name}</h3>
        <div className="nat-price-row">
          <span className="nat-price">₹{product.price?.toLocaleString("en-IN")}</span>
          {product.originalPrice && (
            <span className="nat-price-old">
              ₹{product.originalPrice?.toLocaleString("en-IN")}
            </span>
          )}
        </div>
        <div className="nat-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`nat-wish-btn ${wishlisted ? "nat-wish-btn--on" : ""}`}
            onClick={onWish}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <HeartIcon filled={wishlisted} />
          </button>
          <button
            className={`nat-cart-btn ${inCart ? "nat-cart-btn--added" : ""}`}
            onClick={onCart}
            disabled={inCart}
          >
            {inCart ? <CheckIcon /> : <CartIcon />}
            {inCart ? "Added" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════
   DOT NAVIGATION
════════════════════════════════ */
const DotNav = ({ count, active, onDot }) => (
  <div className="nat-dots" role="tablist">
    {Array.from({ length: count }).map((_, i) => (
      <button
        key={i}
        className={`nat-dot ${i === active ? "nat-dot--active" : ""}`}
        onClick={() => onDot(i)}
        role="tab"
        aria-selected={i === active}
        aria-label={`Go to product ${i + 1}`}
      />
    ))}
  </div>
);

/* ════════════════════════════════
   MAIN COMPONENT
════════════════════════════════ */
const NewArrivalsSlider = ({ products: propProducts }) => {
  const { products: ctxProducts }                      = useProducts();
  const { addToCart, cartItems }                        = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  /* ── filter ── */
  let items;
  if (propProducts) {
    items = propProducts;
  } else {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    items = ctxProducts.filter(p => Date.now() - new Date(p.createdAt) < sevenDays);
  }
  const display = items.slice(0, 7);

  /* ── state ── */
  const [activeF, setActiveF] = useState(0);
  const activeInt     = Math.round(activeF);
  const clampedActive = Math.max(0, Math.min(display.length - 1, activeInt));
  const activeProduct = display[clampedActive] || null;

  /* ── refs ── */
  const stageRef  = useRef(null);
  const rafRef    = useRef(null);
  const targetF   = useRef(0);
  const currentF  = useRef(0);
  const dragRef   = useRef({ dragging: false, startX: 0, startActive: 0 });

  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── animation loop ── */
  const animate = useCallback(() => {
    currentF.current = lerp(currentF.current, targetF.current, 0.095);
    const clamped = Math.max(0, Math.min(display.length - 1, currentF.current));
    setActiveF(clamped);
    rafRef.current = requestAnimationFrame(animate);
  }, [display.length]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  /* ── wheel handler ── */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !display.length) return;

    const max = display.length - 1;
    const SENSITIVITY = 90;

    const onWheel = (e) => {
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;

      const atStart = targetF.current <= 0.001 && delta < 0;
      const atEnd   = targetF.current >= max - 0.001 && delta > 0;
      if (atStart || atEnd) return;

      e.preventDefault();
      targetF.current = Math.max(0, Math.min(max, targetF.current + delta / SENSITIVITY));
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [display.length]);

  /* ── drag handlers ── */
  const onDragStart = useCallback((clientX) => {
    dragRef.current = { dragging: true, startX: clientX, startActive: targetF.current };
  }, []);

  const onDragMove = useCallback((clientX) => {
    if (!dragRef.current.dragging) return;
    const delta = (dragRef.current.startX - clientX) / 160;
    targetF.current = Math.max(
      0, Math.min(display.length - 1, dragRef.current.startActive + delta)
    );
  }, [display.length]);

  const onDragEnd = useCallback(() => {
    dragRef.current.dragging = false;
    targetF.current = Math.round(targetF.current);
  }, []);

  const onMouseDown  = (e) => onDragStart(e.clientX);
  const onMouseMove  = (e) => onDragMove(e.clientX);
  const onMouseUp    = ()  => onDragEnd();
  const onTouchStart = (e) => onDragStart(e.touches[0].clientX);
  const onTouchMove  = (e) => onDragMove(e.touches[0].clientX);
  const onTouchEnd   = ()  => onDragEnd();

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight")
      targetF.current = Math.min(display.length - 1, Math.round(targetF.current) + 1);
    if (e.key === "ArrowLeft")
      targetF.current = Math.max(0, Math.round(targetF.current) - 1);
  };

  const goToDot = (i) => { targetF.current = i; };

  if (!display.length) return null;

  const cat = activeProduct ? getCategoryLabel(activeProduct) : null;

  return (
    <section
      className="nat-section"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="New arrivals slider"
    >
      {/* ── giant BG watermark ── */}
      <div className="nat-bg-word" aria-hidden="true">NEW ARIVALS</div>

      {/* ════ HERO OVERLAY ════ */}
      <div className="nat-hero-overlay" aria-hidden="true">
        {/* Left — editorial headline */}
        <div className="nat-hero-left">
          <span>JUST</span>
          <span>RIDE</span>
          <span className="nat-hero-accent">FAST</span>
        </div>

        {/* Right — reactive product info */}
        {activeProduct && (
          <div className="nat-hero-right">
            {cat && <span className="nat-hero-cat">{cat}</span>}
            <span className="nat-hero-name">{activeProduct.name}</span>
            <span className="nat-hero-price">
              ₹{activeProduct.price?.toLocaleString("en-IN")}
            </span>
            <button
              className="nat-hero-cta"
              onClick={() => navigate(`/product/${activeProduct._id}`)}
              aria-label={`Shop ${activeProduct.name}`}
            >
              Get it now
            </button>
          </div>
        )}
      </div>

      {/* ── counter ── */}
      <div className="nat-counter" aria-live="polite">
        {String(clampedActive + 1).padStart(2, "0")} / {String(display.length).padStart(2, "0")}
      </div>

      {/* ── product stage ── */}
      <div
        ref={stageRef}
        className="nat-stage"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {display.map((product, i) => {
          const slot     = computeSlot(i, activeF);
          const isCenter = i === clampedActive;
          return (
            <FloatingProduct
              key={product._id}
              product={product}
              slotProps={slot}
              isCenter={isCenter}
              onClick={() => navigate(`/product/${product._id}`)}
              onWish={() =>
                isInWishlist(product._id)
                  ? removeFromWishlist(product._id)
                  : addToWishlist(product)
              }
              wishlisted={isInWishlist(product._id)}
              onCart={() => addToCart(product)}
              inCart={cartItems.some((c) => c._id === product._id)}
            />
          );
        })}
      </div>

      {/* ── scroll hint ── */}
      <div className="nat-scroll-hint" aria-hidden="true">
        <span className="nat-scroll-line" />
        <span className="nat-scroll-label">Drag to explore</span>
        <span className="nat-scroll-line" />
      </div>

      {/* ── bottom UI ── */}
      <div className="nat-bottom">
        <DotNav count={display.length} active={clampedActive} onDot={goToDot} />
        <a href="/store" className="nat-explore-link">Explore all</a>
      </div>
    </section>
  );
};

export default NewArrivalsSlider;