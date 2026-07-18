import bcrypt from "bcryptjs";
import { jwtSecret } from "../config/jwt.js";
import jwt from "jsonwebtoken";
import { revokeToken } from "../middleware/authMiddleware.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  // Validate inputs exist before touching bcrypt
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password required" });
  }

  // Always run bcrypt regardless of email match — prevents timing attack
  // that lets attacker enumerate whether an email is valid
  const emailMatch = email === process.env.ADMIN_EMAIL;
  const hashToCheck = emailMatch
    ? process.env.ADMIN_PASSWORD_HASH
    : "$2b$10$invalidhashpaddingtomakeitslowXXXXXXXXXXXXXXXXXXXXXXX"; // dummy — same cost factor

  const match = await bcrypt.compare(password, hashToCheck);

  if (!emailMatch || !match) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { role: "admin", email },
    jwtSecret(),
    { expiresIn: "24h" }
  );

  res.json({ token });
};

export const logoutAdmin = (req, res) => {
  revokeToken(req.token);
  res.json({ message: "Logged out successfully" });
};

/**
 * GET /api/admin/stats — dashboard summary metrics (admin JWT).
 *
 * Revenue is computed server-side via a MongoDB $group aggregation — never in
 * the client. Cancelled/returned orders are excluded from revenue since that
 * money was never (or is no longer) collected. `totalOrders` counts every order
 * (matching the "All time" tile); `activeProducts` is the full catalog count
 * (V1 has no per-product active flag); `totalCustomers` is the registered-user
 * count. All four run in parallel.
 */
const REVENUE_EXCLUDED_STATUSES = ["cancelled", "returned"];

export const getStats = async (req, res) => {
  try {
    const [revenueAgg, totalOrders, activeProducts, totalCustomers] =
      await Promise.all([
        Order.aggregate([
          { $match: { status: { $nin: REVENUE_EXCLUDED_STATUSES } } },
          { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
        ]),
        Order.countDocuments({}),
        Product.countDocuments({}),
        User.countDocuments({}),
      ]);

    res.json({
      totalRevenue: revenueAgg[0]?.totalRevenue ?? 0,
      totalOrders,
      activeProducts,
      totalCustomers,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load admin stats", error: err.message });
  }
};