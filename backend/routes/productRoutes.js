/* ================================================
   File: backend/routes/productRoutes.js
   ================================================ */
import express from "express";
import multer from "multer";
import {
    createProduct,
    getProducts,
    deleteProduct,
    updateProduct,
    getProductFilters,
    bulkCreateProducts,        // ✅ added
} from "../controllers/productController.js";
import { uploadProducts } from "../config/cloudinary.js";
import authMiddleware from "../middleware/authMiddleware.js"; // ✅ added

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ── FILTERS — must be before /:id ── */
router.get("/filters", getProductFilters);

router.get("/", getProducts);
router.post("/", uploadProducts.any(), createProduct);
router.put("/:id", uploadProducts.any(), updateProduct);
router.delete("/:id", deleteProduct);
router.post("/bulk", authMiddleware, upload.single("csv"), bulkCreateProducts); // ✅

export default router;