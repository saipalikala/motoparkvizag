import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import compression from "compression";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";

/* ── ROUTES ── */
import homeLayoutRoutes from "./routes/homeLayoutRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import navbarRoutes from "./routes/navbarRoutes.js";
import carouselRoutes from "./routes/carouselRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import collectionRoutes from "./routes/collectionRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import storeConfigRoutes from "./routes/storeConfigRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import homeDataRoutes from "./routes/homeDataRoutes.js";
import videoShowcaseRoutes from "./routes/videoShowcaseRoutes.js";
import cartRoutes, { wishlistRouter } from "./routes/cartRoutes.js";

/* ── SECURITY MIDDLEWARE ── */
import {
  apiLimiter,
  otpLimiter,
  authLimiter,
  uploadLimiter,
  globalErrorHandler,
  notFound,
  helmet,
} from "./middleware/security.js";

/* ════════════════════════════════
   PROCESS-LEVEL SAFETY
   — log errors but DO NOT exit on
     unhandled rejections (Railway
     will restart if truly fatal)
════════════════════════════════ */
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason?.message || reason);
  console.error(reason?.stack || "(no stack)");
  // ✅ DO NOT process.exit() here — let the server keep running
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  console.error(err.stack);
  // ✅ Only exit for truly unrecoverable errors.
  //    On Railway the platform will auto-restart the container.
  //    Exiting here causes the 502 you were seeing.
  //    Keep this line ONLY if you want Railway to force-restart:
  // process.exit(1);
});

/* ════════════════════════════════
   APP SETUP
════════════════════════════════ */
const app = express();
app.get("/", (req, res) => {
  res.send("ROOT OK");
});

app.get("/ping", (req, res) => {
  res.send("PING OK");
});

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});
/* ── Payment rate limiter ── */
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many payment attempts. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── CORS ── */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://motoparkvizag.in",
      "https://www.motoparkvizag.in",
    ],
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
// app.use("/api", apiLimiter);

/* ── STATIC ── */
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "7d",
    etag: true,
    lastModified: true,
  })
);

/* ════════════════════════════════
   HEALTH CHECK
════════════════════════════════ */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ════════════════════════════════
   API ROUTES
════════════════════════════════ */
// app.use("/api/offers", offerRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/navbar", navbarRoutes);
// app.use("/api/carousel", carouselRoutes);
// app.use("/api/upload", uploadLimiter, uploadRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/home-layout", homeLayoutRoutes);
// app.use("/api/collections", collectionRoutes);
// app.use("/api/media", mediaRoutes);
// app.use("/api/categories", categoryRoutes);
// app.use("/api/store-config", storeConfigRoutes);
// app.use("/api/orders", orderRoutes);
// app.use("/api/payment", paymentLimiter, paymentRoutes);
// app.use("/api/users/otp", otpLimiter);
// app.use("/api/users", authLimiter, userRoutes);
// app.use("/api/home-data", homeDataRoutes);
// app.use("/api/cart", cartRoutes);
// app.use("/api/wishlist", wishlistRouter);
// app.use("/api/video-showcase", videoShowcaseRoutes);

/* ════════════════════════════════
   ERROR HANDLING (must be last)
════════════════════════════════ */
// app.use(notFound);
// app.use(globalErrorHandler);
app.use((req, res) => {
  res.status(404).send("Not Found");
});
/* ════════════════════════════════
   START — DB first, then listen
   This guarantees Railway's health
   check hits a live server only
   after MongoDB is ready.
════════════════════════════════ */
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await connectDB(); // ✅ await DB before binding port
    console.log("✅ MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      // ✅ "0.0.0.0" ensures Railway's internal router can reach the process
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    // DB failed to connect — log clearly so you can see it in Railway logs
    console.error("❌ Failed to connect to MongoDB:", err.message);
    console.error(err.stack);
    // Exit here IS correct — without DB the app is useless and Railway
    // will restart the container automatically.
    process.exit(1);
  }
};

start();