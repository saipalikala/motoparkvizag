import PaymentEvent from "../models/paymentEventModel.js";

/**
 * controllers/reconciliationController.js — read-time detection of orphaned
 * ("stranded") payments: money Razorpay captured for which no Order exists.
 *
 * WHY READ-TIME. The payment.captured webhook records every capture into
 * paymentevents, but it cannot decide "stranded" at write time — it races the
 * browser's POST /orders, so "no matching order yet" can simply mean the order
 * is still in flight. We therefore compute stranded-ness here, on demand, and
 * only count a payment stranded once it is older than a grace window (long past
 * any in-flight checkout). See models/paymentEventModel.js.
 *
 * A payment is stranded when ALL hold:
 *   - status "captured"
 *   - captured more than `graceMinutes` ago
 *   - no Order shares its paymentId
 *
 * The join runs in one aggregation ($lookup into orders on paymentId, which uses
 * the unique paymentId index there), with a $facet so the page and the summary
 * (count + total value at risk) come back in a single round trip.
 */

const DEFAULT_GRACE_MINUTES = 15;
const MAX_GRACE_MINUTES = 24 * 60;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const clampInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

export const getStrandedPayments = async (req, res) => {
  try {
    const graceMinutes = clampInt(req.query.graceMinutes, DEFAULT_GRACE_MINUTES, 1, MAX_GRACE_MINUTES);
    const page  = clampInt(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clampInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const skip  = (page - 1) * limit;

    // Effective capture time is the event's own timestamp, falling back to when
    // we recorded it. Anything newer than this cutoff is still within grace.
    const cutoff = new Date(Date.now() - graceMinutes * 60 * 1000);

    const [facet] = await PaymentEvent.aggregate([
      { $match: { status: "captured" } },
      { $match: { $expr: { $lte: [{ $ifNull: ["$eventCreatedAt", "$createdAt"] }, cutoff] } } },
      { $lookup: { from: "orders", localField: "paymentId", foreignField: "paymentId", as: "orders" } },
      { $match: { orders: { $size: 0 } } },      // no order carries this payment
      { $project: { orders: 0 } },
      {
        $facet: {
          rows: [
            { $sort: { eventCreatedAt: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          summary: [
            { $group: { _id: null, count: { $sum: 1 }, amountPaise: { $sum: "$amount" } } },
          ],
        },
      },
    ]);

    const total            = facet.summary[0]?.count ?? 0;
    const totalAmountPaise = facet.summary[0]?.amountPaise ?? 0;

    const strandedPayments = facet.rows.map((p) => {
      const capturedAt = p.eventCreatedAt ?? p.createdAt;
      return {
        paymentId:       p.paymentId,
        razorpayOrderId: p.razorpayOrderId,
        amountPaise:     p.amount,
        amountRupees:    p.amount / 100,      // Razorpay reports paise; V2 formats rupees
        currency:        p.currency,
        email:           p.email,
        contact:         p.contact,
        capturedAt,
        recordedAt:      p.createdAt,
        ageMinutes:      Math.floor((Date.now() - new Date(capturedAt).getTime()) / 60000),
      };
    });

    res.json({
      strandedPayments,
      total,
      totalAmountPaise,
      totalAmountRupees: totalAmountPaise / 100,
      page,
      pages: Math.ceil(total / limit),
      limit,
      graceMinutes,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load stranded payments", error: err.message });
  }
};
