import mongoose from "mongoose";

/**
 * HeroSlide — homepage Hero Carousel content, managed from Admin.
 *
 * Approved domain model (see docs/ARCHITECTURE conversation history). One
 * deviation from the originally discussed shape, found during implementation:
 * `createdBy`/`updatedBy` are stored as the admin's EMAIL (String), not an
 * ObjectId ref to Admin. The admin JWT payload (backend/controllers/
 * adminController.js) only carries `{ role, email }` — there is no admin
 * document id anywhere in the auth flow — so a ref would require an extra
 * lookup for no attribution benefit at this scale.
 *
 * `order` is a sequence position (every enabled+in-window slide renders, in
 * this order) — NOT a priority/winner-take-all field like Campaign's
 * `priority`. Stored in sparse steps by convention (10, 20, 30…) so a slide
 * can be inserted between two others without renumbering the rest; the
 * schema does not enforce this, it's an authoring convention.
 */

const ctaSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 24 },
    url: { type: String, trim: true },
  },
  { _id: false },
);

const focalPointSchema = new mongoose.Schema(
  {
    x: { type: Number, min: 0, max: 100, default: 50 },
    y: { type: Number, min: 0, max: 100, default: 50 },
  },
  { _id: false },
);

/** Lowercase, hyphenated, ASCII-safe. No external slug library in this backend's dependencies. */
function slugify(input) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const heroSlideSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────
    internalTitle: { type: String, required: true, trim: true, maxlength: 120 },

    // ── Content ───────────────────────────────────────────────────────
    headline: { type: String, required: true, trim: true, maxlength: 80 },
    subtitle: { type: String, trim: true, maxlength: 200, default: "" },

    // ── Media ─────────────────────────────────────────────────────────
    desktopImage: { type: String, required: true, trim: true },
    mobileImage: { type: String, trim: true, default: "" },
    mediaType: { type: String, enum: ["image", "video"], default: "image", immutable: true },
    imageAlt: { type: String, trim: true, default: "" },
    imageFocalPoint: { type: focalPointSchema, default: () => ({}) },
    imageAttribution: { type: String, trim: true, default: "" },

    // ── Calls to action ───────────────────────────────────────────────
    primaryCta: { type: ctaSchema, required: true },
    secondaryCta: { type: ctaSchema, default: () => ({}) },

    // ── Scheduling & visibility ───────────────────────────────────────
    order: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: "order must be an integer" },
    },
    enabled: { type: Boolean, default: false },
    publishAt: { type: Date, default: null },
    expireAt: { type: Date, default: null },

    // ── Presentation ──────────────────────────────────────────────────
    overlayOpacity: { type: Number, min: 0, max: 1, default: 0.6 },
    theme: { type: String, enum: ["dark", "light"], default: "dark" },

    // ── Analytics & localization ──────────────────────────────────────
    // required: true is a backstop, not the primary mechanism — the
    // pre-validate hook below always assigns a value before this check runs.
    // Marking it required means a bug in that hook surfaces as a loud
    // ValidationError instead of silently writing an empty string into a
    // uniquely-indexed field.
    analyticsId: { type: String, required: true, unique: true, trim: true },
    locale: { type: String, trim: true, default: "en-IN" },

    // ── Experimentation / flags (reserved, inert until a consumer exists) ──
    experimentKey: { type: String, trim: true, default: null },
    experimentVariant: { type: String, trim: true, default: null },
    featureFlagKey: { type: String, trim: true, default: null },

    // ── Ownership ─────────────────────────────────────────────────────
    createdBy: { type: String, required: true, immutable: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
);

// Hot-path query: "all enabled, in-window slides, in sequence" — mirrors the
// legacy Carousel model's { source, active, order } index for the same reason.
heroSlideSchema.index({ enabled: 1, publishAt: 1, expireAt: 1, order: 1 });

/** Auto-derive analyticsId from internalTitle when the admin doesn't supply one.
 *  Runs pre-validate so the `required` check below still passes. Appending a
 *  slice of the document's own _id (already assigned at instantiation time,
 *  before validation) guarantees uniqueness without a query. */
heroSlideSchema.pre("validate", function assignAnalyticsId() {
  if (!this.analyticsId?.trim()) {
    const base = slugify(this.internalTitle || "hero-slide");
    this.analyticsId = `${base}-${this._id.toString().slice(-6)}`;
  }
});

export default mongoose.model("HeroSlide", heroSlideSchema);
