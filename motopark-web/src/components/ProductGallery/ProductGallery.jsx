import { useState, useEffect } from "react";
import "./ProductGallery.css";

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
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        if (!images.length) return;
        const handleKey = (e) => {
            if (e.key === "ArrowRight") setActive(prev => (prev + 1) % images.length);
            if (e.key === "ArrowLeft") setActive(prev => prev === 0 ? images.length - 1 : prev - 1);
            if (e.key === "Escape") closeFullscreen();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [images]);

    useEffect(() => {
        document.body.style.overflow = fullscreen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [fullscreen]);

    const openFullscreen = () => { setFullscreen(true); onFullscreenChange?.(true); };
    const closeFullscreen = () => { setFullscreen(false); onFullscreenChange?.(false); };

    if (!images.length) return null;

    const rating = 4;

    return (
        <div className="product-gallery">

            {/* MAIN IMAGE */}
            <div className="gallery-main">
                <div className="zoom-container" onClick={() => openFullscreen()}>
                    <img key={active} src={images[active]} alt="product" className="main-img" loading="lazy" />
                    <div className="gallery-zoom-hint">🔍 Click to expand</div>
                </div>
                <button className="arrow left" onClick={(e) => { e.stopPropagation(); setActive(prev => prev === 0 ? images.length - 1 : prev - 1); }}>‹</button>
                <button className="arrow right" onClick={(e) => { e.stopPropagation(); setActive(prev => (prev + 1) % images.length); }}>›</button>
            </div>

            {/* THUMBNAILS */}
            <div className="gallery-thumbs">
                {images.map((img, i) => (
                    <img key={i} src={img} className={active === i ? "active" : ""} onClick={() => setActive(i)} loading="lazy" alt={`thumb-${i}`} />
                ))}
            </div>

            {/* FULLSCREEN SPLIT LAYOUT */}
            {fullscreen && (
                <div className="gallery-fullscreen" onClick={() => closeFullscreen()}>

                    <button className="close-fullscreen" onClick={(e) => { e.stopPropagation(); closeFullscreen(); }}>✕</button>

                    <div className="fs-split" onClick={(e) => e.stopPropagation()}>

                        {/* LEFT — IMAGE */}
                        <div className="fs-image-side">
                            <button className="fs-arrow left" onClick={(e) => { e.stopPropagation(); setActive(prev => prev === 0 ? images.length - 1 : prev - 1); }}>‹</button>
                            <img src={images[active]} alt="fullscreen" className="fs-main-img" />
                            <button className="fs-arrow right" onClick={(e) => { e.stopPropagation(); setActive(prev => (prev + 1) % images.length); }}>›</button>
                            <div className="fs-thumbs">
                                {images.map((img, i) => (
                                    <img key={i} src={img} className={active === i ? "fs-thumb active" : "fs-thumb"} onClick={() => setActive(i)} alt="" />
                                ))}
                            </div>
                        </div>

                        {/* RIGHT — INFO PANEL */}
                        {product && (
                            <div className="fs-info-side">

                                <div className="fs-header">
                                    {product.brand && <span className="fs-brand">{product.brand}</span>}
                                    <h2 className="fs-title">{product.name}</h2>
                                    <div className="fs-rating">
                                        {[1, 2, 3, 4, 5].map(s => <StarIcon key={s} filled={s <= rating} />)}
                                        <span className="fs-rating-count">(128)</span>
                                    </div>
                                </div>

                                <div className="fs-price-row">
                                    <span className="fs-price">₹{product.price?.toLocaleString("en-IN")}</span>
                                    {product.originalPrice && (
                                        <>
                                            <span className="fs-original-price">₹{product.originalPrice?.toLocaleString("en-IN")}</span>
                                            <span className="fs-discount">{Math.round((1 - product.price / product.originalPrice) * 100)}% off</span>
                                        </>
                                    )}
                                </div>

                                <div className="fs-divider" />

                                {product.variants?.length > 0 && (
                                    <div className="fs-section">
                                        <p className="fs-label">Color <span className="fs-label-val">{variant?.color}</span></p>
                                        <div className="fs-colors">
                                            {product.variants.map((v, i) => (
                                                <button key={i}
                                                    className={`fs-color-btn ${variantIndex === i ? "fs-color-btn--active" : ""}`}
                                                    style={{ background: v.color?.toLowerCase() }}
                                                    onClick={() => { setVariantIndex(i); setSelectedSize(null); }}
                                                    aria-label={`Color: ${v.color}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {variant?.sizes?.length > 0 && (
                                    <div className="fs-section">
                                        <p className="fs-label">Size {selectedSize && <span className="fs-label-val">{selectedSize}</span>}</p>
                                        <div className={`fs-sizes ${sizeError ? "fs-sizes--error" : ""}`}>
                                            {variant.sizes.map((s, i) => (
                                                <button key={i}
                                                    disabled={Number(s.stock) === 0}
                                                    className={`fs-size-btn ${selectedSize === s.size ? "fs-size-btn--active" : ""}`}
                                                    onClick={() => { setSelectedSize(s.size); setSizeError(false); }}>
                                                    {s.size}
                                                </button>
                                            ))}
                                        </div>
                                        {sizeError && <p className="fs-size-error">Please select a size</p>}
                                    </div>
                                )}

                                <div className="fs-divider" />

                                <div className="fs-actions">
                                    <button
                                        className={`fs-add-cart ${addedToCart ? "fs-add-cart--added" : ""} ${!inStock ? "fs-add-cart--disabled" : ""}`}
                                        disabled={!inStock}
                                        onClick={onAddToCart}>
                                        {addedToCart ? <><CheckIcon /> Added!</> : alreadyInCart ? "Go to Cart →" : "Add to Cart"}
                                    </button>
                                    <button
                                        className={`fs-wishlist ${wishlisted ? "fs-wishlist--active" : ""}`}
                                        onClick={onWishlist}>
                                        <HeartIcon filled={wishlisted} />
                                    </button>
                                </div>

                                <p className={`fs-stock ${inStock ? "fs-stock--in" : "fs-stock--out"}`}>
                                    {inStock ? "✓ In Stock — Ships in 2–3 days" : "✗ Currently out of stock"}
                                </p>

                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductGallery;