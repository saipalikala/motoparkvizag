import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import "./PremiumCarousel.css";

import slide1 from "@/assets/carousel/carousel-1.svg";
import slide2 from "@/assets/carousel/carousel-2.svg";
import slide3 from "@/assets/carousel/carousel-3.svg";

const API = "http://localhost:5000";

const fallbackSlides = [
    {
        id: 1,
        title: "Premium Riding Helmets",
        subtitle: "Engineered for safety, designed for style",
        cta: "Shop Helmets",
        image: slide1,
        route: "helmets",
        accent: "#ff6b3d"
    },
    {
        id: 2,
        title: "All Weather Jackets",
        subtitle: "Protection for every ride, every season",
        cta: "Shop Jackets",
        image: slide2,
        route: "jackets",
        accent: "#0b1d3a"
    },
    {
        id: 3,
        title: "Travel Luggage Systems",
        subtitle: "Adventure-ready gear built to last",
        cta: "Shop Luggage",
        image: slide3,
        route: "luggage",
        accent: "#ff6b3d"
    }
];

/* ─── ICONS ─── */
const ChevronLeft = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const ChevronRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

const ArrowRight = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PremiumCarousel = () => {
    const [slides, setSlides] = useState(fallbackSlides);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
    const timerRef = useRef(null);
    const navigate = useNavigate();

    /* FETCH */
    useEffect(() => {
        fetch(`${API}/api/carousel`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data) && data.length) setSlides(data); })
            .catch(() => { });
    }, []);

    /* PRELOAD */
    useEffect(() => {
        slides.forEach(s => {
            const img = new Image();
            img.src = s.image?.startsWith("/uploads") ? `${API}${s.image}` : s.image;
        });
    }, [slides]);

    /* AUTO SLIDE */
    const startTimer = () => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (!paused) {
                setDirection(1);
                setIndex(prev => (prev + 1) % slides.length);
            }
        }, 5000);
    };

    useEffect(() => {
        startTimer();
        return () => clearInterval(timerRef.current);
    }, [slides, paused]);

    const goTo = (i, dir = 1) => {
        setDirection(dir);
        setIndex(i);
        startTimer();
    };

    const next = () => goTo((index + 1) % slides.length, 1);
    const prev = () => goTo(index === 0 ? slides.length - 1 : index - 1, -1);

    /* SWIPE */
    const handlers = useSwipeable({
        onSwipedLeft: next,
        onSwipedRight: prev,
        trackMouse: false
    });

    const slide = slides[index];
    const imageSrc = slide.image?.startsWith("/uploads")
        ? `${API}${slide.image}`
        : slide.image;

    /* slide animation variants */
    const variants = {
        enter: (d) => ({ opacity: 0, x: d > 0 ? 60 : -60, scale: 1.04 }),
        center: { opacity: 1, x: 0, scale: 1.0 },
        exit: (d) => ({ opacity: 0, x: d > 0 ? -40 : 40, scale: 0.98 })
    };

    return (
        <section
            className="carousel"
            {...handlers}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* ── SLIDE ── */}
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={slide.id || slide._id || index}
                    className="carousel-slide"
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                    style={{ backgroundImage: `url(${imageSrc})` }}
                >
                    {/* LAYERED OVERLAY */}
                    <div className="carousel-overlay" />

                    {/* CONTENT */}
                    <div className="carousel-content">

                        {/* EYEBROW */}
                        <motion.span
                            className="carousel-eyebrow"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.15 }}
                        >
                            MotoPark Collection
                        </motion.span>

                        {/* TITLE */}
                        <motion.h2
                            className="carousel-title"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.25 }}
                        >
                            {slide.title}
                        </motion.h2>

                        {/* SUBTITLE */}
                        <motion.p
                            className="carousel-subtitle"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.38 }}
                        >
                            {slide.subtitle}
                        </motion.p>

                        {/* CTA */}
                        <motion.div
                            className="carousel-actions"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.5 }}
                        >
                            <button
                                className="carousel-cta"
                                onClick={() => navigate(`/category/${slide.route}`)}
                            >
                                {slide.cta || "Explore Collection"}
                                <ArrowRight />
                            </button>

                            <button
                                className="carousel-cta-ghost"
                                onClick={() => navigate("/store")}
                            >
                                View All Gear
                            </button>
                        </motion.div>

                    </div>

                    {/* SLIDE COUNTER */}
                    <div className="carousel-counter">
                        <span className="carousel-counter-cur">{String(index + 1).padStart(2, "0")}</span>
                        <span className="carousel-counter-sep" />
                        <span className="carousel-counter-total">{String(slides.length).padStart(2, "0")}</span>
                    </div>

                </motion.div>
            </AnimatePresence>

            {/* ── ARROWS ── */}
            <button className="carousel-arrow carousel-arrow--left" onClick={prev} aria-label="Previous slide">
                <ChevronLeft />
            </button>
            <button className="carousel-arrow carousel-arrow--right" onClick={next} aria-label="Next slide">
                <ChevronRight />
            </button>

            {/* ── BOTTOM BAR — dots + progress ── */}
            <div className="carousel-bar">

                {/* DOTS */}
                <div className="carousel-dots" role="tablist">
                    {slides.map((s, i) => (
                        <button
                            key={i}
                            role="tab"
                            aria-selected={i === index}
                            aria-label={`Slide ${i + 1}: ${s.title}`}
                            className={`carousel-dot ${i === index ? "carousel-dot--active" : ""}`}
                            onClick={() => goTo(i, i > index ? 1 : -1)}
                        >
                            {/* animated fill bar */}
                            {i === index && (
                                <span
                                    className="carousel-dot-fill"
                                    style={{ animationDuration: paused ? "0s" : "5s" }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* SLIDE TITLE MINI */}
                <p className="carousel-bar-title">{slide.title}</p>

            </div>

            {/* ── SCROLL HINT ── */}
            <div className="carousel-scroll-hint" aria-hidden="true">
                <div className="carousel-scroll-line">
                    <div className="carousel-scroll-dot" />
                </div>
                <span>Scroll</span>
            </div>

        </section>
    );
};

export default PremiumCarousel;