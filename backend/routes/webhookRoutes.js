/**
 * routes/webhookRoutes.js — server-to-server webhook receivers (Razorpay).
 *
 * MOUNTED SPECIALLY in server.js, ABOVE the global express.json(), with its own
 * express.raw() body parser. Two reasons this cannot live with the normal routes:
 *   1. Signature = HMAC over the RAW body. Once express.json parses and the body
 *      is re-serialized, the bytes differ and every real delivery fails to verify.
 *   2. /api/payment carries paymentLimiter (10/min per IP). Razorpay delivers
 *      from a few IPs; a retry burst would exhaust that bucket, get 429s, and —
 *      429 being non-2xx — make Razorpay retry harder. So webhooks live under a
 *      separate prefix with their own limiter.
 *
 * Auth is the signature itself (there is no user session on a server-to-server
 * call), so there is no optionalAuth/requireAuth here.
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { handleRazorpayWebhook } from "../controllers/webhookController.js";

const router = express.Router();

/* Generous vs the customer paymentLimiter: legitimate bursts (batched captures,
   Razorpay retries) must not be throttled, but an unauthenticated flood should
   still be capped since verification runs a per-request HMAC. */
const webhookLimiter = rateLimit({
  windowMs       : 60 * 1000,
  max            : 120,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { message: "Too many webhook requests." },
});

router.post("/razorpay", webhookLimiter, handleRazorpayWebhook);

export default router;
