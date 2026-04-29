import express from "express";
import multer from "multer";
import {
    createProduct, getProducts, deleteProduct,
    updateProduct, getProductFilters, bulkCreateProducts, getProductById,
} from "../controllers/productController.js";
import { uploadProducts } from "../config/cloudinary.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const csvUpload = multer({ storage: multer.memoryStorage() });

// Public — read only
router.get("/filters", getProductFilters);   // MUST be before /:id
router.get("/", getProducts);
router.get("/:id", getProductById);

// Protected — admin only
router.post(  "/",     authMiddleware, uploadProducts.any(), createProduct);
router.put(   "/:id",  authMiddleware, uploadProducts.any(), updateProduct);
router.delete("/:id",  authMiddleware, deleteProduct);
router.post(  "/bulk", authMiddleware, csvUpload.single("csv"), bulkCreateProducts);

export default router;