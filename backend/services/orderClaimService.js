import Order from "../models/orderModel.js";

/**
 * claimGuestOrdersForUser — Idempotent helper to link past guest orders
 * to a verified user account by matching shippingAddress.email.
 *
 * Designed to be safe for non-blocking execution (does not throw or block auth response).
 *
 * @param {string|mongoose.Types.ObjectId} userId - The verified User ID
 * @param {string} email - User's email address
 * @returns {Promise<{ matchedCount: number, modifiedCount: number }>}
 */
export async function claimGuestOrdersForUser(userId, email) {
    const start = Date.now();
    if (!userId || !email || typeof email !== "string") {
        return { matchedCount: 0, modifiedCount: 0 };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
        return { matchedCount: 0, modifiedCount: 0 };
    }

    try {
        const result = await Order.updateMany(
            { user: null, "shippingAddress.email": cleanEmail },
            { $set: { user: userId } }
        );

        const durationMs = Date.now() - start;
        console.log(
            `[ORDER_CLAIM_SUCCESS] userId=${userId} email=${cleanEmail} ` +
            `matched=${result.matchedCount} claimed=${result.modifiedCount} durationMs=${durationMs}ms`
        );

        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        };
    } catch (err) {
        const durationMs = Date.now() - start;
        console.error(
            `[ORDER_CLAIM_ERROR] userId=${userId} email=${cleanEmail} ` +
            `error="${err?.message}" durationMs=${durationMs}ms`
        );
        return { matchedCount: 0, modifiedCount: 0 };
    }
}
