import dotenv from "dotenv";
dotenv.config(); 
import http from "http";


console.log({
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_URL: process.env.CLOUDINARY_URL
});
import cartRoutes, { wishlistRouter } from "./routes/cartRoutes.js";
import express from "express";
import cors from "cors";
import path from "path";
import compression from "compression";
import rateLimit from "express-rate-limit"; // ✅ already installed

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

connectDB();

const app = express();

/* ── Payment rate limiter ── */
const paymentLimiter = rateLimit({
   windowMs: 60 * 1000,
   max: 10, // max 10 payment attempts per minute per IP
   message: { message: "Too many payment attempts. Please wait." },
   standardHeaders: true,
   legacyHeaders: false,
});

/* ════════════════════════════════
   MIDDLEWARE
════════════════════════════════ */

// ✅ CORS — only allow your frontend domains
app.use(cors({
   origin: [
      "http://localhost:5173",
      "https://motoparkvizag.in",
      "https://www.motoparkvizag.in"
   ],
   credentials: true,
}));

app.use(
   helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
   })
);

app.use(compression());

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use("/api", apiLimiter);

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
app.use("/api/payment", paymentLimiter, paymentRoutes); // ✅ payment rate limiter added

app.use("/api/users/otp", otpLimiter);
app.use("/api/users", authLimiter, userRoutes);
app.use("/api/home-data", homeDataRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/video-showcase", videoShowcaseRoutes);
/* ════════════════════════════════
   ERROR HANDLING (must be last)
════════════════════════════════ */
app.use(notFound);
app.use(globalErrorHandler);

/* ════════════════════════════════
   CRASH PROTECTION
════════════════════════════════ */
process.on("unhandledRejection", (reason, promise) => {
   console.error("💥 Unhandled Promise Rejection");
   console.error("   Reason :", reason);
   console.error("   Message:", reason?.message || reason);
   console.error("   Stack  :", reason?.stack || "(no stack)");
   console.error("   Promise:", promise);
});

process.on("uncaughtException", (err) => {
   console.error("💥 Uncaught Exception:", err.message);
   console.error(err.stack);
   process.exit(1);
});

/* ════════════════════════════════
   START SERVER
════════════════════════════════ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log(`✅ Server running on port ${PORT}`);



const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

const keepAlive = () => {
    const url = new URL(`${BACKEND_URL}/api/health`);
    const req = http.get({ hostname: url.hostname, path: url.pathname, port: url.port || 80 }, (res) => {
        res.resume(); // drain response
        console.log(`🏓 Keep-alive OK — ${new Date().toISOString()}`);
    });
    req.on("error", (e) => console.warn("⚠️  Keep-alive failed:", e.message));
    req.setTimeout(5000, () => { req.destroy(); });
};

setInterval(keepAlive, 14 * 60 * 1000);
});

