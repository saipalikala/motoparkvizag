/* ================================================
   File: backend/middleware/security.js

   SETUP:
   1. npm install express-rate-limit
   2. Import and apply in server.js (see bottom of this file)
   ================================================ */

import rateLimit from "express-rate-limit";

/* ════════════════════════════════════════════════
   1. RATE LIMITERS
════════════════════════════════════════════════ */

/* General API — 100 requests per minute per IP */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 100,
    message: { message: "Too many requests, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
});

/* OTP — max 5 OTP requests per 15 minutes per IP
   Prevents SMS credit exhaustion attacks */
export const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,
    message: { message: "Too many OTP requests. Try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

/* Auth (login/register) — max 10 per 15 minutes per IP */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Too many login attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

/* Upload — max 20 uploads per minute per IP */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: "Upload limit reached. Try again shortly." },
    standardHeaders: true,
    legacyHeaders: false,
});

/* ════════════════════════════════════════════════
   2. GLOBAL ERROR HANDLER
   Add as the LAST app.use() in server.js
════════════════════════════════════════════════ */
export const globalErrorHandler = (err, req, res, next) => {
    console.error("🔴 UNHANDLED ERROR:", err.message);
    console.error(err.stack);

    /* Mongoose validation error */
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ message: messages.join(", ") });
    }

    /* Mongoose duplicate key */
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({ message: `${field} already exists` });
    }

    /* JWT errors */
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
    }
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired, please login again" });
    }

    /* Multer file size error */
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Max 5MB per image." });
    }

    /* Default */
    res.status(err.status || 500).json({
        message: err.message || "Internal server error",
    });
};

/* ════════════════════════════════════════════════
   3. 404 HANDLER
   Add BEFORE globalErrorHandler in server.js
════════════════════════════════════════════════ */
export const notFound = (req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
};