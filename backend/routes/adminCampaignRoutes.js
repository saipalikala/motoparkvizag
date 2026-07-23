import express from "express";
import {
  getAdminCampaigns,
  createAdminCampaign,
  updateAdminCampaign,
  deleteAdminCampaign,
  toggleAdminCampaign,
} from "../controllers/campaignController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Require Admin Authentication for all management routes
router.use(authMiddleware);

router.get("/", getAdminCampaigns);
router.post("/", createAdminCampaign);
router.put("/:id", updateAdminCampaign);
router.delete("/:id", deleteAdminCampaign);
router.patch("/:id/toggle", toggleAdminCampaign);

export default router;
