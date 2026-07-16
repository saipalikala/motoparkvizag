/**
 * scripts/seedDev.js — populate the local development sandbox.
 *
 * Run with:  npm run db:seed
 *
 * SAFETY: this script wipes the collections it owns before inserting, so it must
 * never reach production. Two independent locks stand in the way:
 *   1. It connects through config/db.js, inheriting the NODE_ENV/MONGO_URI guard
 *      (a production URI under a non-production NODE_ENV refuses to boot, and a
 *      URI with no explicit database name is rejected outright).
 *   2. assertNotProduction() below refuses to run under NODE_ENV=production or
 *      against the production database name, even if the guard were bypassed via
 *      ALLOW_DB_ENV_MISMATCH.
 *
 * Idempotent: re-running drops and recreates the seeded documents, so the
 * sandbox always ends in the same known state.
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import Bike from "../models/bikeModel.js";

/** Same derivation as routes/bikeRoutes.js, so seeded slugs match the app's. */
const slugify = (s) =>
  String(s || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

/** Refuse to seed anything that looks like production, guard bypass or not. */
const assertNotProduction = () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV=production. This script deletes data.");
  }
  const dbName = mongoose.connection.name;
  const prodName = process.env.PROD_DB_NAME || "motopark";
  if (dbName === prodName) {
    throw new Error(
      `Refusing to seed: connected to the production database "${dbName}". ` +
        `This script deletes data. Point MONGO_URI at the sandbox (e.g. ${prodName}_dev).`
    );
  }
};

// NOTE: this script does NOT seed an admin account. Admin login is env-based
// (controllers/adminController.js compares against ADMIN_EMAIL /
// ADMIN_PASSWORD_HASH); nothing reads the Admin collection. Seeding an Admin
// document printed credentials that could never actually log in.

const CATEGORIES = [
  { name: "Helmets", slug: "helmets", description: "Full-face, open-face and modular helmets." },
  { name: "Riding Gear", slug: "riding-gear", description: "Jackets, gloves and protection." },
  { name: "Accessories", slug: "accessories", description: "Luggage, tank pads and add-ons." },
];

/** make + model pairs; slugs derived below so they always match the URL scheme. */
const BIKES = [
  { make: "Hero", model: "Glamour 125" },
  { make: "Royal Enfield", model: "Himalayan" },
  { make: "Bajaj", model: "Pulsar NS200" },
];

/** Build products; `fitment` names the bikes each product should reference. */
const makeProducts = (bikeIdByModel) => [
  {
    name: "Vega Bolt Full-Face Helmet",
    description: "ISI-certified full-face helmet with anti-scratch visor.",
    specs: "Shell: ABS · Weight: 1350 g · ISI certified",
    price: 2499,
    originalPrice: 3200,
    brand: "Vega",
    category: "Helmets",
    featured: true,
    trending: true,
    variants: [
      {
        color: "#000000",
        colorName: "Matte Black",
        images: [],
        sizes: [
          { size: "M", stock: 8 },
          { size: "L", stock: 5 },
        ],
      },
    ],
    fitment: ["Glamour 125", "Pulsar NS200"],
  },
  {
    name: "Rynox Air GT Riding Jacket",
    description: "Mesh riding jacket with CE Level 2 armour at shoulders and elbows.",
    specs: "CE Level 2 armour · Mesh panels · All-season liner",
    price: 6999,
    brand: "Rynox",
    category: "Riding Gear",
    newArrival: true,
    variants: [
      {
        color: "#1f3a5f",
        colorName: "Navy",
        images: [],
        sizes: [
          { size: "L", stock: 4 },
          { size: "XL", stock: 2 },
        ],
      },
    ],
    fitment: [],
  },
  {
    name: "Universal Tank Pad",
    description: "Anti-slip tank pad, trimmable to fit most commuter tanks.",
    price: 499,
    originalPrice: 799,
    brand: "MotoPark",
    category: "Accessories",
    trending: true,
    variants: [
      { color: "#111111", colorName: "Carbon", images: [], sizes: [{ size: "Free", stock: 25 }] },
    ],
    fitment: ["Glamour 125"],
  },
];

const seed = async () => {
  await connectDB();
  assertNotProduction();

  console.log(`\n🌱 Seeding "${mongoose.connection.name}" on ${mongoose.connection.host}\n`);

  console.log(`ℹ️  admin login  → uses ADMIN_EMAIL / ADMIN_PASSWORD_HASH from .env (not seeded)`);

  // ── Categories ──
  await Category.deleteMany({});
  const categories = await Category.insertMany(CATEGORIES);
  console.log(`✅ categories   → ${categories.map((c) => c.name).join(", ")}`);

  // ── Bikes (fitment) ──
  await Bike.deleteMany({});
  const bikes = await Bike.insertMany(
    BIKES.map(({ make, model }) => ({
      make,
      makeSlug: slugify(make),
      model,
      slug: slugify(model),
    }))
  );
  const bikeIdByModel = new Map(bikes.map((b) => [b.model, b._id]));
  bikes.forEach((b) => console.log(`✅ bike         → ${b.make} ${b.model}  →  /bikes/${b.makeSlug}/${b.slug}`));

  // ── Products (with fitment references) ──
  await Product.deleteMany({});
  const products = await Product.insertMany(
    makeProducts(bikeIdByModel).map(({ fitment, ...p }) => ({
      ...p,
      compatibleBikes: fitment.map((m) => bikeIdByModel.get(m)).filter(Boolean),
    }))
  );
  products.forEach((p) => console.log(`✅ product      → ${p.name} (₹${p.price})`));

  console.log(
    `\n🌱 Done: ${categories.length} categories, ${bikes.length} bikes, ${products.length} products.\n`
  );
};

seed()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(`\n❌ Seed failed: ${err.message}\n`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
