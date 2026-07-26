import { api } from '@/lib/api.js';

/**
 * Validates a coupon code against a cart subtotal.
 * @param {string} code
 * @param {number} subtotalINR
 * @returns {Promise<{ valid: boolean, code: string, message: string, coupon?: object }>}
 */
export async function validateCoupon(code, subtotalINR) {
  try {
    const { data } = await api.post('/coupons/validate', {
      code,
      subtotalINR,
    });
    return data;
  } catch (err) {
    if (err?.response?.data) {
      return err.response.data;
    }
    return {
      valid: false,
      code: 'NETWORK_ERROR',
      message: 'Failed to validate coupon. Please try again.',
    };
  }
}
