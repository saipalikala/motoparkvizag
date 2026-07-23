import {
  listAdminCampaigns,
  getActiveStorefrontCampaigns,
  createCampaignService,
  updateCampaignService,
  softDeleteCampaignService,
  toggleCampaignService,
  CampaignError,
} from "../services/campaignService.js";

/** Helper to format standard error responses */
function handleControllerError(res, err) {
  if (err instanceof CampaignError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }
  console.error("🔴 CampaignController Error:", err);
  return res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
    code: "SERVER_ERROR",
  });
}

/** Admin: List all campaigns */
export async function getAdminCampaigns(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await listAdminCampaigns({ page, limit });
    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    return handleControllerError(res, err);
  }
}

/** Storefront: Get active campaigns */
export async function getPublicCampaigns(req, res) {
  try {
    const campaigns = await getActiveStorefrontCampaigns();
    return res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (err) {
    return handleControllerError(res, err);
  }
}

/** Admin: Create new campaign */
export async function createAdminCampaign(req, res) {
  try {
    const adminUser = req.admin?.username || "admin";
    const campaign = await createCampaignService(req.body, adminUser);
    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      data: campaign,
    });
  } catch (err) {
    return handleControllerError(res, err);
  }
}

/** Admin: Update existing campaign */
export async function updateAdminCampaign(req, res) {
  try {
    const { id } = req.params;
    const adminUser = req.admin?.username || "admin";
    const campaign = await updateCampaignService(id, req.body, adminUser);
    return res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      data: campaign,
    });
  } catch (err) {
    return handleControllerError(res, err);
  }
}

/** Admin: Delete campaign (Soft Delete) */
export async function deleteAdminCampaign(req, res) {
  try {
    const { id } = req.params;
    const adminUser = req.admin?.username || "admin";
    const result = await softDeleteCampaignService(id, adminUser);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    return handleControllerError(res, err);
  }
}

/** Admin: Toggle campaign enabled status */
export async function toggleAdminCampaign(req, res) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const adminUser = req.admin?.username || "admin";
    const campaign = await toggleCampaignService(id, enabled, adminUser);
    return res.status(200).json({
      success: true,
      message: `Campaign ${enabled ? "enabled" : "disabled"} successfully`,
      data: campaign,
    });
  } catch (err) {
    return handleControllerError(res, err);
  }
}
