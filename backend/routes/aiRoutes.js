/* ================================================
   File: backend/routes/aiRoutes.js
   Mounts the assistant with its own (stricter) rate limiter,
   since LLM calls cost money and are abuse-prone.
   ================================================ */
import express from "express";
import rateLimit from "express-rate-limit";
import { chat, search } from "../ai/aiController.js";
import { aiStats } from "../ai/adminStats.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Stricter than the global limiter — LLM calls are expensive.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI requests / IP / minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests, please slow down." },
});

router.use(aiLimiter);

router.post("/chat", chat);
router.post("/search", search);

// Admin-only observability dashboard data (JWT admin role required).
router.get("/admin/stats", authMiddleware, aiStats);

export default router;
