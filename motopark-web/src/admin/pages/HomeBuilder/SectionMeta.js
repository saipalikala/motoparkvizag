import {
    Image,
    Star,
    LayoutGrid,
    PlayCircle,
    Tag,
    Award,
    Package
} from "lucide-react";

export const sectionMeta = {
    PremiumCarousel: {
        icon: Image,
        title: "Hero Carousel",
        description: "Main banner slider on homepage"
    },

    NewArrivalsSlider: {
        icon: Package,
        title: "New Arrivals",
        description: "Latest products slider"
    },

    VideoShowcase: {
        icon: PlayCircle,
        title: "Video Story",
        description: "Brand story video section"
    },

    CategoryShowcase: {
        icon: LayoutGrid,
        title: "Shop Categories",
        description: "Category cards navigation"
    },

    BentoGrid: {
        icon: Star,
        title: "Featured Grid",
        description: "Highlighted products grid"
    },

    TrendingProducts: {
        icon: Tag,
        title: "Trending Products",
        description: "Popular gear collection"
    },

    WhyMotoPark: {
        icon: Award,
        title: "Why MotoPark",
        description: "Brand trust section"
    },

    BrandShowcase: {
        icon: Package,
        title: "Brands",
        description: "Brand logos showcase"
    }
};