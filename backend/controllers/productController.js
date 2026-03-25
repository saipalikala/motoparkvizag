import Product from "../models/productModel.js";
import mongoose from "mongoose";

/* ===============================
   HELPER — safe JSON parse
=============================== */
const safeParseVariants = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("❌ variants JSON parse failed. Raw value:", raw);
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
                variant.color?.trim() ||
                "Default";

            // ✅ USE files (NOT req.files)
            const newFiles = (files || []).filter(
                f => f.fieldname === `variantImages_${index}`
            );

            const newImages = newFiles.map(f => {
                const url = f.path || f.secure_url || f.url || f.filename;

                if (!url) {
                    console.log("❌ Invalid file object:", f);
                    throw new Error("Image upload failed - no URL returned");
                }

                return url;
            });

            const existingImages = existingVariants?.[index]?.images || [];
            const images = newImages.length > 0 ? newImages : existingImages;

            const sizes = (variant.sizes || [])
                .filter(s => s.size && s.size.trim() !== "")
                .map(s => ({
                    size: s.size,
                    stock: Number(s.stock) || 0
                }));

            if (sizes.length === 0) return null;

            return {
                color: colorValue,
                images,
                sizes
            };
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
            size, color, flags, sort,
            page = 1, limit = 12, search
        } = req.query;

        const query = {};

        if (search) query.name = { $regex: search, $options: "i" };
        if (brand) query.brand = { $in: brand.split(",") };
        if (size) query["variants.sizes.size"] = size;
        if (color) query["variants.color"] = { $in: color.split(",") };
        if (flags) query.$or = flags.split(",").map(flag => ({ [flag]: true }));

        if (category) {
            query.category = mongoose.Types.ObjectId.isValid(category)
                ? category
                : category.toLowerCase();
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let sortOption = { createdAt: -1 };
        if (sort === "price_asc") sortOption = { price: 1 };
        if (sort === "price_desc") sortOption = { price: -1 };

        const skip = (Number(page) - 1) * Number(limit);

        const [products, total] = await Promise.all([
            Product
                .find(query)
                .select("name price brand category variants createdAt featured trending newArrival")
                .sort(sortOption)
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Product.countDocuments(query)
        ]);

        res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });

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
        const match = {};
        if (req.query.category) match.category = req.query.category;

        const pipeline = [
            ...(Object.keys(match).length ? [{ $match: match }] : []),
            {
                $facet: {
                    brands: [{ $group: { _id: "$brand" } }, { $sort: { _id: 1 } }, { $project: { _id: 0, brand: "$_id" } }],
                    sizes: [{ $unwind: "$variants" }, { $unwind: "$variants.sizes" }, { $group: { _id: "$variants.sizes.size" } }, { $sort: { _id: 1 } }, { $project: { _id: 0, size: "$_id" } }],
                    colors: [{ $unwind: "$variants" }, { $group: { _id: "$variants.color" } }, { $sort: { _id: 1 } }, { $project: { _id: 0, color: "$_id" } }],
                    priceRange: [{ $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } }]
                }
            }
        ];

        const [result] = await Product.aggregate(pipeline);

        res.json({
            brands: result.brands.map(b => b.brand).filter(Boolean),
            sizes: result.sizes.map(s => s.size).filter(Boolean),
            colors: result.colors.map(c => c.color).filter(Boolean),
            priceRange: result.priceRange[0] || { min: 0, max: 10000 },
        });

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
        /* ── DEBUG (remove after confirming it works) ── */
        console.log("📦 CREATE — body keys :", Object.keys(req.body));
        console.log("📦 CREATE — category  :", req.body.category);
        console.log("📦 CREATE — variants  :", req.body.variants?.slice(0, 80));
        console.log("📦 CREATE — files     :", req.files?.map(f => ({ field: f.fieldname, path: f.path })));

        const { name, price, brand, description } = req.body;

        /* ── category: accept ObjectId string OR plain name ── */
        const category = req.body.category?.trim();
        if (!category) {
            return res.status(400).json({ message: "Category is required" });
        }

        /* ── boolean flags ── */
        const newArrival = req.body.newArrival === "true" || req.body.newArrival === true;
        const featured = req.body.featured === "true" || req.body.featured === true;
        const trending = req.body.trending === "true" || req.body.trending === true;

        /* ── parse variants safely ── */
        const rawVariants = safeParseVariants(req.body.variants);
        if (rawVariants === null) {
            return res.status(400).json({ message: "Invalid variants JSON — check frontend FormData" });
        }

        console.log("📦 CREATE — rawVariants count:", rawVariants.length);

        let variants;

        try {
            console.log("📂 FILES RECEIVED:", req.files);

            variants = buildVariants(rawVariants, req.files, []);
        } catch (err) {
            console.error("🔥 BUILD VARIANTS ERROR:", err);
            return res.status(500).json({ message: err.message });
        }

        console.log("📦 CREATE — built variants count:", variants.length);

        if (variants.length === 0) {
            return res.status(400).json({
                message: "At least one variant with a color name and at least one size is required"
            });
        }

        const product = new Product({
            name,
            price: Number(price),
            brand,
            description: description || "",
            category,
            newArrival,
            featured,
            trending,
            variants,
        });

        await product.save();
        console.log("✅ Product saved:", product._id);
        res.status(201).json(product);

    } catch (err) {
        console.error("❌ CREATE PRODUCT ERROR:", err.message);
        console.error(err.stack);
        res.status(500).json({ message: "Failed to create product", error: err.message });
    }
};

/* ===============================
   UPDATE PRODUCT
=============================== */
export const updateProduct = async (req, res) => {
    try {
        console.log("📦 UPDATE — id      :", req.params.id);
        console.log("📦 UPDATE — body keys:", Object.keys(req.body));

        const updateData = { ...req.body };

        /* ── boolean coercion ── */
        if ("newArrival" in updateData) updateData.newArrival = updateData.newArrival === "true" || updateData.newArrival === true;
        if ("featured" in updateData) updateData.featured = updateData.featured === "true" || updateData.featured === true;
        if ("trending" in updateData) updateData.trending = updateData.trending === "true" || updateData.trending === true;

        if ("price" in updateData) updateData.price = Number(updateData.price);

        /* ── category trim ── */
        if (updateData.category) updateData.category = updateData.category.trim();

        /* ── rebuild variants ── */
        if (updateData.variants) {
            const rawVariants = safeParseVariants(updateData.variants);
            if (rawVariants === null) {
                return res.status(400).json({ message: "Invalid variants JSON" });
            }

            /* fetch existing to preserve Cloudinary image URLs */
            const existing = await Product.findById(req.params.id).lean();
            if (!existing) return res.status(404).json({ message: "Product not found" });

            let variants;

            try {
                console.log("📂 UPDATE FILES:", req.files);

                variants = buildVariants(rawVariants, req.files, existing.variants);
            } catch (err) {
                console.error("🔥 UPDATE VARIANTS ERROR:", err);
                return res.status(500).json({ message: err.message });
            }

            if (variants.length === 0) {
                return res.status(400).json({
                    message: "At least one variant with a color name and at least one size is required"
                });
            }

            updateData.variants = variants;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!product) return res.status(404).json({ message: "Product not found" });

        console.log("✅ Product updated:", product._id);
        res.json(product);

    } catch (error) {
        console.error("❌ UPDATE PRODUCT ERROR:", error.message);
        console.error(error.stack);
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
        res.json({ message: "Product deleted" });
    } catch (error) {
        console.error("❌ DELETE PRODUCT ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
};