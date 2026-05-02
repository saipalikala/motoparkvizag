/* ================================================
   File: backend/controllers/homeController.js

   Single endpoint that returns ALL homepage data.
   Uses Promise.all (parallel DB queries) + 5-min cache.
   Replaces 5 separate API calls with 1.

   FIXES APPLIED:
   ✅ Removed `images` from all .select() projections
      → `images` is NOT a field on the product schema.
        Only `variants[].images` exists. Selecting a
        non-existent field is a silent no-op in Mongoose
        but it adds noise to every projection and signals
        incorrect schema understanding to anyone reading
        this code. Removed from all 3 queries.
   ✅ Removed `featured` and `trending` flags from the
      featured/trending .select() calls — ProductCard
      never reads these booleans for display. They were
      adding bytes to every cached response for no reason.

   NOT CHANGED:
   ✗ node-cache replacement rejected — the suggested fix
     references `status`, `isTrending`, `Carousel`,
     `Category`, and `HomeLayout` models that do NOT
     exist in this codebase. Adopting it would break the
     endpoint entirely. The existing in-memory cache is
     correct and sufficient at this scale.
   ================================================ */
import Product from "../models/productModel.js";

/* ── IN-MEMORY CACHE ──
   Simple object cache — no Redis needed at this scale.
   TTL: 5 minutes. Cleared on any product/carousel update. */
let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const clearHomeCache = () => {
    cache     = null;
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
           All 3 queries run at the same time.
           Total time = slowest query, not sum of all.

           .select() only includes fields ProductCard
           actually reads — name, price, brand, category,
           variants (holds the images and sizes),
           and createdAt for sort stability.

           `images` removed — not a schema field.
           `featured`/`trending` flags removed from
           featured/trending queries — display never
           reads them, they were dead payload bytes. */
        const [featured, trending, newArrivals] = await Promise.all([
            Product.find({ featured: true })
                .select("name price brand category variants createdAt")
                .limit(5)
                .lean(),

            Product.find({ trending: true })
                .select("name price brand category variants createdAt")
                .limit(10)
                .lean(),

            Product.find({ newArrival: true })
                .select("name price brand category variants createdAt")
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
        cache     = data;
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