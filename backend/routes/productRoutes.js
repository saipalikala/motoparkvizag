/* ================================================
   File: backend/routes/productRoutes.js
   ================================================ */
import express from "express";
import {
    createProduct,
    getProducts,
    deleteProduct,
    updateProduct,
    getProductFilters,
} from "../controllers/productController.js";
import { uploadProducts } from "../config/cloudinary.js";

const router = express.Router();

/* ── FILTERS — must be before /:id ── */
router.get("/filters", getProductFilters);

router.get("/", getProducts);
router.post("/", uploadProducts.any(), createProduct);
router.put("/:id", uploadProducts.any(), updateProduct);
router.delete("/:id", deleteProduct);

export default router;