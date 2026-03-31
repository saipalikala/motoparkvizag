/* ================================================
   File: motopark-web/src/pages/Home/Home.jsx

   WHY THIS IS FASTER:
   1. Single /api/home-data call instead of 5 separate fetches
   2. PremiumCarousel renders immediately with fallback slides (no API wait)
   3. Product components receive data as props (no internal fetches)
   4. Skeleton loaders prevent CLS during data load
   ================================================ */
import { useEffect, useState, lazy, Suspense } from "react";
import { API } from "@/config/api";
import "./Home.css";

/* ── HERO loads eagerly — never lazy ── */
import PremiumCarousel from "@/components/PremiumCarousel/PremiumCarousel";

/* ── Below-fold components lazy-loaded ──
   They only download when needed, not on initial page load.
   This alone cuts initial JS bundle size significantly. */
const NewArrivalsSlider = lazy(() => import("@/components/NewArrivalsSlider/NewArrivalsSlider"));
const VideoShowcase = lazy(() => import("@/components/VideoShowcase/VideoShowcase"));
const BentoGrid = lazy(() => import("@/components/BentoGrid/BentoGrid"));
const TrendingProducts = lazy(() => import("@/components/TrendingProducts/TrendingProducts"));
const WhyMotoPark = lazy(() => import("@/components/WhyMotoPark/WhyMotoPark"));
const BrandShowcase = lazy(() => import("@/components/BrandShowcase/BrandShowcase"));
const ScrollReveal = lazy(() => import("@/components/ScrollReveal/ScrollReveal"));

/* ── SKELETON LOADERS ──
   Fixed heights prevent CLS — browser reserves space before data loads.
   Height matches the actual component height so no layout shift occurs. */
const HeroSkeleton = () => (
    <div className="skeleton skeleton--hero" aria-hidden="true" />
);

const SliderSkeleton = () => (
    <div className="skeleton-section" aria-hidden="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton-row">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton skeleton--card" />
            ))}
        </div>
    </div>
);

const GridSkeleton = () => (
    <div className="skeleton-section" aria-hidden="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton-grid">
            <div className="skeleton skeleton--hero-card" />
            <div className="skeleton-small-grid">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton skeleton--small-card" />
                ))}
            </div>
        </div>
    </div>
);

/* ════════════════════════════════
   MAIN HOME
════════════════════════════════ */
function Home() {
    const [homeData, setHomeData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/home-data`)
            .then(r => r.json())
            .then(data => { setHomeData(data); setLoading(false); })
            .catch(() => {
                setHomeData({ featured: [], trending: [], newArrivals: [] });
                setLoading(false);
            });
    }, []);

    return (
        <div className="home-page">

            <section className="hero">
                <PremiumCarousel />
            </section>

            {/* ✅ Always render — pass empty array, let component handle it */}
            {loading ? <GridSkeleton /> : (
                <Suspense fallback={<GridSkeleton />}>
                    <ScrollReveal>
                        <section className="home-section">
                            <BentoGrid
                                title="Highest Selling"
                                type="featured"
                                products={homeData?.featured || []}
                            />
                        </section>
                    </ScrollReveal>
                </Suspense>
            )}

            {loading ? <SliderSkeleton /> : (
                <Suspense fallback={<SliderSkeleton />}>
                    <ScrollReveal>
                        <section className="home-section">
                            <TrendingProducts products={homeData?.trending || []} />
                        </section>
                    </ScrollReveal>
                </Suspense>
            )}

            {loading ? <SliderSkeleton /> : (
                <Suspense fallback={<SliderSkeleton />}>
                    <ScrollReveal>
                        <section className="home-section">
                            <NewArrivalsSlider products={homeData?.newArrivals || []} />
                        </section>
                    </ScrollReveal>
                </Suspense>
            )}

            {/* These have no data dependency — unchanged */}
            <Suspense fallback={null}><ScrollReveal><section className="home-section"><VideoShowcase /></section></ScrollReveal></Suspense>
            <Suspense fallback={null}><ScrollReveal><section className="home-section"><WhyMotoPark /></section></ScrollReveal></Suspense>
            <Suspense fallback={null}><ScrollReveal><section className="home-section"><BrandShowcase /></section></ScrollReveal></Suspense>

        </div>
    );
}

export default Home;