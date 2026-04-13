import { useState, useEffect, useRef, useCallback } from "react";
import "./ProductGallery.css";

/* ─── ICONS ─── */
const HeartIcon = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 24 24"
        fill={filled ? "#ff6b3d" : "none"}
        stroke={filled ? "#ff6b3d" : "currentColor"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const StarIcon = ({ filled }) => (
    <svg width="13" height="13" viewBox="0 0 24 24"
        fill={filled ? "#ff6b3d" : "none"}
        stroke="#ff6b3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const ZoomInIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

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
    onFullscreenChange,
}) => {
    const [active, setActive] = useState(0);
    const [lightbox, setLightbox] = useState(false);
    const [zoomed, setZoomed] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

    /* swipe state */
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);
    const isDragging = useRef(false);

    /* reset active index when images change */
    useEffect(() => { setActive(0); }, [images]);

    /* keyboard nav */
    useEffect(() => {
        if (!lightbox) return;
        const handler = (e) => {
            if (e.key === "ArrowRight") goNext();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "Escape") closeLightbox();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [lightbox, active, images.length]);

    /* lock body scroll when lightbox open */
    useEffect(() => {
        document.body.style.overflow = lightbox ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [lightbox]);

    const openLightbox = () => {
        setLightbox(true);
        setZoomed(false);
        onFullscreenChange?.(true);
    };

    const closeLightbox = () => {
        setLightbox(false);
        setZoomed(false);
        onFullscreenChange?.(false);
    };

    const goNext = useCallback(() => {
        setActive(p => (p + 1) % images.length);
        setZoomed(false);
    }, [images.length]);

    const goPrev = useCallback(() => {
        setActive(p => p === 0 ? images.length - 1 : p - 1);
        setZoomed(false);
    }, [images.length]);

    /* touch swipe handlers */
    const onTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        isDragging.current = false;
    };

    const onTouchMove = (e) => {
        if (!touchStartX.current) return;
        const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
        const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
        if (dx > dy && dx > 8) isDragging.current = true;
    };

    const onTouchEnd = (e) => {
        if (!touchStartX.current) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (isDragging.current && Math.abs(dx) > 40) {
            dx < 0 ? goNext() : goPrev();
        }
        touchStartX.current = null;
        isDragging.current = false;
    };

    /* zoom on click inside lightbox */
    const handleLightboxImageClick = (e) => {
        if (!zoomed) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setZoomPos({ x, y });
            setZoomed(true);
        } else {
            setZoomed(false);
        }
    };

    if (!images.length) return null;

    const rating = 4;

    return (
        <>
            {/* ── GALLERY WIDGET ── */}
            <div className="pg-wrap">

                {/* MAIN IMAGE AREA */}
                <div
                    className="pg-main"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <img
                        key={active}
                        src={images[active]}
                        alt={product?.name || "product"}
                        className="pg-main-img"
                        loading="lazy"
                        onClick={openLightbox}
                        draggable={false}
                    />

                    {/* Zoom hint — desktop only */}
                    <div className="pg-zoom-hint">
                        <ZoomInIcon /> Tap to zoom
                    </div>

                    {/* Dot indicators — mobile */}
                    {images.length > 1 && (
                        <div className="pg-dots">
                            {images.map((_, i) => (
                                <button
                                    key={i}
                                    className={`pg-dot ${i === active ? "pg-dot--active" : ""}`}
                                    onClick={() => setActive(i)}
                                    aria-label={`Image ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Arrow nav */}
                    {images.length > 1 && (
                        <>
                            <button className="pg-arrow pg-arrow--left" onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous">
                                <ChevronIcon dir="left" />
                            </button>
                            <button className="pg-arrow pg-arrow--right" onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next">
                                <ChevronIcon dir="right" />
                            </button>
                        </>
                    )}

                    {/* Image counter badge */}
                    {images.length > 1 && (
                        <div className="pg-counter">{active + 1} / {images.length}</div>
                    )}
                </div>

                {/* THUMBNAILS — horizontal scroll on mobile, vertical on desktop */}
                {images.length > 1 && (
                    <div className="pg-thumbs">
                        {images.map((img, i) => (
                            <button
                                key={i}
                                className={`pg-thumb ${i === active ? "pg-thumb--active" : ""}`}
                                onClick={() => setActive(i)}
                                aria-label={`View image ${i + 1}`}
                            >
                                <img src={img} alt="" loading="lazy" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── LIGHTBOX ── */}
            {lightbox && (
                <div className="pg-lightbox" onClick={closeLightbox}>

                    {/* Top bar */}
                    <div className="pg-lb-bar" onClick={e => e.stopPropagation()}>
                        <span className="pg-lb-counter">{active + 1} / {images.length}</span>
                        <span className="pg-lb-hint">{zoomed ? "Click to zoom out" : "Click image to zoom in"}</span>
                        <button className="pg-lb-close" onClick={closeLightbox} aria-label="Close">
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Main lightbox content */}
                    <div
                        className="pg-lb-content"
                        onClick={e => e.stopPropagation()}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        {/* Prev arrow */}
                        {images.length > 1 && (
                            <button className="pg-lb-arrow pg-lb-arrow--left" onClick={goPrev} aria-label="Previous">
                                <ChevronIcon dir="left" />
                            </button>
                        )}

                        {/* Image */}
                        <div
                            className={`pg-lb-img-wrap ${zoomed ? "pg-lb-img-wrap--zoomed" : ""}`}
                            onClick={handleLightboxImageClick}
                            style={zoomed ? {
                                cursor: "zoom-out",
                            } : { cursor: "zoom-in" }}
                        >
                            <img
                                src={images[active]}
                                alt={product?.name || "product"}
                                className="pg-lb-img"
                                style={zoomed ? {
                                    transform: "scale(2.5)",
                                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                } : {}}
                                draggable={false}
                            />
                        </div>

                        {/* Next arrow */}
                        {images.length > 1 && (
                            <button className="pg-lb-arrow pg-lb-arrow--right" onClick={goNext} aria-label="Next">
                                <ChevronIcon dir="right" />
                            </button>
                        )}
                    </div>

                    {/* Thumbnail strip */}
                    {images.length > 1 && (
                        <div className="pg-lb-thumbs" onClick={e => e.stopPropagation()}>
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    className={`pg-lb-thumb ${i === active ? "pg-lb-thumb--active" : ""}`}
                                    onClick={() => { setActive(i); setZoomed(false); }}
                                    aria-label={`View image ${i + 1}`}
                                >
                                    <img src={img} alt="" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ProductGallery;