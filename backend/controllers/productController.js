const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
import Product from "../models/productModel.js";
import mongoose from "mongoose";
const filterCache = new Map();
const FILTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
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

            const newFiles = (files || []).filter(
                f => f.fieldname === `variantImages_${index}`
            );

            const newImages = newFiles.map(f => {
                const url = f.path || f.secure_url || f.url || f.filename;
                if (!url) {
                    throw new Error("Image upload failed - no URL returned");
                }
                return url;
            });

            const existingImages = existingVariants?.[index]?.images || [];
            const images = newImages.length > 0 ? newImages : existingImages;

            // ✅ Auto-add Standard size if none provided
            let sizes = (variant.sizes || [])
                .filter(s => s.size && s.size.trim() !== "")
                .map(s => ({
                    size: s.size,
                    stock: Number(s.stock) || 0
                }));

            if (sizes.length === 0) {
                sizes = [{ size: "Standard", stock: 0 }];
            }

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

        if (search) {
    const safe = escapeRegex(search.trim().slice(0, 100)); // cap length too
    query.name = { $regex: safe, $options: "i" };
}
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
                .select("name price brand category variants description specs care createdAt featured trending newArrival")
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
    const cacheKey = req.query.category || "__all__";
    const cached = filterCache.get(cacheKey);

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

    // Invalidate cache when products change
    // Call filterCache.clear() at the end of createProduct, updateProduct, deleteProduct
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

        const category = req.body.category?.trim();
        if (!category) {
            return res.status(400).json({ message: "Category is required" });
        }

        const newArrival = req.body.newArrival === "true" || req.body.newArrival === true;
        const featured = req.body.featured === "true" || req.body.featured === true;
        const trending = req.body.trending === "true" || req.body.trending === true;

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
            return res.status(400).json({
                message: "At least one variant is required"
            });
        }

        const product = new Product({
            name,
            price: Number(price),
            brand,
            description: description || "",

            // ✅ ADD THESE
            specs: specs || "",
            care: care || "",

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
        console.error(err.stack);
        res.status(500).json({ message: "Failed to create product", error: err.message });
    }
};



export const updateProduct = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Normalize booleans
        ["newArrival", "featured", "trending"].forEach(flag => {
            if (flag in updateData)
                updateData[flag] = updateData[flag] === "true" || updateData[flag] === true;
        });

        if ("price" in updateData) updateData.price = Number(updateData.price);
        if ("specs" in updateData) updateData.specs = updateData.specs || "";
        if ("care"  in updateData) updateData.care  = updateData.care  || "";
        if (updateData.category)   updateData.category = updateData.category.trim();

        // 🔥 Only ONE DB call here
        const existing = await Product.findById(req.params.id).lean();
        if (!existing) return res.status(404).json({ message: "Product not found" });

        // Handle variants if present
        if (updateData.variants) {
            const rawVariants = safeParseVariants(updateData.variants);
            if (rawVariants === null)
                return res.status(400).json({ message: "Invalid variants JSON" });

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

        // 🔥 SAME CALL → update + return
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
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No CSV file uploaded" });
        }

        // ✅ Dynamic import — install with: npm install csvtojson
        const csv = (await import("csvtojson")).default;

        const csvString = req.file.buffer.toString("utf-8");
        const rows = await csv().fromString(csvString);

        if (!rows.length) {
            return res.status(400).json({ message: "CSV file is empty" });
        }

        // ✅ Validate required fields
        const invalid = rows.filter(r => !r.name?.trim() || !r.brand?.trim() || !r.price || !r.category?.trim());
        if (invalid.length > 0) {
            return res.status(400).json({
                message: `${invalid.length} row(s) are missing required fields: name, brand, price, category`
            });
        }

        // ✅ Map CSV rows to product schema
        // CSV format: name,brand,price,category,description,color,sizes,featured,trending,newArrival
        // sizes format: "S:10,M:20,L:15" (size:stock pairs separated by commas)
        const products = rows.map(row => {
            let sizes = [{ size: "Standard", stock: 0 }]; // default

            if (row.sizes?.trim()) {
                const parsed = row.sizes.split(",").map(s => {
                    const [size, stock] = s.trim().split(":");
                    return { size: size?.trim(), stock: Number(stock || 0) };
                }).filter(s => s.size);

                if (parsed.length > 0) sizes = parsed;
            }

            return {
                name: row.name.trim(),
                brand: row.brand.trim(),
                price: Number(row.price),
                category: row.category.trim(),
                description: row.description?.trim() || "",
                featured: row.featured === "true",
                trending: row.trending === "true",
                newArrival: row.newArrival === "true",
                variants: [{
                    color: row.color?.trim() || "Default",
                    images: [], // ✅ images added later via Edit panel
                    sizes,
                }]
            };
        });

        const created = await Product.insertMany(products);

        res.status(201).json({
            message: `${created.length} products created successfully. Add images via the Edit panel.`,
            count: created.length,
            products: created.map(p => ({ _id: p._id, name: p.name }))
        });

    } catch (err) {
        console.error("❌ BULK CREATE ERROR:", err.message);

        // ✅ Handle csvtojson not installed
        if (err.code === "ERR_MODULE_NOT_FOUND") {
            return res.status(500).json({
                message: "csvtojson package not installed. Run: npm install csvtojson"
            });
        }

        res.status(500).json({ message: "Bulk upload failed", error: err.message });
    }
};

// productController.js
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