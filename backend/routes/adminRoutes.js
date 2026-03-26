import express from "express";
import { adminLogin } from "../controllers/adminController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — no token needed
router.post("/login", adminLogin);

// Apply auth to everything below this line
router.use(authMiddleware);

// Add your other admin routes here, e.g.:
// router.get("/dashboard-stats", getDashboardStats);

export default router;