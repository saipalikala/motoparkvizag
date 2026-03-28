import { useEffect, useState } from "react";

import PremiumCarousel from "@/components/PremiumCarousel/PremiumCarousel";
import NewArrivalsSlider from "@/components/NewArrivalsSlider/NewArrivalsSlider";
import VideoShowcase from "@/components/VideoShowcase/VideoShowcase";
import BentoGrid from "@/components/BentoGrid/BentoGrid";
import TrendingProducts from "@/components/TrendingProducts/TrendingProducts";
import WhyMotoPark from "@/components/WhyMotoPark/WhyMotoPark";
import BrandShowcase from "@/components/BrandShowcase/BrandShowcase";
import ScrollReveal from "@/components/ScrollReveal/ScrollReveal";

import { API } from "@/config/api";
import "./Home.css";

const componentMap = {
    PremiumCarousel: () => <PremiumCarousel />,
    NewArrivalsSlider: () => <NewArrivalsSlider />,
    VideoShowcase: () => <VideoShowcase />,
    BentoGrid: () => <BentoGrid title="Highest Selling" type="featured" />,
    TrendingProducts: () => <TrendingProducts />,
    WhyMotoPark: () => <WhyMotoPark />,
    BrandShowcase: () => <BrandShowcase />,
};

/* ── DEFAULT LAYOUT ──────────────────────────────────────────────────
   Rendered immediately — no API wait.
   This means the carousel shows on screen instantly.
   API response only re-orders / hides sections (no visual jump).
─────────────────────────────────────────────────────────────────── */
const DEFAULT_SECTIONS = [
    { key: "PremiumCarousel", order: 0, enabled: true },
    { key: "BentoGrid", order: 1, enabled: true },
    { key: "TrendingProducts", order: 2, enabled: true },
    { key: "NewArrivalsSlider", order: 3, enabled: true },
    { key: "VideoShowcase", order: 4, enabled: true },
    { key: "WhyMotoPark", order: 5, enabled: true },
    { key: "BrandShowcase", order: 6, enabled: true },
];

function Home() {
    const [sections, setSections] = useState(DEFAULT_SECTIONS);

    useEffect(() => {
        fetch(`${API}/home-layout`)
            .then(r => r.json())
            .then(data => {
                if (data?.sections?.length) {
                    setSections(data.sections.sort((a, b) => a.order - b.order));
                }
            })
            .catch(() => { /* keep default layout on error */ });
    }, []);

    const enabled = sections.filter(s => s.enabled);

    return (
        <div className="home-page">
            {enabled.map((section, i) => {
                const Component = componentMap[section.key];
                if (!Component) return null;

                const isHero = section.key === "PremiumCarousel";

                /* ── FIX 1: Never wrap hero in ScrollReveal ──
                   ScrollReveal hides elements until they scroll into view.
                   The hero IS the first view — wrapping it causes CLS and
                   delays LCP because the element starts as opacity:0 / hidden. */
                if (isHero) {
                    return (
                        <section key={section.key} className="hero">
                            <Component />
                        </section>
                    );
                }

                /* Below-fold sections are fine with ScrollReveal */
                return (
                    <ScrollReveal key={section.key}>
                        <section className="home-section">
                            <Component />
                        </section>
                    </ScrollReveal>
                );
            })}
        </div>
    );
}

export default Home;