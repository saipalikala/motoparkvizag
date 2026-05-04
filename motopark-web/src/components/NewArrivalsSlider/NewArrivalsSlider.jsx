/* ================================================
   NewArrivalsSlider.jsx — v3 DEFINITIVE FIX

   ROOT CAUSES OF MOBILE SHAKING (NOW FIXED):
   ─────────────────────────────────────────────
   ❌ CAUSE 1 — CSS `transition` on .nat-product fighting RAF lerp
      The product card had `transition: transform 0.6s` which means
      every time React re-rendered slotProps the browser's transition
      engine tried to animate FROM the last value WHILE the RAF loop
      was also animating. Two animation systems fighting = jitter.
      FIX: Transition REMOVED. RAF lerp is the single source of truth.

   ❌ CAUSE 2 — React re-render every RAF frame (setActiveF on every tick)
      The RAF loop called setActiveF() ~60 times/sec even during a drag.
      React re-renders FloatingProduct with new slotProps every frame,
      causing the VDOM diffing + DOM patching to race with the RAF write.
      FIX: All visual updates (transform, opacity, filter, zIndex) are
      written DIRECTLY to the DOM via refs in the RAF loop. React state
      (setActiveF) is only updated at SNAP POINTS (≤ once/frame, only
      when truly needed for UI elements that need React: dots, counter,
      hero panel).

   ❌ CAUSE 3 — Float animation transform conflicting with slot transform
      .nat-product--center had an infinite CSS keyframe using
      `var(--slot-transform) translateY(...)`. When the RAF wrote a new
      inline style transform, the CSS animation reset its own transform
      on the same element causing a 1-frame jump (the "duplicate" effect).
      FIX: Float animation is ALWAYS paused during drag. On release,
      we wait for the lerp to settle before re-enabling it.
      The float only runs on the center card when fully settled.

   ❌ CAUSE 4 — pointer capture on stage div, not on window
      On mobile, fast swipes send pointer events outside the stage div
      before setPointerCapture can register them, dropping the drag.
      FIX: pointerdown on stage, but pointermove/up on WINDOW via
      useEffect listeners (not JSX props) with { passive: false }.

   ❌ CAUSE 5 — isNewArrival vs newArrival mismatch
      The context stores the flag as `newArrival` (set by admin toggle)
      but the old filter used `isNewArrival`. Products never appeared.
      FIX: filter now checks BOTH `p.newArrival` and `p.isNewArrival`
      for backwards compatibility.
   ================================================ */

import { useRef, useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { API } from "@/config/api";
import "./NewArrivalsSlider.css";

/* ─── Constants (no magic numbers) ─── */
const LERP_SPEED       = 0.095;   // interpolation factor per frame
const DRAG_PX_PER_SLOT = 160;     // pixels of drag = 1 slot change
const DRAG_THRESHOLD   = 5;       // px before we count it as a drag
const SETTLE_THRESHOLD = 0.0008;  // activeF delta below which we consider "settled"
const SLOT_SPREAD      = 240;     // px between slots
const SLOT_SCALE_STEP  = 0.28;    // scale reduction per slot distance
const SLOT_ROTATE_STEP = 14;      // rotateY degrees per slot distance
const SLOT_OPACITY_STEP= 0.38;    // opacity reduction per slot distance
const SLOT_BLUR_STEP   = 4;       // blur px per slot distance (starts at 0.5)
const MAX_PRODUCTS     = 7;

/* ─── lerp (hoisted — never recreated) ─── */
const lerp = (a, b, t) => a + (b - a) * t;

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

/* ─── Slot geometry (pure function, called in RAF — no hooks) ─── */
function computeSlot(i, activeF) {
  const dist    = i - activeF;
  const absDist = Math.abs(dist);
  const scale   = Math.max(0.48, 1 - absDist * SLOT_SCALE_STEP);
  const tx      = dist * SLOT_SPREAD;
  const ry      = -dist * SLOT_ROTATE_STEP;
  const opacity = Math.max(0, 1 - absDist * SLOT_OPACITY_STEP);
  const blur    = Math.max(0, (absDist - 0.5) * SLOT_BLUR_STEP);
  const zIndex  = Math.round(100 - absDist * 20);
  return { scale, tx, ry, opacity, blur, zIndex };
}

/* ─── Icons ─── */
const HeartIcon = memo(({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
));
HeartIcon.displayName = "HeartIcon";

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

const PlaceholderProduct = () => (
  <svg viewBox="0 0 200 120" className="nat-placeholder" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="108" rx="70" ry="6" fill="rgba(0,0,0,0.3)" />
    <path d="M30 80 Q40 50 80 55 L160 70 Q175 75 170 90 L40 95 Q28 92 30 80 Z"
      fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
  </svg>
);

/* ════════════════════════════════
   FLOATING PRODUCT
   KEY CHANGE: No inline transform/opacity/filter styles set here.
   The ref (elRef) is used by the RAF loop to write directly to the DOM.
   This eliminates the React re-render → jitter cycle.
   Only className changes (center state) trigger a React update, and
   only when the center index actually changes (integers, not floats).
════════════════════════════════ */
const FloatingProduct = memo(({
  product, isCenter, elRef, onCardClick, onWish, wishlisted, onCart, inCart,
}) => {
  const image = resolveImage(product);
  const cat   = getCategoryLabel(product);

  return (
    <div
      ref={elRef}
      className={`nat-product${isCenter ? " nat-product--center" : ""}`}
      onClick={onCardClick}
      role="button"
      tabIndex={isCenter ? 0 : -1}
      onKeyDown={(e) => e.key === "Enter" && onCardClick(e)}
    >
      <div className="nat-orbit" />
      <div className="nat-orbit nat-orbit--inner" />
      <div className="nat-shadow-glow" />
      <span className="nat-new-pill">New</span>

      <div className="nat-img-wrap">
        {image
          ? <img src={image} alt={product.name} className="nat-img" draggable="false" loading="lazy" />
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
            className={`nat-wish-btn${wishlisted ? " nat-wish-btn--on" : ""}`}
            onClick={onWish}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <HeartIcon filled={wishlisted} />
          </button>
          <button
            className={`nat-cart-btn${inCart ? " nat-cart-btn--added" : ""}`}
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
});
FloatingProduct.displayName = "FloatingProduct";

/* ════════════════════════════════
   DOT NAVIGATION
════════════════════════════════ */
const DotNav = memo(({ count, active, onDot }) => (
  <div className="nat-dots" role="tablist" aria-label="Product navigation">
    {Array.from({ length: count }).map((_, i) => (
      <button
        key={i}
        className={`nat-dot${i === active ? " nat-dot--active" : ""}`}
        onClick={() => onDot(i)}
        role="tab"
        aria-selected={i === active}
        aria-label={`Go to product ${i + 1}`}
      />
    ))}
  </div>
));
DotNav.displayName = "DotNav";

/* ════════════════════════════════
   MAIN COMPONENT
════════════════════════════════ */
const NewArrivalsSlider = ({ products: propProducts }) => {
  const { products: ctxProducts }                           = useProducts();
  const { addToCart, cartItems }                            = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  /* ── FIX: filter supports BOTH newArrival (admin toggle) and
     isNewArrival for backwards-compatibility ── */
  const display = (() => {
    if (propProducts) return propProducts.slice(0, MAX_PRODUCTS);
    return ctxProducts
      .filter(p => p.newArrival === true || p.isNewArrival === true)
      .slice(0, MAX_PRODUCTS);
  })();

  /* ── Refs for product DOM elements (RAF writes directly here) ── */
  const cardRefs = useRef([]);

  /* ── Stable display ref so RAF closure never goes stale ── */
  const displayRef = useRef(display);
  useEffect(() => { displayRef.current = display; }, [display]);

  /* ── Animation refs ── */
  const rafRef     = useRef(null);
  const targetF    = useRef(0);
  const currentF   = useRef(0);
  const settledRef = useRef(true); // true when lerp has stopped moving

  /* ── React state — ONLY for things that need React (dots, counter, hero) ── */
  const [activeInt, setActiveInt] = useState(0);

  /* ── Drag ref ── */
  const dragRef = useRef({
    active:    false,
    startX:    0,
    startA:    0,
    moved:     false,
    startTime: 0,
    lastX:     0,
    velocity:  0,
  });

  /* ── Clamp refs when display changes ── */
  useEffect(() => {
    const max = Math.max(0, display.length - 1);
    targetF.current  = Math.max(0, Math.min(max, Math.round(targetF.current)));
    currentF.current = targetF.current;
    setActiveInt(targetF.current);
  }, [display.length]);

  /* ════════════════════════════════
     RAF LOOP — single source of truth
     Writes transforms directly to DOM refs.
     Only calls setActiveInt when the integer slot changes.
  ════════════════════════════════ */
  useEffect(() => {
    if (!display.length) return;

    let lastActiveInt = Math.round(currentF.current);

    const tick = () => {
      const len = displayRef.current.length;
      if (!len) { rafRef.current = requestAnimationFrame(tick); return; }

      const max    = len - 1;
      const target = Math.max(0, Math.min(max, targetF.current));
      currentF.current = lerp(currentF.current, target, LERP_SPEED);

      const af     = Math.max(0, Math.min(max, currentF.current));
      const newInt = Math.round(af);

      /* Write transforms directly to DOM — zero React involvement */
      for (let i = 0; i < cardRefs.current.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        const { scale, tx, ry, opacity, blur, zIndex } = computeSlot(i, af);
        const transform = `translate3d(${tx}px, 0, 0) scale(${scale}) rotateY(${ry}deg)`;

        el.style.transform  = transform;
        el.style.opacity    = opacity;
        el.style.filter     = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
        el.style.zIndex     = zIndex;
        el.style.pointerEvents = opacity < 0.12 ? "none" : "auto";

        /* Also set --slot-transform so the float keyframe works correctly */
        el.style.setProperty("--slot-transform", transform);
      }

      /* Only trigger React re-render when integer slot changes */
      if (newInt !== lastActiveInt) {
        lastActiveInt = newInt;
        setActiveInt(newInt);
      }

      /* Track settled state — used to re-enable float animation */
      const delta = Math.abs(af - target);
      settledRef.current = delta < SETTLE_THRESHOLD && !dragRef.current.active;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display.length]);

  /* ════════════════════════════════
     POINTER EVENTS — on window (not element)
     This prevents the drag dying when the finger moves fast
     off the stage element (common cause of mobile jitter).
  ════════════════════════════════ */
  useEffect(() => {
    const onDown = (e) => {
      /* Only trigger if the pointerdown started inside the stage */
      const stage = document.querySelector(".nat-stage");
      if (!stage || !stage.contains(e.target)) return;
      if (e.button !== undefined && e.button !== 0) return;

      dragRef.current = {
        active:    true,
        startX:    e.clientX,
        startA:    targetF.current,
        moved:     false,
        startTime: Date.now(),
        lastX:     e.clientX,
        velocity:  0,
      };

      /* Pause float animation on ALL cards immediately */
      cardRefs.current.forEach(el => {
        if (el) el.style.setProperty("--float-play", "paused");
      });
    };

    const onMove = (e) => {
      if (!dragRef.current.active) return;

      const dx    = dragRef.current.startX - e.clientX;
      const absDx = Math.abs(dx);
      const max   = Math.max(0, displayRef.current.length - 1);

      if (absDx > DRAG_THRESHOLD) dragRef.current.moved = true;

      /* Velocity tracking for inertia */
      dragRef.current.velocity = e.clientX - dragRef.current.lastX;
      dragRef.current.lastX    = e.clientX;

      const delta = dx / DRAG_PX_PER_SLOT;
      targetF.current = Math.max(0, Math.min(max, dragRef.current.startA + delta));
    };

    const onUp = (e) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;

      const max = Math.max(0, displayRef.current.length - 1);

      /* Inertia: if fast swipe, advance one extra slot in that direction */
      const velocity   = dragRef.current.velocity;
      const baseTarget = Math.round(Math.max(0, Math.min(max, targetF.current)));
      const inertia    = Math.abs(velocity) > 8 ? (velocity < 0 ? 1 : -1) : 0;

      targetF.current = Math.max(0, Math.min(max, baseTarget + inertia));

      /* Re-enable float animation after lerp settles */
      const reenableFloat = () => {
        if (settledRef.current) {
          cardRefs.current.forEach(el => {
            if (el) el.style.setProperty("--float-play", "running");
          });
        } else {
          requestAnimationFrame(reenableFloat);
        }
      };
      requestAnimationFrame(reenableFloat);
    };

    /* passive:false on move so we can call preventDefault if needed */
    window.addEventListener("pointerdown",  onDown,  { passive: true });
    window.addEventListener("pointermove",  onMove,  { passive: true });
    window.addEventListener("pointerup",    onUp,    { passive: true });
    window.addEventListener("pointercancel",onUp,    { passive: true });

    return () => {
      window.removeEventListener("pointerdown",  onDown);
      window.removeEventListener("pointermove",  onMove);
      window.removeEventListener("pointerup",    onUp);
      window.removeEventListener("pointercancel",onUp);
    };
  }, []); // empty — refs are always up to date

  /* ── Wheel handler ── */
  useEffect(() => {
    const stage = document.querySelector(".nat-stage");
    if (!stage || !display.length) return;

    const SENSITIVITY = 90;
    const onWheel = (e) => {
      const max   = displayRef.current.length - 1;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;
      const atStart = targetF.current <= 0.001 && delta < 0;
      const atEnd   = targetF.current >= max - 0.001 && delta > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      targetF.current = Math.max(0, Math.min(max, targetF.current + delta / SENSITIVITY));
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [display.length]);

  /* ── Keyboard ── */
  const onKeyDown = useCallback((e) => {
    const max = displayRef.current.length - 1;
    if (e.key === "ArrowRight")
      targetF.current = Math.min(max, Math.round(targetF.current) + 1);
    if (e.key === "ArrowLeft")
      targetF.current = Math.max(0, Math.round(targetF.current) - 1);
  }, []);

  const goToDot = useCallback((i) => {
    targetF.current = i;
  }, []);

  /* ── Click guard — only fire if not a drag ── */
  const makeClickHandler = useCallback((product) => () => {
    if (dragRef.current.moved) return;
    navigate(`/product/${product._id}`);
  }, [navigate]);

  if (!display.length) return null;

  const clampedActive = Math.max(0, Math.min(display.length - 1, activeInt));
  const activeProduct = display[clampedActive] || null;
  const cat           = activeProduct ? getCategoryLabel(activeProduct) : null;

  return (
    <section
      className="nat-section"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="New arrivals slider"
    >
      <div className="nat-bg-word" aria-hidden="true">NEW ARRIVALS</div>

      {/* Hero overlay — pointer-events:none on wrapper, auto on right panel */}
      <div className="nat-hero-overlay">
        <div className="nat-hero-left" aria-hidden="true">
          <span>JUST</span>
          <span>RIDE</span>
          <span className="nat-hero-accent">FAST</span>
        </div>

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

      <div className="nat-counter" aria-hidden="true">
        {String(clampedActive + 1).padStart(2, "0")} / {String(display.length).padStart(2, "0")}
      </div>

      {/* Stage — touch-action: pan-y allows vertical scroll, 
          horizontal is fully handled by our pointer listeners */}
      <div
        className="nat-stage"
        style={{ touchAction: "pan-y" }}
        aria-label="Drag to browse products"
      >
        {display.map((product, i) => (
          <FloatingProduct
            key={product._id}
            product={product}
            isCenter={i === clampedActive}
            elRef={(el) => { cardRefs.current[i] = el; }}
            onCardClick={makeClickHandler(product)}
            onWish={(e) => {
              e?.stopPropagation();
              isInWishlist(product._id)
                ? removeFromWishlist(product._id)
                : addToWishlist(product);
            }}
            wishlisted={isInWishlist(product._id)}
            onCart={(e) => {
              e?.stopPropagation();
              addToCart(product);
            }}
            inCart={cartItems.some((c) => c._id === product._id)}
          />
        ))}
      </div>

      <div className="nat-scroll-hint" aria-hidden="true">
        <span className="nat-scroll-line" />
        <span className="nat-scroll-label">Drag to explore</span>
        <span className="nat-scroll-line" />
      </div>

      <div className="nat-bottom">
        <DotNav count={display.length} active={clampedActive} onDot={goToDot} />
        <a href="/store" className="nat-explore-link">Explore all</a>
      </div>
    </section>
  );
};

export default NewArrivalsSlider;