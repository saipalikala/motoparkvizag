/* ================================================
   File: backend/controllers/homeController.js

   Single endpoint that returns ALL homepage data.
   Uses Promise.all (parallel DB queries) + 5-min cache.
   Replaces 5 separate API calls with 1.
   ================================================ */
import Product from "../models/productModel.js";

/* ── IN-MEMORY CACHE ──
   Simple object cache — no Redis needed at this scale.
   TTL: 5 minutes. Cleared on any product/carousel update. */
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const clearHomeCache = () => {
    cache = null;
    cacheTime = 0;
};

export const getHomeData = async (req, res) => {
    try {
        /* ── SERVE FROM CACHE if fresh ── */
        if (cache && Date.now() - cacheTime < CACHE_TTL) {
            return res
                .set("Cache-Control", "public, max-age=300, stale-while-revalidate=60")
                .set("X-Cache", "HIT")
                .json(cache);
        }

        /* ── PARALLEL DB QUERIES ──
           All 4 queries run at the same time instead of sequentially.
           Total time = slowest query, not sum of all queries. */
        const [featured, trending, newArrivals] = await Promise.all([
            Product.find({ featured: true })
                .select("name price brand category variants images featured trending createdAt")
                .limit(5)
                .lean(),

            Product.find({ trending: true })
                .select("name price brand category variants images featured trending createdAt")
                .limit(10)
                .lean(),

            Product.find({ newArrival: true })
                .select("name price brand category variants images createdAt")
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
        ]);

        const data = {
            featured,
            trending,
            newArrivals,
            generatedAt: Date.now(),
        };

        /* ── STORE IN CACHE ── */
        cache = data;
        cacheTime = Date.now();

        res
            .set("Cache-Control", "public, max-age=300, stale-while-revalidate=60")
            .set("X-Cache", "MISS")
            .json(data);

    } catch (err) {
        console.error("getHomeData error:", err);
        res.status(500).json({ message: "Failed to load homepage data", error: err.message });
    }
};