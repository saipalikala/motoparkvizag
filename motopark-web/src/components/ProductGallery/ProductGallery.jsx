import { useState, useEffect, useRef, useCallback } from "react";
import "./ProductGallery.css";

/* ─── ICONS ─── */
const ChevronIcon = ({ dir }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
  </svg>
);

/* ─── MAIN COMPONENT ─── */
const ProductGallery = ({
  images = [],
  product,
  variant,
  selectedSize,
  setSelectedSize,
  variantIndex,
  setVariantIndex,
  sizeError,
  setSizeError,
  onAddToCart,
  addedToCart,
  wishlisted,
  onWishlist,
  inStock,
  alreadyInCart,
}) => {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  /* swipe / double-tap refs */
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isDragging  = useRef(false);
  const lastTap     = useRef(0);

  /* reset when images change (variant switch etc.) */
  useEffect(() => {
    setActive(0);
    setZoomed(false);
  }, [images]);


// ── AND ADD THIS cleanup useEffect ──
// FIX: When gallery unmounts (user navigates away), always
// reset parent's galleryFullscreen to false.
// Without this, navigating Product A → Home → Product B
// via VideoShowcase "Buy Now" keeps galleryFullscreen=true
// from Product A's session, hiding Product B's info column.

  const goNext = useCallback(() => {
    setActive(p => (p + 1) % images.length);
    setZoomed(false);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setActive(p => (p === 0 ? images.length - 1 : p - 1));
    setZoomed(false);
  }, [images.length]);

  /* ── touch handlers ── */
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current  = false;
  };

  const onTouchMove = (e) => {
    if (!touchStartX.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > dy && dx > 8) isDragging.current = true;
  };

  const onTouchEnd = (e) => {
    if (!touchStartX.current) return;

    const now = Date.now();
    const timeSinceLast = now - lastTap.current;
    lastTap.current = now;

    /* double-tap → zoom / unzoom */
    if (timeSinceLast < 300 && !isDragging.current) {
      if (zoomed) {
        setZoomed(false);
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.changedTouches[0].clientX - rect.left) / rect.width) * 100;
        const y = ((e.changedTouches[0].clientY - rect.top)  / rect.height) * 100;
        setOrigin({ x, y });
        setZoomed(true);
      }
      touchStartX.current = null;
      isDragging.current  = false;
      return;
    }

    /* horizontal swipe (only when not zoomed) */
    if (isDragging.current && !zoomed) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 40) dx < 0 ? goNext() : goPrev();
    }

    touchStartX.current = null;
    isDragging.current  = false;
  };

  /* ── desktop: single click while zoomed → reset ── */
  const handleClick = (e) => {
    if (zoomed) setZoomed(false);
  };

  /* ── desktop: double-click → zoom at cursor position ── */
  const handleDoubleClick = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setOrigin({ x, y });
    setZoomed(true);
  };

  if (!images.length) return null;

  return (
    <div className="pg-wrap">

      {/* ── MAIN IMAGE ── */}
      <div
        className={`pg-main${zoomed ? " pg-main--zoomed" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <img
          key={active}
          src={images[active]}
          alt={product?.name || "product"}
          className="pg-main-img"
          loading="lazy"
          draggable={false}
          style={zoomed ? {
            transform: `scale(2.6)`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
            cursor: "zoom-out",
          } : {}}
        />

        {/* hint — visible only when not zoomed */}
        {!zoomed && (
          <div className="pg-zoom-hint">Double-click to zoom</div>
        )}

        {/* dot indicators — mobile only */}
        {images.length > 1 && (
          <div className="pg-dots">
            {images.map((_, i) => (
              <button
                key={i}
                className={`pg-dot${i === active ? " pg-dot--active" : ""}`}
                onClick={e => { e.stopPropagation(); setActive(i); setZoomed(false); }}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* arrow nav — hidden while zoomed so they don't interfere */}
        {images.length > 1 && !zoomed && (
          <>
            <button
              className="pg-arrow pg-arrow--left"
              onClick={e => { e.stopPropagation(); goPrev(); }}
              aria-label="Previous"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              className="pg-arrow pg-arrow--right"
              onClick={e => { e.stopPropagation(); goNext(); }}
              aria-label="Next"
            >
              <ChevronIcon dir="right" />
            </button>
          </>
        )}

        {/* counter badge — hidden while zoomed */}
        {images.length > 1 && !zoomed && (
          <div className="pg-counter">{active + 1} / {images.length}</div>
        )}
      </div>

      {/* ── THUMBNAILS ── */}
      {images.length > 1 && (
        <div className="pg-thumbs">
          {images.map((img, i) => (
            <button
              key={i}
              className={`pg-thumb${i === active ? " pg-thumb--active" : ""}`}
              onClick={() => { setActive(i); setZoomed(false); }}
              aria-label={`View image ${i + 1}`}
            >
              <img src={img} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

    </div>
  );
};

export default ProductGallery;