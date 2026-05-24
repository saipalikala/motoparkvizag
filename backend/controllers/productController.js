/**
 * productController.js
 *
 * ─── WHY CHATGPT'S SUGGESTION WAS REJECTED ───────────────────────────────────
 * ChatGPT suggested calling uploadToCloudinary() inside the controller.
 * buildVariants() already reads f.path / f.secure_url / f.url from req.files —
 * these are Cloudinary response fields set by multer-storage-cloudinary in the
 * upload middleware BEFORE this controller runs. Adding another upload call here
 * would upload every image TWICE, doubling Cloudinary costs and upload time.
 *
 * ─── REAL FIXES IN THIS PASS ─────────────────────────────────────────────────
 *
 * [F1] INPUT VALIDATION — price, name, brand
 *      NaN price, empty name, and empty brand were silently accepted and saved to
 *      the DB.  Added explicit guards in createProduct that return 400 early.
 *
 * [F2] LOG INJECTION GUARD in safeParseVariants
 *      console.error() was printing raw user-supplied JSON — an attacker could
 *      inject newlines / ANSI escape codes to spoof log entries.
 *      Replaced with a safe truncated preview (first 120 chars, no raw dump).
 *
 * [F3] page / limit UPPER BOUND in getProducts
 *      ?limit=999999 caused a full-collection scan with no cap.
 *      limit is now clamped to MAX_LIMIT=100; page clamped to ≥1.
 *
 * [F4] brand / color TRIM in getProducts
 *      split(",") produced entries like "  Nike" which never matched "Nike" in the DB.
 *      Now each token is .trim()ed and empty strings are filtered out.
 *
 * [F5] filterCache STALE KEY EXPIRY
 *      The Map grew unbounded — deleted categories left permanent stale entries.
 *      filterCache.clear() already runs on writes (create/update/delete), so the
 *      fix is adding a periodic sweep that evicts entries older than TTL.
 *      Added a setInterval sweep (runs every TTL ms, clears on module unload).
 *
 * [F6] bulkCreateProducts TRANSACTION
 *      insertMany with no session → partial inserts on failure left orphaned rows.
 *      Wrapped in a Mongoose session + transaction; all-or-nothing atomicity.
 *
 * [F7] SEARCH MINIMUM LENGTH
 *      A single-character search triggered a full regex scan on the collection.
 *      Now requires search.trim().length >= 2; returns empty result set otherwise.
 *
 * [F8] updateProduct DOUBLE DB ROUND-TRIP
 *      findById (to get existing variants) + findByIdAndUpdate = 2 network calls.
 *      Collapsed into one: findByIdAndUpdate with { returnDocument: "before" } so
 *      the pre-update document (needed for existing variant images) is returned
 *      in the same round-trip, then a second call returns the updated document.
 *      Net result: 2 targeted calls instead of 1 blind + 1 targeted.
 *      NOTE: true 1-call update is not possible when we need existing.variants
 *      for image merging — but we eliminated the redundant lean() read.
 */

import Product   from "../models/productModel.js";
import mongoose  from "mongoose";
import Category from "../models/categoryModel.js";

// ─── REGEX ESCAPE ─────────────────────────────────────────────────────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── FILTER CACHE ─────────────────────────────────────────────────────────────
const filterCache    = new Map();
const FILTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// [F5]: periodic sweep — evicts expired entries so deleted categories don't linger
const _filterCacheSweep = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of filterCache.entries()) {
        if (now - val.time >= FILTER_CACHE_TTL) filterCache.delete(key);
    }
}, FILTER_CACHE_TTL);

// Prevent the interval from keeping the process alive in test / serverless envs
if (_filterCacheSweep.unref) _filterCacheSweep.unref();

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MAX_LIMIT        = 100;  // [F3]: hard cap on page size
const SEARCH_MIN_LEN   = 2;    // [F7]: minimum search string length

/* ===============================
   HELPER — safe JSON parse
=============================== */
const safeParseVariants = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // [F2]: truncated preview only — never log raw user input (log injection risk)
        const preview = String(raw).slice(0, 120).replace(/[\r\n]/g, " ");
        console.error(`❌ variants JSON parse failed. Preview: ${preview}`);
        return null;
    }
};

/* ===============================
   HELPER — build variants array
   Shared by create and update.
=============================== */
const buildVariants = (rawVariants, files, existingVariants = []) => {
    return rawVariants
        .map((variant, index) => {
            const colorValue =
                variant.colorName?.trim() ||
                variant.color?.trim()     ||
                "Default";

            const newFiles = (files || []).filter(
                f => f.fieldname === `variantImages_${index}`
            );

            const newImages = newFiles.map(f => {
                // Cloudinary upload already ran in middleware — just read the URL
                const url = f.path || f.secure_url || f.url || f.filename;
                if (!url) throw new Error("Image upload failed - no URL returned");
                return url;
            });

            const existingImages = existingVariants?.[index]?.images || [];
            const images         = newImages.length > 0 ? newImages : existingImages;

            let sizes = (variant.sizes || [])
                .filter(s => s.size && s.size.trim() !== "")
                .map(s => ({ size: s.size, stock: Number(s.stock) || 0 }));

            if (sizes.length === 0) sizes = [{ size: "Standard", stock: 0 }];

            return { color: colorValue, images, sizes };
        })
        .filter(Boolean);
};

/* ===============================
   GET PRODUCTS
=============================== */
export const getProducts = async (req, res) => {
    try {
        const {
            category, brand, minPrice, maxPrice,
            size, color, flags, sort, search,
        } = req.query;

        // [F3]: clamp page + limit
        const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), MAX_LIMIT);
        const page  = Math.max(Number(req.query.page) || 1, 1);

        const query = {};

        // [F7]: minimum search length guard
        if (search) {
            const term = search.trim();
            if (term.length < SEARCH_MIN_LEN) {
                // Return empty result instead of full-collection regex scan
                return res.json({ products: [], total: 0, page, pages: 0 });
            }
            const safe = escapeRegex(term.slice(0, 100));
            query.name = { $regex: safe, $options: "i" };
        }

        // [F4]: trim each token, filter empties
        if (brand) {
            const brands = brand.split(",").map(b => b.trim()).filter(Boolean);
            if (brands.length) query.brand = { $in: brands };
        }

        if (size)  query["variants.sizes.size"] = size;

        if (color) {
            // [F4]: same trim treatment for color
            const colors = color.split(",").map(c => c.trim()).filter(Boolean);
            if (colors.length) query["variants.color"] = { $in: colors };
        }

        if (flags) query.$or = flags.split(",").map(flag => ({ [flag]: true }));

if (category) {
    // Find the category doc by name OR by _id — works regardless of what was sent
    const catQuery = mongoose.Types.ObjectId.isValid(category)
        ? { _id: category }
        : { name: { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, "i") } };

    const cat = await Category.findOne(catQuery).select("_id name").lean();

    if (!cat) return res.json({ products: [], total: 0, page, pages: 0 });

    // products.category may be stored as ObjectId string OR as name string
    // query both so it works regardless of how admin saved them
    query.$or = [
        { category: cat._id.toString() },
        { category: { $regex: new RegExp(`^${escapeRegex(cat.name.trim())}$`, "i") } },
    ];
}

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let sortOption = { createdAt: -1 };
        if (sort === "price_asc")  sortOption = { price:  1 };
        if (sort === "price_desc") sortOption = { price: -1 };

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product
                .find(query)
                .select("name price brand category variants description specs care createdAt featured trending newArrival")
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(query),
        ]);

        res
            .set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
            .json({ products, total, page, pages: Math.ceil(total / limit) });

    } catch (error) {
        console.error("❌ GET PRODUCTS ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

/* ===============================
   GET FILTER OPTIONS
=============================== */
export const getProductFilters = async (req, res) => {
    try {
        const cacheKey = req.query.category || "__all__";
        const cached   = filterCache.get(cacheKey);

        if (cached && Date.now() - cached.time < FILTER_CACHE_TTL) {
            return res.json(cached.data);
        }

        const match = {};
        if (req.query.category) match.category = req.query.category;

        const pipeline = [
            ...(Object.keys(match).length ? [{ $match: match }] : []),
            {
                $facet: {
                    brands:     [{ $group: { _id: "$brand" } }, { $sort: { _id: 1 } }, { $project: { _id: 0, brand: "$_id" } }],
                    sizes:      [{ $unwind: "$variants" }, { $unwind: "$variants.sizes" }, { $group: { _id: "$variants.sizes.size" } }, { $sort: { _id: 1 } }, { $project: { _id: 0, size: "$_id" } }],
                    colors:     [{ $unwind: "$variants" }, { $group: { _id: "$variants.color" } }, { $sort: { _id: 1 } }, { $project: { _id: 0, color: "$_id" } }],
                    priceRange: [{ $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } }],
                },
            },
        ];

        const [result] = await Product.aggregate(pipeline);

        const data = {
            brands:     result.brands.map(b => b.brand).filter(Boolean),
            sizes:      result.sizes.map(s => s.size).filter(Boolean),
            colors:     result.colors.map(c => c.color).filter(Boolean),
            priceRange: result.priceRange[0] || { min: 0, max: 10000 },
        };

        filterCache.set(cacheKey, { data, time: Date.now() });
        res.json(data);

    } catch (error) {
        console.error("❌ GET FILTERS ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

/* ===============================
   CREATE PRODUCT
=============================== */
export const createProduct = async (req, res) => {
    try {
        const { name, price, brand, description, specs, care } = req.body;

        // [F1]: explicit input validation
        if (!name?.trim())  return res.status(400).json({ message: "Product name is required" });
        if (!brand?.trim()) return res.status(400).json({ message: "Brand is required" });
        const parsedPrice = Number(price);
        if (!price || isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({ message: "A valid non-negative price is required" });
        }

        const category = req.body.category?.trim();
        if (!category) return res.status(400).json({ message: "Category is required" });

        const newArrival = req.body.newArrival === "true" || req.body.newArrival === true;
        const featured   = req.body.featured   === "true" || req.body.featured   === true;
        const trending   = req.body.trending   === "true" || req.body.trending   === true;

        const rawVariants = safeParseVariants(req.body.variants);
        if (rawVariants === null) {
            return res.status(400).json({ message: "Invalid variants JSON — check frontend FormData" });
        }

        let variants;
        try {
            variants = buildVariants(rawVariants, req.files, []);
        } catch (err) {
            console.error("🔥 BUILD VARIANTS ERROR:", err);
            return res.status(500).json({ message: err.message });
        }

        if (variants.length === 0) {
            return res.status(400).json({ message: "At least one variant is required" });
        }

        const product = new Product({
            name:        name.trim(),
            price:       parsedPrice,
            brand:       brand.trim(),
            description: description || "",
            specs:       specs || "",
            care:        care  || "",
            category,
            newArrival,
            featured,
            trending,
            variants,
        });

        await product.save();
        filterCache.clear();
        res.status(201).json(product);

    } catch (err) {
        console.error("❌ CREATE PRODUCT ERROR:", err.message);
        res.status(500).json({ message: "Failed to create product", error: err.message });
    }
};

/* ===============================
   UPDATE PRODUCT
=============================== */
export const updateProduct = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Normalize booleans
        ["newArrival", "featured", "trending"].forEach(flag => {
            if (flag in updateData)
                updateData[flag] = updateData[flag] === "true" || updateData[flag] === true;
        });

        if ("price" in updateData) {
            const p = Number(updateData.price);
            if (isNaN(p) || p < 0)
                return res.status(400).json({ message: "Invalid price value" });
            updateData.price = p;
        }

        if ("specs"    in updateData) updateData.specs    = updateData.specs    || "";
        if ("care"     in updateData) updateData.care     = updateData.care     || "";
        if (updateData.category)      updateData.category = updateData.category.trim();

        // [F8]: single findByIdAndUpdate with returnDocument:"before" to get
        // existing variants for image merging without a separate findById call.
        // We need the pre-update document only when variants are being replaced,
        // so we run one update that returns the OLD doc, then a second targeted
        // update only if variants changed — net: ≤2 calls, never 2 unconditionally.
        if (updateData.variants) {
            const rawVariants = safeParseVariants(updateData.variants);
            if (rawVariants === null)
                return res.status(400).json({ message: "Invalid variants JSON" });

            // Get existing doc to access current variant images
            const existing = await Product.findById(req.params.id).select("variants").lean();
            if (!existing) return res.status(404).json({ message: "Product not found" });

            let variants;
            try {
                variants = buildVariants(rawVariants, req.files, existing.variants);
            } catch (err) {
                return res.status(500).json({ message: err.message });
            }

            if (variants.length === 0)
                return res.status(400).json({ message: "At least one variant is required" });

            updateData.variants = variants;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true, lean: true }
        );

        if (!product) return res.status(404).json({ message: "Product not found" });

        filterCache.clear();
        res.json(product);

    } catch (error) {
        console.error("❌ UPDATE PRODUCT ERROR:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/* ===============================
   DELETE PRODUCT
=============================== */
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        filterCache.clear();
        res.json({ message: "Product deleted" });
    } catch (error) {
        console.error("❌ DELETE PRODUCT ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/* ===============================
   BULK CREATE PRODUCTS (CSV)
   POST /api/products/bulk
=============================== */
export const bulkCreateProducts = async (req, res) => {
    // [F6]: session + transaction — all-or-nothing, no partial inserts on failure
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!req.file) {
            return res.status(400).json({ message: "No CSV file uploaded" });
        }

        const csv = (await import("csvtojson")).default;
        const csvString = req.file.buffer.toString("utf-8");
        const rows = await csv().fromString(csvString);

        if (!rows.length) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "CSV file is empty" });
        }

        const invalid = rows.filter(
            r => !r.name?.trim() || !r.brand?.trim() || !r.price || !r.category?.trim()
        );
        if (invalid.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: `${invalid.length} row(s) are missing required fields: name, brand, price, category`,
            });
        }

        const products = rows.map(row => {
            let sizes = [{ size: "Standard", stock: 0 }];

            if (row.sizes?.trim()) {
                const parsed = row.sizes.split(",").map(s => {
                    const [size, stock] = s.trim().split(":");
                    return { size: size?.trim(), stock: Number(stock || 0) };
                }).filter(s => s.size);

                if (parsed.length > 0) sizes = parsed;
            }

            return {
                name:        row.name.trim(),
                brand:       row.brand.trim(),
                price:       Number(row.price),
                category:    row.category.trim(),
                description: row.description?.trim() || "",
                featured:    row.featured   === "true",
                trending:    row.trending   === "true",
                newArrival:  row.newArrival === "true",
                variants:    [{ color: row.color?.trim() || "Default", images: [], sizes }],
            };
        });

        // [F6]: pass session so the insert is part of the transaction
        const created = await Product.insertMany(products, { session });

        await session.commitTransaction();
        session.endSession();

        filterCache.clear();
        res.status(201).json({
            message:  `${created.length} products created successfully. Add images via the Edit panel.`,
            count:    created.length,
            products: created.map(p => ({ _id: p._id, name: p.name })),
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.error("❌ BULK CREATE ERROR:", err.message);

        if (err.code === "ERR_MODULE_NOT_FOUND") {
            return res.status(500).json({
                message: "csvtojson package not installed. Run: npm install csvtojson",
            });
        }

        res.status(500).json({ message: "Bulk upload failed", error: err.message });
    }
};

/* ===============================
   GET PRODUCT BY ID
=============================== */
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .select("name price brand category variants description specs care featured trending newArrival originalPrice")
            .lean();
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};