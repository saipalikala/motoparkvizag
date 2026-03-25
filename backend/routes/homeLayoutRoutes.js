import express from "express";
import HomeLayout from "../models/homeLayoutModel.js";

const router = express.Router();

/* =================================
GET HOMEPAGE LAYOUT
================================= */

router.get("/", async (req, res) => {

    try {

        let layout = await HomeLayout.findOne();

        /* Create default layout if none exists */

        if (!layout) {

            layout = await HomeLayout.create({
                sections: [

                    {
                        key: "PremiumCarousel",
                        title: "Hero Carousel",
                        order: 1
                    },

                    {
                        key: "NewArrivalsSlider",
                        title: "New Arrivals",
                        order: 2,
                        settings: { limit: 8 }
                    },

                    {
                        key: "VideoShowcase",
                        title: "Video Story",
                        order: 3
                    },

                    {
                        key: "CategoryShowcase",
                        title: "Shop By Category",
                        order: 4
                    },

                    {
                        key: "BentoGrid",
                        title: "Featured Products",
                        order: 5
                    },

                    {
                        key: "TrendingProducts",
                        title: "Trending Products",
                        order: 6,
                        settings: {
                            category: "helmets",
                            limit: 8
                        }
                    },

                    {
                        key: "WhyMotoPark",
                        title: "Why MotoPark",
                        order: 7
                    },

                    {
                        key: "BrandShowcase",
                        title: "Brands",
                        order: 8
                    }

                ]
            });

        }

        res.json(layout);

    } catch (error) {

        res.status(500).json({
            message: "Failed to load homepage layout",
            error: error.message
        });

    }

});


/* =================================
UPDATE HOMEPAGE LAYOUT
================================= */

router.put("/", async (req, res) => {

    try {

        const { sections } = req.body;

        const updatedLayout = await HomeLayout.findOneAndUpdate(
            {},
            { sections },
            {
                new: true,
                upsert: true
            }
        );

        res.json(updatedLayout);

    } catch (error) {

        res.status(500).json({
            message: "Failed to update homepage layout",
            error: error.message
        });

    }

});

export default router;