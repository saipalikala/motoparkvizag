import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import compression from "compression";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

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
import connectDB from "./config/db.js";

/* ════════════════════════
   PROCESS SAFETY
════════════════════════ */
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  console.error(err.stack);
  // NO process.exit() — Railway shows Online but serves 502 if process dies
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason?.message || reason);
  console.error(reason?.stack || "(no stack)");
});

/* ════════════════════════
   APP
════════════════════════ */
const app = express();

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

/* ── Health routes FIRST — before any middleware that could throw ── */
app.get("/", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/ping", (req, res) => res.status(200).send("PONG"));
app.get("/api/health", (req, res) =>
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: process.env.PORT,
    env: process.env.NODE_ENV,
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
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ── Helmet ── */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "7d",
    etag: true,
  })
);

/* ════════════════════════
   RATE LIMITERS
════════════════════════ */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again later." },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests. Try again in 15 minutes." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Upload limit reached. Try again shortly." },
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many payment attempts. Please wait." },
});

/* ════════════════════════
   ROUTES
════════════════════════ */
app.use("/api/offers", offerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/navbar", navbarRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/products", productRoutes);
app.use("/api/home-layout", homeLayoutRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/store-config", storeConfigRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentLimiter, paymentRoutes);
app.use("/api/users/otp", otpLimiter);
app.use("/api/users", authLimiter, userRoutes);
app.use("/api/home-data", homeDataRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/video-showcase", videoShowcaseRoutes);

/* ════════════════════════
   ERROR HANDLING
════════════════════════ */
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error("🔴 Express error:", err.message);
  console.error(err.stack);

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
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Fatal startup error:", err.message);
    process.exit(1);
  }
};

start();