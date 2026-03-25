import { useEffect, useState } from "react";

import PremiumCarousel from "@/components/PremiumCarousel/PremiumCarousel";
// import CategoryShowcase from "@/components/CategoryShowcase/CategoryShowcase";
import NewArrivalsSlider from "@/components/NewArrivalsSlider/NewArrivalsSlider";
import VideoShowcase from "@/components/VideoShowcase/VideoShowcase";
import BentoGrid from "@/components/BentoGrid/BentoGrid";
import TrendingProducts from "@/components/TrendingProducts/TrendingProducts";
import WhyMotoPark from "@/components/WhyMotoPark/WhyMotoPark";
import BrandShowcase from "@/components/BrandShowcase/BrandShowcase";

import ScrollReveal from "@/components/ScrollReveal/ScrollReveal";
import { API } from "@/config/api"; // ✅ ADD THIS
import "./Home.css";

/* Map backend section key -> component */

const componentMap = {

    PremiumCarousel: () => <PremiumCarousel />,
    NewArrivalsSlider: () => <NewArrivalsSlider />,
    VideoShowcase: () => <VideoShowcase />,
    // CategoryShowcase: () => <CategoryShowcase />,
    BentoGrid: () => <BentoGrid title="Highest Selling" type="featured" />,
    TrendingProducts: () => <TrendingProducts />,
    WhyMotoPark: () => <WhyMotoPark />,
    BrandShowcase: () => <BrandShowcase />
};
const HOME_LAYOUT_API = `${API}/api/home-layout`;

function Home() {

    const [sections, setSections] = useState([]);

    useEffect(() => {

        fetch(HOME_LAYOUT_API)
            .then(res => res.json())
            .then(data => {

                const sorted = data.sections.sort((a, b) => a.order - b.order);

                setSections(sorted);

            });

    }, []);

    return (


        <div className="home-page">

            {sections
                .filter(section => section.enabled)
                .map(section => {

                    const Component = componentMap[section.key];

                    if (!Component) return null;

                    return (

                        <ScrollReveal key={section.key}>

                            <section
                                className={
                                    section.key === "PremiumCarousel"
                                        ? "hero"
                                        : "home-section"
                                }
                            >

                                <Component />

                            </section>

                        </ScrollReveal>

                    );

                })}

        </div>

    );


}

export default Home;