import mongoose from "mongoose";

/**
 * Bike — a motorcycle the store carries fitment for. One document = one
 * make+model pair (e.g. make "Royal Enfield", model "Himalayan").
 *
 * Slugs power the storefront "Shop by Bike" URLs:
 *   /bikes/:makeSlug            → BikeMakePage   (all models of a make)
 *   /bikes/:makeSlug/:slug      → BikeModelPage  (one model)
 *
 * `makeSlug` and `slug` (the model slug) are DERIVED from make/model in the
 * routes — never sent by the client — so they always match the URL scheme.
 * The (makeSlug, slug) pair is unique: the same model under a make can't repeat.
 */
const bikeSchema = new mongoose.Schema(
  {
    make:     { type: String, required: true, trim: true }, // "Royal Enfield"
    makeSlug: { type: String, required: true, trim: true }, // "royal-enfield"
    model:    { type: String, required: true, trim: true }, // "Himalayan"
    slug:     { type: String, required: true, trim: true }, // "himalayan" (model slug)
  },
  { timestamps: true }
);

// One model per make — no duplicate (make, model) pairs.
bikeSchema.index({ makeSlug: 1, slug: 1 }, { unique: true });
// "Shop by Bike" grouping / make pages read all models of a make, newest last.
bikeSchema.index({ makeSlug: 1, model: 1 });

export default mongoose.model("Bike", bikeSchema);
