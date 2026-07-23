import express from "express";
import { getPublicCampaigns } from "../controllers/campaignController.js";

const router = express.Router();

// Storefront public endpoint — returns active non-deleted enabled campaigns
router.get("/", getPublicCampaigns);

export default router;
