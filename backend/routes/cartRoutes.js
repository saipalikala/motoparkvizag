import express from "express";
import {
    getCart, syncCart, mergeCart, clearCart,
    getWishlist, syncWishlist, mergeWishlist,
} from "../controllers/cartController.js";
import { protect } from "../middleware/userAuth.js";

const router = express.Router();

// All routes require login
router.use(protect);

router.get("/", getCart);
router.put("/", syncCart);
router.post("/merge", mergeCart);
router.delete("/", clearCart);

export default router;

export const wishlistRouter = express.Router();
wishlistRouter.use(protect);
wishlistRouter.get("/", getWishlist);
wishlistRouter.put("/", syncWishlist);
wishlistRouter.post("/merge", mergeWishlist);