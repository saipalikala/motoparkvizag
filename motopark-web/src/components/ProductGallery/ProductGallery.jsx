import { useState, useEffect } from "react";
import { API } from "@/config/api";
import "./ProductGallery.css";

const ProductGallery = ({ images = [] }) => {

    const [active, setActive] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);

    /* KEYBOARD NAVIGATION */
    useEffect(() => {
        if (!images.length) return;

        const handleKey = (e) => {

            if (e.key === "ArrowRight") {
                setActive((prev) => (prev + 1) % images.length);
            }

            if (e.key === "ArrowLeft") {
                setActive((prev) =>
                    prev === 0 ? images.length - 1 : prev - 1
                );
            }

            if (e.key === "Escape") {
                setFullscreen(false);
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);

    }, [images]);

    if (!images.length) return null;

    return (

        <div className="product-gallery">

            {/* MAIN IMAGE */}
            <div className="gallery-main">

                <div
                    className="zoom-container"
                    onClick={() => setFullscreen(true)}
                >
                    <img
                        key={active}
                        src={`${API}${images[active]}`}
                        alt="product"
                        className="main-img"
                        loading="lazy"
                    />
                </div>

                {/* ARROWS */}
                <button
                    className="arrow left"
                    onClick={(e) => {
                        e.stopPropagation();
                        setActive(prev =>
                            prev === 0 ? images.length - 1 : prev - 1
                        );
                    }}
                >
                    ‹
                </button>

                <button
                    className="arrow right"
                    onClick={(e) => {
                        e.stopPropagation();
                        setActive(prev => (prev + 1) % images.length);
                    }}
                >
                    ›
                </button>

            </div>

            {/* THUMBNAILS */}
            <div className="gallery-thumbs">
                {images.map((img, i) => (
                    <img
                        key={i}
                        src={`${API}${img}`}
                        className={active === i ? "active" : ""}
                        onClick={() => setActive(i)}
                        loading="lazy"
                    />
                ))}
            </div>

            {/* FULLSCREEN */}
            {fullscreen && (
                <div
                    className="gallery-fullscreen"
                    onClick={() => setFullscreen(false)}  // 🔥 click outside close
                >

                    {/* CLOSE BUTTON */}
                    <button
                        className="close-fullscreen"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFullscreen(false);
                        }}
                    >
                        ✕
                    </button>

                    {/* IMAGE */}
                    <img
                        src={`${API}${images[active]}`}
                        alt="fullscreen"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* NAVIGATION */}
                    <button
                        className="fs-arrow left"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActive(prev =>
                                prev === 0 ? images.length - 1 : prev - 1
                            );
                        }}
                    >
                        ‹
                    </button>

                    <button
                        className="fs-arrow right"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActive(prev => (prev + 1) % images.length);
                        }}
                    >
                        ›
                    </button>

                    {/* HINT */}
                    <div className="fs-hint">
                        Click anywhere to close
                    </div>

                </div>
            )}

        </div>

    );
};

export default ProductGallery;