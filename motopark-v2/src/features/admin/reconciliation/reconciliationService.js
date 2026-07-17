/**
 * features/admin/reconciliation/reconciliationService.js — sole adminApi caller
 * for payment reconciliation.
 *
 * Backend contract (backend/routes/adminRoutes.js + reconciliationController.js):
 *   GET /api/admin/reconciliation/stranded?graceMinutes&page&limit  (admin JWT)
 *     → { strandedPayments[], total, totalAmountPaise, totalAmountRupees,
 *         page, pages, limit, graceMinutes }
 *
 * A "stranded" payment is one Razorpay captured (via the payment.captured
 * webhook, recorded in the paymentevents collection) for which NO Order shares
 * its paymentId, and which is older than `graceMinutes` — the grace window that
 * keeps an in-flight checkout from being mistaken for an orphan. See
 * backend/models/paymentEventModel.js.
 *
 * strandedPayment = { paymentId, razorpayOrderId, amountPaise, amountRupees,
 *                     currency, email, contact, capturedAt, recordedAt, ageMinutes }
 */
import { adminApi } from '../lib/adminApi.js';

/** Grace-window presets the page offers. Wider = fewer false positives, but a
 *  real orphan stays hidden longer. 15 min matches the backend default. */
export const GRACE_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 180, label: '3 hours' },
];

export async function listStrandedPayments({ page = 1, limit = 20, graceMinutes } = {}) {
  const params = { page, limit };
  if (graceMinutes != null) params.graceMinutes = graceMinutes;
  const { data } = await adminApi.get('/admin/reconciliation/stranded', {
    params,
    headers: { 'x-admin': '1' },
  });
  return {
    rows: Array.isArray(data?.strandedPayments) ? data.strandedPayments : [],
    total: data?.total ?? 0,
    totalAmountRupees: data?.totalAmountRupees ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 0,
    graceMinutes: data?.graceMinutes ?? graceMinutes ?? 15,
  };
}
