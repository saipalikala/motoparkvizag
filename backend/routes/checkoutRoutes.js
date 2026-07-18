import express from "express";
import { getCheckoutStatus } from "../controllers/checkoutStatusController.js";

/**
 * routes/checkoutRoutes.js — read-only checkout status, polled by the storefront
 * while the Razorpay modal is open.
 *
 * Mounted in server.js ABOVE globalApiLimiter, with its own limiter. That is
 * deliberate: the global limit is 200 requests / 15 min across ALL of /api, and a
 * single checkout polls tens of times. Left under it, a customer waiting on a
 * slow UPI payment would spend their whole API budget confirming one order and
 * then get rate-limited out of the site they just bought from. Same reasoning as
 * the webhook mount — see the comment there.
 */
const router = express.Router();

router.get("/status/:razorpayOrderId", getCheckoutStatus);

export default router;
