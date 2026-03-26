/* ================================================
   File: backend/scripts/migrateImages.js

   ONE-TIME SCRIPT — run once to migrate all local
   product images to Cloudinary.

   Run with:
     node scripts/migrateImages.js

   Make sure your .env has Cloudinary credentials.
   ================================================ */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Product from "../models/productModel.js";

dotenv.config();

/* ── Configure Cloudinary ── */
cloudinary.config({
    cloud_name: dhbp9yba1,
    api_key: 988795624362513,
    api_secret: nxfNp8A85dqz9Jia8c - EgBhd9yw,
});

/* ── Connect DB ── */
await mongoose.connect(process.env.MONGO_URI);
console.log("✅ MongoDB connected");

let migrated = 0;
let skipped = 0;
let failed = 0;

const products = await Product.find({});
console.log(`📦 Found ${products.length} products to check\n`);

for (const product of products) {
    let changed = false;

    for (const variant of product.variants) {
        const newImages = [];

        for (const imgPath of variant.images) {

            /* Already a Cloudinary URL — skip */
            if (imgPath.startsWith("http")) {
                newImages.push(imgPath);
                skipped++;
                continue;
            }

            /* Local path — upload to Cloudinary */
            const localPath = path.join(process.cwd(), imgPath);

            if (!fs.existsSync(localPath)) {
                console.warn(`  ⚠️  File not found: ${localPath} — skipping`);
                newImages.push(imgPath); // keep old path
                failed++;
                continue;
            }

            try {
                const result = await cloudinary.uploader.upload(localPath, {
                    folder: "motopark/products",
                    transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
                });

                console.log(`  ✅ ${path.basename(localPath)} → ${result.secure_url}`);
                newImages.push(result.secure_url);
                migrated++;
                changed = true;

            } catch (err) {
                console.error(`  ❌ Failed to upload ${localPath}:`, err.message);
                newImages.push(imgPath); // keep old path on failure
                failed++;
            }
        }

        variant.images = newImages;
    }

    if (changed) {
        await product.save();
        console.log(`💾 Saved: ${product.name}\n`);
    }
}

console.log("\n════════════════════════════");
console.log(`✅ Migrated : ${migrated} images`);
console.log(`⏭️  Skipped  : ${skipped} (already Cloudinary)`);
console.log(`❌ Failed   : ${failed} (file not found or upload error)`);
console.log("════════════════════════════");

await mongoose.disconnect();
console.log("✅ Done — MongoDB disconnected");
process.exit(0);