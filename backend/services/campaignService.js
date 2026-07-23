import Campaign from "../models/Campaign.js";

/** Custom Domain Error Helper */
export class CampaignError extends Error {
  constructor(message, code = "CAMPAIGN_ERROR", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Compute Admin Display Status */
export function computeCampaignStatus(campaign) {
  if (!campaign) return "Unknown";
  if (campaign.isDeleted) return "Deleted";
  if (!campaign.enabled) return "Disabled";

  const now = Date.now();
  if (campaign.startDate && new Date(campaign.startDate).getTime() > now) {
    return "Upcoming";
  }
  if (campaign.endDate && new Date(campaign.endDate).getTime() < now) {
    return "Expired";
  }
  return "Active";
}

/** Domain Data Validator */
export function validateCampaignData(data) {
  if (!data.name || !data.name.trim()) {
    throw new CampaignError("Campaign name is required", "MISSING_NAME", 400);
  }
  if (!data.title || !data.title.trim()) {
    throw new CampaignError("Headline title is required", "MISSING_TITLE", 400);
  }
  if (!data.ctaLabel || !data.ctaLabel.trim()) {
    throw new CampaignError("CTA label is required", "MISSING_CTA_LABEL", 400);
  }
  if (!data.ctaUrl || !data.ctaUrl.trim()) {
    throw new CampaignError("CTA URL is required", "MISSING_CTA_URL", 400);
  }

  // Validate Date Range
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate).getTime();
    const end = new Date(data.endDate).getTime();
    if (isNaN(start) || isNaN(end)) {
      throw new CampaignError("Invalid start or end date format", "INVALID_DATE_FORMAT", 400);
    }
    if (end < start) {
      throw new CampaignError("End date cannot be earlier than start date", "INVALID_DATE_RANGE", 400);
    }
  }

  // Priority bounds
  if (data.priority !== undefined && data.priority !== null) {
    const prio = Number(data.priority);
    if (isNaN(prio) || prio < 0 || prio > 1000) {
      throw new CampaignError("Priority must be a number between 0 and 1000", "INVALID_PRIORITY", 400);
    }
  }
}

/** Admin List Campaigns with Pagination & Computed Status */
export async function listAdminCampaigns({ page = 1, limit = 20 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const query = { isDeleted: false };
  const total = await Campaign.countDocuments(query);
  const docs = await Campaign.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(l)
    .lean();

  const items = docs.map((doc) => ({
    ...doc,
    status: computeCampaignStatus(doc),
  }));

  return {
    items,
    pagination: {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l) || 1,
    },
  };
}

/** Public Storefront Active Campaign Selection */
export async function getActiveStorefrontCampaigns() {
  const now = new Date();
  const docs = await Campaign.find({
    isDeleted: false,
    enabled: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  return docs;
}

/** Create Campaign */
export async function createCampaignService(payload, adminUser = "admin") {
  validateCampaignData(payload);

  // Check unique active campaign name
  const existing = await Campaign.findOne({
    name: payload.name.trim(),
    isDeleted: false,
  });

  if (existing) {
    throw new CampaignError("Campaign with this name already exists", "CAMPAIGN_NAME_EXISTS", 409);
  }

  const doc = new Campaign({
    ...payload,
    name: payload.name.trim(),
    title: payload.title.trim(),
    createdBy: adminUser,
    updatedBy: adminUser,
  });

  await doc.save();
  const obj = doc.toObject();
  return {
    ...obj,
    status: computeCampaignStatus(obj),
  };
}

/** Update Campaign */
export async function updateCampaignService(id, payload, adminUser = "admin") {
  validateCampaignData(payload);

  const doc = await Campaign.findOne({ _id: id, isDeleted: false });
  if (!doc) {
    throw new CampaignError("Campaign not found", "CAMPAIGN_NOT_FOUND", 404);
  }

  if (payload.name && payload.name.trim() !== doc.name) {
    const existing = await Campaign.findOne({
      _id: { $ne: id },
      name: payload.name.trim(),
      isDeleted: false,
    });
    if (existing) {
      throw new CampaignError("Campaign with this name already exists", "CAMPAIGN_NAME_EXISTS", 409);
    }
  }

  Object.assign(doc, payload, { updatedBy: adminUser });
  await doc.save();

  const obj = doc.toObject();
  return {
    ...obj,
    status: computeCampaignStatus(obj),
  };
}

/** Soft Delete Campaign */
export async function softDeleteCampaignService(id, adminUser = "admin") {
  const doc = await Campaign.findOne({ _id: id, isDeleted: false });
  if (!doc) {
    throw new CampaignError("Campaign not found", "CAMPAIGN_NOT_FOUND", 404);
  }

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  doc.updatedBy = adminUser;
  await doc.save();

  return { id, message: "Campaign deleted successfully" };
}

/** Toggle Campaign Enabled State */
export async function toggleCampaignService(id, enabled, adminUser = "admin") {
  const doc = await Campaign.findOne({ _id: id, isDeleted: false });
  if (!doc) {
    throw new CampaignError("Campaign not found", "CAMPAIGN_NOT_FOUND", 404);
  }

  doc.enabled = Boolean(enabled);
  doc.updatedBy = adminUser;
  await doc.save();

  const obj = doc.toObject();
  return {
    ...obj,
    status: computeCampaignStatus(obj),
  };
}
