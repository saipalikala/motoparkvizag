// redeploy trigger
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
import heroSlideRoutes     from "./routes/heroSlideRoutes.js";
import uploadRoutes        from "./routes/uploadRoutes.js";
import productRoutes       from "./routes/productRoutes.js";
import collectionRoutes    from "./routes/collectionRoutes.js";
import mediaRoutes         from "./routes/mediaRoutes.js";
import categoryRoutes      from "./routes/categoryRoutes.js";
import bikeRoutes          from "./routes/bikeRoutes.js";
import storeConfigRoutes   from "./routes/storeConfigRoutes.js";
import orderRoutes         from "./routes/orderRoutes.js";
import userRoutes          from "./routes/userRoutes.js";
import paymentRoutes       from "./routes/paymentRoutes.js";
import homeDataRoutes      from "./routes/homeDataRoutes.js";
import videoShowcaseRoutes from "./routes/videoShowcaseRoutes.js";
import cartRoutes, { wishlistRouter } from "./routes/cartRoutes.js";
import aiRoutes            from "./routes/aiRoutes.js";
import webhookRoutes       from "./routes/webhookRoutes.js";
import checkoutRoutes      from "./routes/checkoutRoutes.js";
import connectDB           from "./config/db.js";
import { hasJwtSecret }    from "./config/jwt.js";

const IS_PROD = process.env.NODE_ENV === "production";

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason?.message || reason);
  console.error(reason?.stack || "(no stack)");
});

const app = express();

app.set("trust proxy", 1);

// ── www → non-www redirect ──
app.use((req, res, next) => {
  if (req.headers.host?.startsWith("www.")) {
    return res.redirect(301, `https://motoparkvizag.in${req.url}`);
  }
  next();
});

// ── Sitemap ──
app.get("/sitemap.xml", (req, res) => {
  res.header("Content-Type", "application/xml");
  res.header("Cache-Control", "public, max-age=86400");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://motoparkvizag.in/</loc><priority>1.0</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://motoparkvizag.in/store</loc><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>https://motoparkvizag.in/about</loc><priority>0.5</priority></url>
  <url><loc>https://motoparkvizag.in/contact</loc><priority>0.5</priority></url>
</urlset>`);
});

if (!IS_PROD) {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
  });
}

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


const STATIC_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174", // motopark-v2 dev (Vite fallback when 5173 is taken)
  "https://motoparkvizag.in",
  "https://www.motoparkvizag.in",
  "https://motopark-v2-ebon.vercel.app", // V2 standalone Vercel deploy (pre-domain-cutover)
];
// Vite's autoPort picks a random port when 5173/5174 are busy; allow any
// localhost/127.0.0.1 port in dev so the V2 build never gets CORS-blocked.
// Production stays locked to STATIC_ORIGINS.
const DEV_LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // same-origin / curl / server-to-server
      if (STATIC_ORIGINS.includes(origin)) return cb(null, true);
      if (process.env.NODE_ENV !== "production" && DEV_LOCALHOST.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials   : true,
    methods        : ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders : ["Content-Type", "Authorization", "x-admin"],
  })
);

// ── Version endpoint — never cached, used by frontend to detect new deployments
// Set APP_VERSION in Railway env vars and increment on every deploy
app.get("/api/version", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json({ version: process.env.APP_VERSION || "1.0.0" });
});

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

// ── Webhooks — MUST precede express.json ──
// Razorpay's signature is HMAC over the RAW body; the global JSON parser below
// would consume and re-serialize it, breaking verification. This mount gets its
// own express.raw() so the controller sees the exact bytes. It also sits above
// the /api rate limiters (globalApiLimiter, paymentLimiter) so webhook retries
// are never throttled into a non-2xx retry storm. See routes/webhookRoutes.js.
app.use("/api/webhooks", express.raw({ type: "application/json", limit: "1mb" }), webhookRoutes);

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

const addCacheHeaders = (req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control",     "public, max-age=0, s-maxage=300, stale-while-revalidate=60, must-revalidate");
    res.set("Surrogate-Control", "max-age=300");
    res.set("CDN-Cache-Control", "max-age=300");
  }
  next();
};

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

/* Checkout status is POLLED — one checkout makes tens of calls while the customer
   completes a UPI payment on their phone. It therefore gets its own budget rather
   than sharing globalApiLimiter's 200/15min, which one slow payment could eat.
   Sized for several concurrent checkouts behind a single IP, since Indian mobile
   carriers CGNAT heavily and a shared limit would punish unrelated customers. The
   endpoint is a read returning only { status, orderId }. */
const checkoutStatusLimiter = rateLimit({
  windowMs       : 15 * 60 * 1000,
  max            : 300,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { message: "Too many status checks. Please wait." },
});

/* Mounted ABOVE globalApiLimiter so polling cannot exhaust the customer's general
   API budget mid-checkout and lock them out of the site they just bought from. */
app.use("/api/checkout", checkoutStatusLimiter, checkoutRoutes);

app.use("/api", globalApiLimiter);

app.use("/api/offers",         addCacheHeaders, offerRoutes);
app.use("/api/navbar",         addCacheHeaders, navbarRoutes);
app.use("/api/carousel",       addCacheHeaders, carouselRoutes);
app.use("/api/hero-slides",    addCacheHeaders, heroSlideRoutes);
app.use("/api/video-showcase", addCacheHeaders, videoShowcaseRoutes);
app.use("/api/store-config",   addCacheHeaders, storeConfigRoutes);
app.use("/api/home-data",      addCacheHeaders, homeDataRoutes);
app.use("/api/categories",     addCacheHeaders, categoryRoutes);
app.use("/api/bikes",          addCacheHeaders, bikeRoutes);
app.use("/api/home-layout",    addCacheHeaders, homeLayoutRoutes);

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
app.use("/api/ai",         aiRoutes);

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

const PORT = parseInt(process.env.PORT || "5000", 10);

const start = async () => {
  try {
    console.log(`📌 PORT: ${PORT} | NODE_ENV: ${process.env.NODE_ENV}`);

    // Surfaced at boot rather than at the first login attempt. Auth now fails
    // closed without JWT_SECRET (config/jwt.js), so the symptom would otherwise
    // be customers unable to sign in, with nothing in the logs explaining why.
    if (!hasJwtSecret()) {
      console.error(
        "🔴 JWT_SECRET is NOT set. Customer and admin authentication will fail " +
          "on every request. Set it (see backend/.env.example) and redeploy.",
      );
    }

    console.log("⏳ Connecting to MongoDB...");
    await connectDB();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    process.on("SIGTERM", () => {
      console.log("📴 SIGTERM received — closing server gracefully...");
      server.close(() => {
        console.log("✅ Server closed. Exiting.");
        process.exit(0);
      });
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