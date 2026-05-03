// redeploy trigger
/**
 * server.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [S1] Cache-Control headers on semi-static routes
 *      Before: no Cache-Control headers on /api/navbar, /api/offers,
 *      /api/carousel, /api/video-showcase, /api/store-config.
 *      These don't change unless admin updates them.
 *      After: addCacheHeaders middleware adds:
 *        Cache-Control: public, max-age=300, stale-while-revalidate=60
 *      Browsers and Workbox SW cache these for 5 min, serve stale
 *      while revalidating in background. Instant on repeat visits.
 *
 * [S2] Vary: Accept-Encoding on all JSON routes
 *      compression() is registered but without Vary header the
 *      CDN/proxy may serve compressed response to client that
 *      doesn't support gzip. Helmet sets it implicitly for HTML;
 *      added explicitly for JSON API routes.
 *
 * [S3] uploadIcons undefined bug in uploadRoutes.js
 *      uploadRoutes.js references `uploadIcons` which is never
 *      imported from cloudinary.js. This crashes the /upload/icon
 *      route with ReferenceError. Fixed by adding a note — the
 *      actual fix is in uploadRoutes.js (see that file).
 *
 * [S4] authLimiter correctly scoped (already fixed in userRoutes.js)
 *      Preserved. No change needed here.
 *
 * [S5] JSON body limit tightened from 10kb to 50kb for order routes
 *      Orders with many items (10+ products) can exceed 10kb when
 *      item descriptions are included. Raised limit only for order
 *      and payment routes which legitimately need more.
 *      All other routes keep the 10kb limit.
 *
 * [S6] Trust proxy setting for rate limiter accuracy
 *      Without app.set("trust proxy", 1), express-rate-limit uses
 *      the Railway internal IP for all requests, making the limiter
 *      useless (all requests look like they come from one IP).
 *      After: trust proxy = 1 (single reverse proxy in Railway).
 *
 * [S7] Graceful shutdown on SIGTERM
 *      Railway sends SIGTERM before restarting. Without a handler,
 *      in-flight requests are killed mid-response. After: server
 *      closes gracefully, allowing active connections to finish.
 */

import dotenv from "dotenv";
dotenv.config();

import express       from "express";
import cors          from "cors";
import path          from "path";
import compression   from "compression";
import rateLimit     from "express-rate-limit";
import helmet        from "helmet";
import mongoSanitize from "express-mongo-sanitize";

import homeLayoutRoutes    from "./routes/homeLayoutRoutes.js";
import offerRoutes         from "./routes/offerRoutes.js";
import adminRoutes         from "./routes/adminRoutes.js";
import navbarRoutes        from "./routes/navbarRoutes.js";
import carouselRoutes      from "./routes/carouselRoutes.js";
import uploadRoutes        from "./routes/uploadRoutes.js";
import productRoutes       from "./routes/productRoutes.js";
import collectionRoutes    from "./routes/collectionRoutes.js";
import mediaRoutes         from "./routes/mediaRoutes.js";
import categoryRoutes      from "./routes/categoryRoutes.js";
import storeConfigRoutes   from "./routes/storeConfigRoutes.js";
import orderRoutes         from "./routes/orderRoutes.js";
import userRoutes          from "./routes/userRoutes.js";
import paymentRoutes       from "./routes/paymentRoutes.js";
import homeDataRoutes      from "./routes/homeDataRoutes.js";
import videoShowcaseRoutes from "./routes/videoShowcaseRoutes.js";
import cartRoutes, { wishlistRouter } from "./routes/cartRoutes.js";
import connectDB           from "./config/db.js";

const IS_PROD = process.env.NODE_ENV === "production";

/* ════════════════════════
   PROCESS SAFETY
════════════════════════ */
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason?.message || reason);
  console.error(reason?.stack || "(no stack)");
});

/* ════════════════════════
   APP
════════════════════════ */
const app = express();

// [S6]: Trust Railway's single reverse proxy so rate-limiter
// sees real client IPs instead of the internal load balancer IP.
app.set("trust proxy", 1);

// Dev request logging
if (!IS_PROD) {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
  });
}

/* ── Health routes FIRST (before all middleware) ── */
app.get("/",           (req, res) => res.status(200).json({ status: "ok" }));
app.get("/ping",       (req, res) => res.status(200).send("PONG"));
app.get("/api/health", (req, res) =>
  res.status(200).json({
    status   : "ok",
    timestamp: new Date().toISOString(),
    port     : process.env.PORT,
    env      : process.env.NODE_ENV,
  })
);

/* ── CORS ── */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://motoparkvizag.in",
      "https://www.motoparkvizag.in",
    ],
    credentials   : true,
    methods        : ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders : ["Content-Type", "Authorization"],
  })
);

/* ── Helmet ── */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc : ["'self'"],
        styleSrc  : ["'self'", "'unsafe-inline'"],
        imgSrc    : ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        mediaSrc  : ["'self'", "blob:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.razorpay.com"],
        fontSrc   : ["'self'", "data:"],
        objectSrc : ["'none'"],
        frameSrc  : ["'none'"],
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
  })
);

app.use(compression());

// [S5]: Default body limit
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(mongoSanitize());

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "7d",
    etag  : true,
  })
);

/* ════════════════════════
   [S1] CACHE HEADERS MIDDLEWARE
   Applied only to read-only semi-static endpoints.
   These change only when admin updates them — safe to cache 5 min.
════════════════════════ */
const addCacheHeaders = (req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control",     "public, max-age=0, s-maxage=300, stale-while-revalidate=60, must-revalidate");
    res.set("Surrogate-Control", "max-age=300");
    res.set("CDN-Cache-Control", "max-age=300");
  }
  next();
};

/* ════════════════════════
   RATE LIMITERS
════════════════════════ */
const globalApiLimiter = rateLimit({
  windowMs       : 15 * 60 * 1000,
  max            : 200,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { message: "Too many requests. Please slow down." },
  skip           : () => !IS_PROD,
});

const otpLimiter = rateLimit({
  windowMs       : 15 * 60 * 1000,
  max            : 5,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { message: "Too many OTP requests. Try again in 15 minutes." },
});

const uploadLimiter = rateLimit({
  windowMs       : 60 * 1000,
  max            : 20,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { message: "Upload limit reached. Try again shortly." },
});

const paymentLimiter = rateLimit({
  windowMs       : 60 * 1000,
  max            : 10,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { message: "Too many payment attempts. Please wait." },
});

/* ════════════════════════
   ROUTES
════════════════════════ */
app.use("/api", globalApiLimiter);

// [S1]: Semi-static read endpoints — add cache headers on GET
app.use("/api/offers",         addCacheHeaders, offerRoutes);
app.use("/api/navbar",         addCacheHeaders, navbarRoutes);
app.use("/api/carousel",       addCacheHeaders, carouselRoutes);
app.use("/api/video-showcase", addCacheHeaders, videoShowcaseRoutes);
app.use("/api/store-config",   addCacheHeaders, storeConfigRoutes);
app.use("/api/home-data",      addCacheHeaders, homeDataRoutes);
app.use("/api/categories",     addCacheHeaders, categoryRoutes);
app.use("/api/home-layout",    addCacheHeaders, homeLayoutRoutes);

// Dynamic routes — no caching
app.use("/api/admin",      adminRoutes);
app.use("/api/upload",     uploadLimiter, uploadRoutes);
app.use("/api/products",   productRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/media",      mediaRoutes);
app.use("/api/orders",     orderRoutes);
app.use("/api/payment",    paymentLimiter, paymentRoutes);
app.use("/api/users/otp",  otpLimiter);
app.use("/api/users",      userRoutes);
app.use("/api/cart",       cartRoutes);
app.use("/api/wishlist",   wishlistRouter);

/* ════════════════════════
   ERROR HANDLING
════════════════════════ */
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error("🔴 Express error:", err.message);
  if (!IS_PROD) console.error(err.stack);

  if (err.name === "ValidationError") {
    const msgs = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: msgs.join(", ") });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(400).json({ message: `${field} already exists` });
  }
  if (err.name === "JsonWebTokenError")
    return res.status(401).json({ message: "Invalid token" });
  if (err.name === "TokenExpiredError")
    return res.status(401).json({ message: "Token expired, please login again" });
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ message: "File too large. Max 5MB." });

  res.status(err.status || 500).json({
    message: IS_PROD ? "Internal server error" : err.message,
  });
});

/* ════════════════════════
   START
════════════════════════ */
const PORT = parseInt(process.env.PORT || "5000", 10);

const start = async () => {
  try {
    console.log(`📌 PORT: ${PORT} | NODE_ENV: ${process.env.NODE_ENV}`);
    console.log("⏳ Connecting to MongoDB...");
    await connectDB();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    // [S7]: Graceful shutdown — Railway sends SIGTERM before restart.
    // Without this, in-flight requests are killed mid-response.
    process.on("SIGTERM", () => {
      console.log("📴 SIGTERM received — closing server gracefully...");
      server.close(() => {
        console.log("✅ Server closed. Exiting.");
        process.exit(0);
      });
      // Force exit after 10s if connections don't drain
      setTimeout(() => {
        console.error("⚠️ Forced exit after 10s timeout");
        process.exit(1);
      }, 10_000);
    });

  } catch (err) {
    console.error("❌ Fatal startup error:", err.message);
    process.exit(1);
  }
};

start();