/**
 * routes/heroSlideRoutes.js
 *
 * HeroSlide CRUD — homepage Hero Carousel content.
 *
 * GET / is the one route in this file serving two audiences from one URL:
 *   - An authenticated admin (valid admin JWT) gets every document, any status
 *     — same as before, unchanged for the admin realm.
 *   - Everyone else gets ONLY slides currently eligible for display: enabled
 *     === true, publishAt null-or-passed, expireAt null-or-not-yet-passed.
 *     This is a deliberate correction — the original design mirrored the
 *     Campaign Experience System's "return everything, let the frontend
 *     filter" contract, which leaks unpublished/scheduled marketing copy to
 *     any unauthenticated caller. Filtering now happens server-side instead.
 *
 * Admin:   GET    /:id            → single doc, regardless of enabled/schedule
 *          GET    /:id/preview    → same as above (see note on that route)
 *          POST   /               → create
 *          PUT    /:id            → update
 *          DELETE /:id            → delete
 *          PATCH  /:id/toggle     → flip `enabled`
 *
 * Cross-field validation (secondary CTA pairing, publishAt < expireAt, focal
 * point completeness) is done explicitly here rather than via Mongoose schema
 * validators, because findByIdAndUpdate's update-validator context does not
 * reliably see sibling fields — the same reasoning that already governs
 * manual checks elsewhere in this backend (see carouselRoutes.js's explicit
 * desktopImage check).
 */

import express        from "express";
import mongoose       from "mongoose";
import jwt            from "jsonwebtoken";
import HeroSlide      from "../models/heroSlideModel.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { jwtSecret }  from "../config/jwt.js";

const router = express.Router();

/**
 * Soft auth check, used ONLY by GET / below. Every other admin-gated route in
 * this file (and in this backend) uses the hard-fail `authMiddleware`, which
 * is correct there — GET / is the one route that must serve both realms, so
 * it cannot hard-fail on a missing token. A missing, malformed, expired, or
 * non-admin token all resolve to "treat this caller as public" rather than a
 * 401 — the failure direction here is toward the MORE restrictive response
 * (filtered slides), never the more permissive one, so degrading silently
 * instead of rejecting is the safe choice. Deliberately does not consult the
 * revoked-token blacklist in authMiddleware.js: a revoked token falling back
 * to "public" here is still the safe direction, and coupling this route to
 * that in-memory blacklist for a single, low-stakes call site isn't worth it.
 */
function tryGetAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(authHeader.slice(7), jwtSecret());
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

/** Relative path or https URL only — also rules out `javascript:` and bare `http://` by allow-listing. */
const isValidCtaUrl = (url) => typeof url === "string" && (url.startsWith("/") || url.startsWith("https://"));

/** Both `label` and `url` present, or neither — a CTA with only one half is broken, not "partial." */
function validateSecondaryCta(secondaryCta) {
  if (!secondaryCta) return null;
  const hasLabel = Boolean(secondaryCta.label?.trim());
  const hasUrl = Boolean(secondaryCta.url?.trim());
  if (hasLabel !== hasUrl) {
    return "Secondary CTA requires both a label and a URL, or neither.";
  }
  if (hasUrl && !isValidCtaUrl(secondaryCta.url)) {
    return "Secondary CTA URL must be a relative path (/store) or an https:// URL.";
  }
  return null;
}

/** `undefined`/`null` are fine (no restriction) — anything else must parse to a real date. */
function isValidOptionalDate(value) {
  if (value === undefined || value === null || value === "") return true;
  return !Number.isNaN(new Date(value).getTime());
}

/** A past expireAt is allowed (legitimate historical/test data) — only the inverted pair is a real bug. */
function validateSchedule(publishAt, expireAt) {
  if (!isValidOptionalDate(publishAt)) return "publishAt is not a valid date.";
  if (!isValidOptionalDate(expireAt)) return "expireAt is not a valid date.";
  if (publishAt && expireAt && new Date(publishAt) >= new Date(expireAt)) {
    return "Publish date must be before expire date.";
  }
  return null;
}

/**
 * `imageFocalPoint` is a subdocument — `$set: { imageFocalPoint: {...} }` in
 * findByIdAndUpdate REPLACES the whole subdocument, it does not merge fields.
 * A partial `{ x: 10 }` with no `y` would silently reset y to its schema
 * default instead of preserving whatever the admin had previously set.
 * Requiring both fields whenever the key is present avoids that silent data
 * loss — same defensive pattern already used for secondaryCta below.
 */
function validateFocalPoint(imageFocalPoint) {
  if (!imageFocalPoint) return null;
  const { x, y } = imageFocalPoint;
  if (typeof x !== "number" || typeof y !== "number") {
    return "imageFocalPoint requires both x and y as numbers.";
  }
  if (x < 0 || x > 100 || y < 0 || y > 100) {
    return "imageFocalPoint x/y must be between 0 and 100.";
  }
  return null;
}

/** Shared required-field + cross-field checks for both create and update. */
function validatePayload(body, { partial = false } = {}) {
  if (!partial || body.headline !== undefined) {
    if (!body.headline?.trim()) return "Headline is required.";
  }
  if (!partial || body.desktopImage !== undefined) {
    if (!body.desktopImage?.trim()) return "Desktop image is required.";
  }
  if (!partial || body.primaryCta !== undefined) {
    if (!body.primaryCta?.label?.trim()) return "Primary CTA label is required.";
    if (!body.primaryCta?.url?.trim()) return "Primary CTA URL is required.";
    if (!isValidCtaUrl(body.primaryCta.url)) {
      return "Primary CTA URL must be a relative path (/store) or an https:// URL.";
    }
  }

  const ctaError = validateSecondaryCta(body.secondaryCta);
  if (ctaError) return ctaError;

  const scheduleError = validateSchedule(body.publishAt, body.expireAt);
  if (scheduleError) return scheduleError;

  const focalPointError = validateFocalPoint(body.imageFocalPoint);
  if (focalPointError) return focalPointError;

  return null;
}

/** Always server-controlled, on both create and update — never trust the client for these. */
const SERVER_OWNED_FIELDS = ["createdBy", "updatedBy", "createdAt", "updatedAt", "_id"];

/** Immutable ONLY after creation — settable at creation time, locked from then on.
 *  Stripping these on create too (as an earlier version of this file did) is a
 *  real bug: it would silently force every slide's mediaType to its schema
 *  default forever, regardless of what the client sent, with no error raised. */
const IMMUTABLE_AFTER_CREATE_FIELDS = ["analyticsId", "mediaType"];

function stripServerOwned(body) {
  const clean = { ...body };
  for (const field of SERVER_OWNED_FIELDS) delete clean[field];
  return clean;
}

function stripImmutableAfterCreate(body) {
  const clean = { ...body };
  for (const field of IMMUTABLE_AFTER_CREATE_FIELDS) delete clean[field];
  return clean;
}

/** Classify a thrown error into the same shapes the global handler in
 *  server.js already produces — needed locally because every route here
 *  catches its own errors, which means the global handler never actually
 *  sees them (this is true of every route in this backend, not unique to
 *  this file). Without this, a duplicate analyticsId or a schema validation
 *  failure surfacing through findByIdAndUpdate's runValidators would fall
 *  through to a generic, unhelpful 500. */
function respondToWriteError(res, err, fallbackMessage) {
  if (err.name === "ValidationError") {
    const msgs = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: msgs.join(", ") });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(400).json({ message: `${field} already exists` });
  }
  return res.status(500).json({ message: fallbackMessage, error: err.message });
}

/* ── GET ALL — public gets only eligible slides, an authenticated admin gets everything ── */
router.get("/", async (req, res) => {
  try {
    const admin = tryGetAdmin(req);

    if (admin) {
      const slides = await HeroSlide.find().lean();
      return res.json(slides);
    }

    const now = new Date();
    const slides = await HeroSlide.find({
      enabled: true,
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expireAt: null }, { expireAt: { $gt: now } }] },
      ],
    }).lean();
    res.json(slides);
  } catch (err) {
    res.status(500).json({ message: "Failed to load hero slides", error: err.message });
  }
});

/** GET one by id — admin-only, ignores enabled/schedule (shared with /preview). */
async function getOneHandler(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid hero slide ID" });
    }
    const slide = await HeroSlide.findById(req.params.id).lean();
    if (!slide) return res.status(404).json({ message: "Hero slide not found" });
    res.json(slide);
  } catch (err) {
    res.status(500).json({ message: "Failed to load hero slide", error: err.message });
  }
}

/* ── GET ONE (admin) ── */
router.get("/:id", authMiddleware, getOneHandler);

/* ── GET ONE — PREVIEW (admin) ──
 * Identical to GET /:id today. Kept as a separate route, not an alias, because
 * the API contract documents it as a distinct concern (a preview render may
 * one day need something GET /:id doesn't — e.g. resolved-fallback fields) —
 * reserving the URL now avoids a breaking path change later. */
router.get("/:id/preview", authMiddleware, getOneHandler);

/* ── CREATE (admin only) ── */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const validationError = validatePayload(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const email = req.admin?.email;
    // mediaType/analyticsId MAY be set here if the client supplies them — they
    // only become immutable once the document exists. Only the truly
    // server-owned fields (ownership, timestamps, _id) are stripped on create.
    const slide = new HeroSlide({
      ...stripServerOwned(req.body),
      createdBy: email,
      updatedBy: email,
    });
    await slide.save();
    res.status(201).json(slide.toObject());
  } catch (err) {
    respondToWriteError(res, err, "Failed to create hero slide");
  }
});

/* ── UPDATE (admin only) ── */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid hero slide ID" });
    }

    const validationError = validatePayload(req.body, { partial: true });
    if (validationError) return res.status(400).json({ message: validationError });

    const updateFields = {
      ...stripImmutableAfterCreate(stripServerOwned(req.body)),
      updatedBy: req.admin?.email,
    };

    const updated = await HeroSlide.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(404).json({ message: "Hero slide not found" });
    res.json(updated.toObject());
  } catch (err) {
    respondToWriteError(res, err, "Failed to update hero slide");
  }
});

/* ── DELETE (admin only) ── */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid hero slide ID" });
    }
    const deleted = await HeroSlide.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Hero slide not found" });
    res.json({ message: "Hero slide deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete hero slide", error: err.message });
  }
});

/* ── TOGGLE enabled (admin only) — this IS publish/unpublish and draft/live. ── */
router.patch("/:id/toggle", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid hero slide ID" });
    }
    if (typeof req.body.enabled !== "boolean") {
      return res.status(400).json({ message: "`enabled` must be a boolean" });
    }

    const updated = await HeroSlide.findByIdAndUpdate(
      req.params.id,
      { $set: { enabled: req.body.enabled, updatedBy: req.admin?.email } },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(404).json({ message: "Hero slide not found" });
    res.json(updated.toObject());
  } catch (err) {
    respondToWriteError(res, err, "Failed to toggle hero slide");
  }
});

export default router;
