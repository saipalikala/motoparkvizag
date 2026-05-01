import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import compression from "compression";
import rateLimit from "express-rate-limit";

/* ════════════════════════════════
   PROCESS-LEVEL SAFETY
════════════════════════════════ */
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason?.message || reason);
  console.error(reason?.stack || "(no stack)");
  // DO NOT exit — Railway will restart if truly fatal
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  console.error(err.stack);
  // DO NOT exit — keep server alive for Railway
});

/* ════════════════════════════════
   APP SETUP
════════════════════════════════ */
const app = express();

/* ── Request logger (helps debug Railway logs) ── */
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} [${new Date().toISOString()}]`);
  next();
});

/* ════════════════════════════════
   HEALTH / PING — BEFORE everything else
   These must respond even if DB is down.
   Railway's health check hits "/" or "/ping"
   during deploy. If these are below middleware
   that throws, you get 502.
════════════════════════════════ */
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", service: "motopark-api" });
});

app.get("/ping", (req, res) => {
  res.status(200).send("PONG");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    port: process.env.PORT || 5000,
  });
});

/* ════════════════════════════════
   CORS — before helmet, before body parsers
   Railway reverse-proxy forwards the real
   Origin header so this is safe.
════════════════════════════════ */
const allowedOrigins = [
  "http://localhost:5173",
  "https://motoparkvizag.in",
  "https://www.motoparkvizag.in",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow no-origin requests (mobile apps, curl, Railway health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ════════════════════════════════
   HELMET — safe defaults for Railway
   Disable CSP so it doesn't block
   your own API responses.
   crossOriginResourcePolicy: cross-origin
   is needed for Cloudinary image URLs.
════════════════════════════════ */
let helmetMiddleware;
try {
  const { default: helmetPkg } = await import("helmet");
  helmetMiddleware = helmetPkg({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false, // ← required when CSP is false
  });
  console.log("✅ Helmet loaded");
} catch (e) {
  console.warn("⚠️  Helmet failed to load, skipping:", e.message);
  helmetMiddleware = (req, res, next) => next(); // no-op fallback
}
app.use(helmetMiddleware);

/* ── Compression ── */
app.use(compression());

/* ── Body parsers ── */
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

/* ── Static uploads ── */
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "7d",
    etag: true,
    lastModified: true,
  })
);

/* ════════════════════════════════
   RATE LIMITERS
════════════════════════════════ */
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many payment attempts. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ════════════════════════════════
   ROUTE IMPORTS — wrapped in try/catch
   A single bad import can crash the whole
   module load and cause 502 with no logs.
════════════════════════════════ */
let routes = {};
try {
  const [
    homeLayoutRoutes,
    offerRoutes,
    adminRoutes,
    navbarRoutes,
    carouselRoutes,
    uploadRoutes,
    productRoutes,
    collectionRoutes,
    mediaRoutes,
    categoryRoutes,
    storeConfigRoutes,
    orderRoutes,
    userRoutes,
    paymentRoutes,
    homeDataRoutes,
    videoShowcaseRoutes,
    cartModule,
  ] = await Promise.all([
    import("./routes/homeLayoutRoutes.js"),
    import("./routes/offerRoutes.js"),
    import("./routes/adminRoutes.js"),
    import("./routes/navbarRoutes.js"),
    import("./routes/carouselRoutes.js"),
    import("./routes/uploadRoutes.js"),
    import("./routes/productRoutes.js"),
    import("./routes/collectionRoutes.js"),
    import("./routes/mediaRoutes.js"),
    import("./routes/categoryRoutes.js"),
    import("./routes/storeConfigRoutes.js"),
    import("./routes/orderRoutes.js"),
    import("./routes/userRoutes.js"),
    import("./routes/paymentRoutes.js"),
    import("./routes/homeDataRoutes.js"),
    import("./routes/videoShowcaseRoutes.js"),
    import("./routes/cartRoutes.js"),
  ]);

  routes = {
    homeLayoutRoutes: homeLayoutRoutes.default,
    offerRoutes: offerRoutes.default,
    adminRoutes: adminRoutes.default,
    navbarRoutes: navbarRoutes.default,
    carouselRoutes: carouselRoutes.default,
    uploadRoutes: uploadRoutes.default,
    productRoutes: productRoutes.default,
    collectionRoutes: collectionRoutes.default,
    mediaRoutes: mediaRoutes.default,
    categoryRoutes: categoryRoutes.default,
    storeConfigRoutes: storeConfigRoutes.default,
    orderRoutes: orderRoutes.default,
    userRoutes: userRoutes.default,
    paymentRoutes: paymentRoutes.default,
    homeDataRoutes: homeDataRoutes.default,
    videoShowcaseRoutes: videoShowcaseRoutes.default,
    cartRoutes: cartModule.default,
    wishlistRouter: cartModule.wishlistRouter,
  };

  console.log("✅ All routes imported successfully");
} catch (importErr) {
  // Log exactly which import failed — this is the #1 hidden cause of 502
  console.error("❌ ROUTE IMPORT FAILED:", importErr.message);
  console.error(importErr.stack);
  // Server stays alive — health check still works
  // Only the broken routes won't be registered
}

/* ════════════════════════════════
   SECURITY MIDDLEWARE IMPORTS
════════════════════════════════ */
let securityMiddleware = {};
try {
  securityMiddleware = await import("./middleware/security.js");
  console.log("✅ Security middleware loaded");
} catch (e) {
  console.error("❌ Security middleware failed to load:", e.message);
}

const {
  apiLimiter,
  otpLimiter,
  authLimiter,
  uploadLimiter,
  globalErrorHandler,
  notFound,
} = securityMiddleware;

/* ════════════════════════════════
   MOUNT ROUTES (only if imported OK)
════════════════════════════════ */
if (routes.offerRoutes) app.use("/api/offers", routes.offerRoutes);
if (routes.adminRoutes) app.use("/api/admin", routes.adminRoutes);
if (routes.navbarRoutes) app.use("/api/navbar", routes.navbarRoutes);
if (routes.carouselRoutes) app.use("/api/carousel", routes.carouselRoutes);
if (routes.uploadRoutes)
  app.use(
    "/api/upload",
    uploadLimiter || ((q, r, n) => n()),
    routes.uploadRoutes
  );
if (routes.productRoutes) app.use("/api/products", routes.productRoutes);
if (routes.homeLayoutRoutes)
  app.use("/api/home-layout", routes.homeLayoutRoutes);
if (routes.collectionRoutes)
  app.use("/api/collections", routes.collectionRoutes);
if (routes.mediaRoutes) app.use("/api/media", routes.mediaRoutes);
if (routes.categoryRoutes) app.use("/api/categories", routes.categoryRoutes);
if (routes.storeConfigRoutes)
  app.use("/api/store-config", routes.storeConfigRoutes);
if (routes.orderRoutes) app.use("/api/orders", routes.orderRoutes);
if (routes.paymentRoutes)
  app.use("/api/payment", paymentLimiter, routes.paymentRoutes);
if (routes.userRoutes) {
  app.use("/api/users/otp", otpLimiter || ((q, r, n) => n()));
  app.use("/api/users", authLimiter || ((q, r, n) => n()), routes.userRoutes);
}
if (routes.homeDataRoutes) app.use("/api/home-data", routes.homeDataRoutes);
if (routes.cartRoutes) app.use("/api/cart", routes.cartRoutes);
if (routes.wishlistRouter) app.use("/api/wishlist", routes.wishlistRouter);
if (routes.videoShowcaseRoutes)
  app.use("/api/video-showcase", routes.videoShowcaseRoutes);

/* ════════════════════════════════
   ERROR HANDLING — must be last
════════════════════════════════ */
// 404 for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler (catches errors passed via next(err))
app.use((err, req, res, next) => {
  console.error("🔴 EXPRESS ERROR:", err.message);
  console.error(err.stack);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
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
  // CORS errors
  if (err.message && err.message.startsWith("CORS:"))
    return res.status(403).json({ message: err.message });

  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

/* ════════════════════════════════
   DB CONNECT — fixed version
════════════════════════════════ */
import connectDB from "./config/db.js";

/* ════════════════════════════════
   START SERVER
════════════════════════════════ */
const PORT = parseInt(process.env.PORT || "5000", 10);

const start = async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    console.log(`📌 PORT from env: ${process.env.PORT}`);
    console.log(`📌 NODE_ENV: ${process.env.NODE_ENV}`);

    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health: http://0.0.0.0:${PORT}/api/health`);
    });
  } catch (err) {
    console.error("❌ Fatal startup error:", err.message);
    console.error(err.stack);
    process.exit(1); // Only exit on startup failure — Railway will restart
  }
};

start();