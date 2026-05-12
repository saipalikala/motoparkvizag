/* ================================================
   Home.jsx — Refactored Premium Homepage
   
   FIXES:
   ✅ Single animation system: Framer Motion only
   ✅ Removed useScrollReveal, useParallax (conflicting)
   ✅ Lenis smooth scroll initialized once, in App-level
      (moved out of Home to prevent re-init on remount)
   ✅ No duplicate wrappers / nested observers
   ✅ Each section renders exactly once
   ✅ Clean lazy loading with stable Suspense fallbacks
   ================================================ */
import { useState, lazy, Suspense, useMemo } from "react"; // add useMemo
import { Helmet } from "react-helmet-async"; 
import { useProducts } from "@/context/ProductContext";
import "./Home.css";

import PremiumCarousel from "@/components/PremiumCarousel/PremiumCarousel";

/* Lazy sections */
const BentoGrid          = lazy(() => import("@/components/BentoGrid/BentoGrid"));
const TrendingProducts   = lazy(() => import("@/components/TrendingProducts/TrendingProducts"));
const HorizontalShowcase = lazy(() => import("@/components/HorizontalShowcase/HorizontalShowcase"));
const NewArrivalsSlider  = lazy(() => import("@/components/NewArrivalsSlider/NewArrivalsSlider"));
const VideoShowcase      = lazy(() => import("@/components/VideoShowcase/VideoShowcase"));
const WhyMotoPark        = lazy(() => import("@/components/WhyMotoPark/WhyMotoPark"));
const BrandShowcase      = lazy(() => import("@/components/BrandShowcase/BrandShowcase"));

/* ── Minimal skeleton fallbacks ── */
const CardRowSkeleton = () => (
    <div className="skeleton-section" aria-hidden="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton-row">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton--card" />)}
        </div>
    </div>
);

const BentoSkeleton = () => (
    <div className="skeleton-section" aria-hidden="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton-grid">
            <div className="skeleton skeleton--hero-card" />
            <div className="skeleton-small-grid">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton--small-card" />)}
            </div>
        </div>
    </div>
);

/* ════════════════════════════════
   HOME
   NOTE: useSmoothScroll removed from here.
   Initialize Lenis once at the App/Router level to
   prevent re-creation on every Home mount/unmount.
   See: src/App.jsx  →  useSmoothScroll()
════════════════════════════════ */
function Home() {
  const { featured, trending, newArrivals, loading } = useProducts();

  const showcaseProducts = useMemo(() =>
    [...featured, ...trending]
      .filter((p, i, arr) => arr.findIndex(x => x._id === p._id) === i)
      .slice(0, 8),
    [featured, trending]
  );

    return (
        <div className="home-page">
             {/* ── SEO ── */}
        <Helmet>
          <title>MotoPark Vizag — Premium Motorcycle Gear</title>
          <meta name="description" content="Shop helmets, jackets, gloves and riding gear at MotoPark Vizag. Best motorcycle gear store in Visakhapatnam." />
          <link rel="canonical" href="https://motoparkvizag.in/" />
          <meta property="og:title"       content="MotoPark Vizag — Premium Motorcycle Gear" />
          <meta property="og:description" content="Best motorcycle helmets, jackets and riding gear in Vizag." />
          <meta property="og:url"         content="https://motoparkvizag.in/" />
          <meta property="og:image"       content="https://motoparkvizag.in/og-image.jpg" />
        </Helmet>

        
            {/* CSS-only ambient background — no JS, no canvas */}
            <div className="home-ambient" aria-hidden="true">
                <div className="ambient-orb ambient-orb--1" />
                <div className="ambient-orb ambient-orb--2" />
                <div className="ambient-orb ambient-orb--3" />
            </div>

            {/* ── Hero ── */}
            <section className="home-hero">
                <PremiumCarousel />
            </section>

            <Divider />
            <Divider />

            {/* ── New Arrivals ── */}
            <section className="home-section">
                {loading
                    ? <CardRowSkeleton />
                    : (
                        <Suspense fallback={<CardRowSkeleton />}>
                            <NewArrivalsSlider products={newArrivals} />
                        </Suspense>
                    )
                }
            </section>

            <Divider />
            {/* ── Highest Selling / Featured ── */}
            <section className="home-section">
                {loading
                    ? <BentoSkeleton />
                    : (
                        <Suspense fallback={<BentoSkeleton />}>
                            <BentoGrid
                                title="Highest Selling"
                                type="featured"
                                products={featured}
                            />
                        </Suspense>
                    )
                }
            </section>



            {/* ── Horizontal Showcase ── */}
            {!loading && showcaseProducts.length > 0 && (
                <section className="home-section home-section--full">
                    <Suspense fallback={null}>
                        <HorizontalShowcase products={showcaseProducts} />
                    </Suspense>
                </section>
            )}

            <Divider />
                        <Divider />

            {/* ── Trending ── */}
            <section className="home-section">
                {loading
                    ? <CardRowSkeleton />
                    : (
                        <Suspense fallback={<CardRowSkeleton />}>
                            <TrendingProducts products={trending} />
                        </Suspense>
                    )
                }
            </section>



            {/* ── Video Showcase ── */}
            <section className="home-section home-section--full">
                <Suspense fallback={null}>
                    <VideoShowcase />
                </Suspense>
            </section>

            <Divider />

            {/* ── Why MotoPark ── */}
            <section className="home-section">
                <Suspense fallback={null}>
                    <WhyMotoPark />
                </Suspense>
            </section>

            <Divider />

            {/* ── Brand Showcase ── */}
            <section className="home-section">
                <Suspense fallback={null}>
                    <BrandShowcase />
                </Suspense>
            </section>

        </div>
    );
}

/* Thin accent divider — pure CSS, zero JS */
const Divider = () => <div className="section-divider" aria-hidden="true" />;

export default Home;