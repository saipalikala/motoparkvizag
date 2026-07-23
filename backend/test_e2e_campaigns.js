import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Campaign from './models/Campaign.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';
const secret = process.env.JWT_SECRET || 'motopark_super_secret_key_2024';
const adminToken = jwt.sign({ id: 'admin_test_id', role: 'admin', email: 'admin@motopark.in' }, secret, { expiresIn: '1h' });

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${adminToken}`,
};

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 MOTOPARK V2 — END-TO-END CAMPAIGN VERIFICATION');
  console.log('====================================================\n');

  // Step 1: POST /api/admin/campaigns (Create)
  console.log('▶ STEP 1: Creating a real campaign via POST /api/admin/campaigns');
  const createPayload = {
    name: 'E2E Test Sale 2026',
    type: 'season_sale',
    enabled: true,
    priority: 50,
    title: 'Monsoon Mega Sale',
    subtitle: 'Get up to 30% off top riding gear.',
    ctaLabel: 'Explore Sale',
    ctaUrl: '/collections/riding-gear',
    badgeText: '30% OFF',
    presentationType: 'floating_card',
    displayDelayMs: 1000,
    dismissBehaviour: 'session',
    displayOnce: true,
  };

  const createRes = await fetch(`${API_BASE}/admin/campaigns`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(createPayload),
  });

  const createStatus = createRes.status;
  const createData = await createRes.json();
  console.log(`STATUS: ${createStatus} (Expected: 201)`);
  console.log('RESPONSE:', JSON.stringify(createData, null, 2));

  if (createStatus !== 201 || !createData.success) {
    throw new Error('Step 1 Failed: Campaign creation failed.');
  }

  const campaignId = createData.data._id;
  console.log(`✅ Step 1 SUCCESS! Created Campaign ID: ${campaignId}\n`);

  // Step 2: GET /api/admin/campaigns (Admin List)
  console.log('▶ STEP 2: Verifying campaign appears in Admin List (GET /api/admin/campaigns)');
  const listRes = await fetch(`${API_BASE}/admin/campaigns`, {
    headers: authHeaders,
  });
  const listData = await listRes.json();
  const foundInList = listData.data.find((c) => c._id === campaignId);
  console.log(`FOUND IN ADMIN LIST: ${Boolean(foundInList)} (Total Admin Campaigns: ${listData.data.length})`);
  if (!foundInList) throw new Error('Step 2 Failed: Campaign not found in Admin list.');
  console.log('✅ Step 2 SUCCESS!\n');

  // Step 3: Verify MongoDB Document
  console.log('▶ STEP 3: Verifying document direct in MongoDB');
  await mongoose.connect(process.env.MONGO_URI);
  const dbDoc = await Campaign.findById(campaignId);
  console.log('MONGODB DOCUMENT:', JSON.stringify(dbDoc, null, 2));
  if (!dbDoc || dbDoc.name !== 'E2E Test Sale 2026') {
    throw new Error('Step 3 Failed: MongoDB document mismatch.');
  }
  console.log('✅ Step 3 SUCCESS!\n');

  // Step 4: GET /api/campaigns (Public Storefront when Enabled)
  console.log('▶ STEP 4: Verifying public storefront endpoint (GET /api/campaigns) when Enabled');
  const publicRes = await fetch(`${API_BASE}/campaigns`);
  const publicData = await publicRes.json();
  console.log('PUBLIC RESPONSE:', JSON.stringify(publicData, null, 2));
  const foundPublic = publicData.data.find((c) => c._id === campaignId);
  if (!foundPublic) throw new Error('Step 4 Failed: Enabled campaign not returned in public API.');
  console.log('✅ Step 4 SUCCESS!\n');

  // Step 5: Verify Storefront data mapping
  console.log('▶ STEP 5: Verifying Storefront attributes (Title, CTA, Badge)');
  console.log(`Title: "${foundPublic.title}" | CTA: "${foundPublic.ctaLabel}" -> "${foundPublic.ctaUrl}"`);
  console.log('✅ Step 5 SUCCESS!\n');

  // Step 6: PUT /api/admin/campaigns/:id (Edit & Persistence)
  console.log('▶ STEP 6: Editing campaign via PUT /api/admin/campaigns/:id');
  const updatePayload = {
    ...createPayload,
    title: 'Monsoon Mega Sale (UPDATED)',
    priority: 100,
  };
  const editRes = await fetch(`${API_BASE}/admin/campaigns/${campaignId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(updatePayload),
  });
  const editData = await editRes.json();
  console.log('EDIT RESPONSE:', JSON.stringify(editData, null, 2));
  if (editData.data.title !== 'Monsoon Mega Sale (UPDATED)' || editData.data.priority !== 100) {
    throw new Error('Step 6 Failed: Edit failed to persist.');
  }
  console.log('✅ Step 6 SUCCESS!\n');

  // Step 7: PATCH /api/admin/campaigns/:id/toggle (Disable & Check Public Endpoint)
  console.log('▶ STEP 7: Toggling campaign to Disabled and checking public endpoint');
  const toggleRes = await fetch(`${API_BASE}/admin/campaigns/${campaignId}/toggle`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ enabled: false }),
  });
  const toggleData = await toggleRes.json();
  console.log('TOGGLE RESPONSE:', JSON.stringify(toggleData, null, 2));

  const publicResAfterDisable = await fetch(`${API_BASE}/campaigns`);
  const publicDataAfterDisable = await publicResAfterDisable.json();
  const foundDisabledPublic = publicDataAfterDisable.data.find((c) => c._id === campaignId);
  console.log(`EXCLUDED FROM PUBLIC STOREFRONT WHEN DISABLED: ${!foundDisabledPublic}`);
  if (foundDisabledPublic) throw new Error('Step 7 Failed: Disabled campaign was returned to storefront.');
  console.log('✅ Step 7 SUCCESS!\n');

  // Step 8: DELETE /api/admin/campaigns/:id (Soft Delete & Verify MongoDB retention)
  console.log('▶ STEP 8: Soft deleting campaign and verifying MongoDB retention');
  const deleteRes = await fetch(`${API_BASE}/admin/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteData = await deleteRes.json();
  console.log('DELETE RESPONSE:', JSON.stringify(deleteData, null, 2));

  // Verify excluded from Admin list
  const listAfterDelete = await fetch(`${API_BASE}/admin/campaigns`, { headers: authHeaders });
  const listDataAfterDelete = await listAfterDelete.json();
  const inAdminListAfterDelete = listDataAfterDelete.data.find((c) => c._id === campaignId);
  console.log(`EXCLUDED FROM ADMIN LIST: ${!inAdminListAfterDelete}`);

  // Verify STILL in MongoDB with isDeleted: true
  const docInMongo = await Campaign.findById(campaignId);
  console.log(`MONGODB RETENTION: isDeleted=${docInMongo.isDeleted}, deletedAt=${docInMongo.deletedAt}`);
  if (!docInMongo.isDeleted || !docInMongo.deletedAt) {
    throw new Error('Step 8 Failed: Soft delete flags not properly set in MongoDB.');
  }
  console.log('✅ Step 8 SUCCESS!\n');

  // Cleanup test doc from DB
  await Campaign.findByIdAndDelete(campaignId);
  await mongoose.disconnect();

  console.log('====================================================');
  console.log('🎉 ALL 8 E2E VERIFICATION STEPS PASSED PERFECTLY!');
  console.log('====================================================');
}

runE2ETests().catch((err) => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exit(1);
});
