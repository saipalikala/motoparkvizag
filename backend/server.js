import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";

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

/* ── SECURITY MIDDLEWARE ── */
import {
   apiLimiter,
   otpLimiter,
   authLimiter,
   uploadLimiter,
   globalErrorHandler,
   notFound,
} from "./middleware/security.js";

connectDB();

const app = express();

/* ════════════════════════════════
   MIDDLEWARE
════════════════════════════════ */
app.use(cors());

/* JSON body parser — only runs for application/json requests.
   multipart/form-data (file uploads) is handled exclusively by multer. */
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use("/api", apiLimiter);

/* ── STATIC ── */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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

app.use("/api/users/otp", otpLimiter);
app.use("/api/users", authLimiter, userRoutes);

/* ════════════════════════════════
   ERROR HANDLING (must be last)
════════════════════════════════ */
app.use(notFound);
app.use(globalErrorHandler);

/* ════════════════════════════════
   CRASH PROTECTION — fixed to
   always log the full stack
════════════════════════════════ */
process.on("unhandledRejection", (reason, promise) => {
   console.error("💥 Unhandled Promise Rejection");
   console.error("   Reason :", reason);
   console.error("   Message:", reason?.message || reason);
   console.error("   Stack  :", reason?.stack || "(no stack)");
   console.error("   Promise:", promise);
   /* Do NOT crash the process here in dev — just log it so you can see the error */
});

process.on("uncaughtException", (err) => {
   console.error("💥 Uncaught Exception:", err.message);
   console.error(err.stack);
   process.exit(1);
});

/* ── START ── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));