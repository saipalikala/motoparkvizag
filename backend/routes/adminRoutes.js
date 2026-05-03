/**
 * routes/adminRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Logout route added
 *      Before: no logout endpoint. The admin token lived for 24 hours
 *      with no way to revoke it. If a token was stolen, it was valid
 *      for the rest of its lifetime.
 *      After: POST /api/admin/logout revokes the token using the
 *      in-memory blacklist in authMiddleware.js (revokeToken).
 *      The client should delete the token from localStorage on logout.
 *
 * [F2] Login input validation
 *      Before: adminLogin controller fetched from DB before checking
 *      if email/password were even provided. An empty body hit the DB.
 *      After: email and password presence checked in route before
 *      calling controller. Returns 400 immediately on missing fields.
 *      (Also fixed in adminController.js)
 *
 * [F3] Rate limiting on login
 *      The globalApiLimiter in server.js covers /api/admin, but
 *      login attempts should have a tighter limit to prevent
 *      brute-force attacks on the admin password.
 *      Added loginLimiter: 10 attempts per 15 minutes per IP.
 */

import express    from "express";
import rateLimit  from "express-rate-limit";
import { adminLogin, logoutAdmin } from "../controllers/adminController.js";
import authMiddleware              from "../middleware/authMiddleware.js";

const router = express.Router();

// [F3]: tight rate limit on admin login specifically
const loginLimiter = rateLimit({
  windowMs       : 15 * 60 * 1000,
  max            : 10,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { message: "Too many login attempts. Try again in 15 minutes." },
});

/* ── PUBLIC ── */
router.post("/login", loginLimiter, (req, res, next) => {
  // [F2]: validate inputs before hitting controller
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  next();
}, adminLogin);

/* ── PROTECTED ── */
router.use(authMiddleware);

// [F1]: Logout — revokes the current token
router.post("/logout", logoutAdmin);

// Add future admin-only routes here:
// router.get("/dashboard-stats", getDashboardStats);

export default router;