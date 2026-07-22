/**
 * Money formatting — DB stores integer paise (docs/04 rule: never floats).
 * Display: ₹ symbol + Indian digit grouping, e.g. 1249900 → "₹12,499".
 */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPaise(paise) {
  if (paise == null || Number.isNaN(paise)) return '';
  return inr.format(paise / 100);
}

/**
 * Whole-rupee formatter, e.g. 8850 → "₹8,850".
 * The LIVE V1 backend stores prices in whole rupees (NOT paise). Services
 * reading V1 data emit `priceINR` and components render it via formatINR().
 * `formatPaise` remains the contract for the future V2 backend (docs/04).
 */
export function formatINR(rupees) {
  if (rupees == null || Number.isNaN(rupees)) return '';
  return inr.format(rupees);
}

export function discountPercent(mrpPaise, pricePaise) {
  if (!mrpPaise || mrpPaise <= pricePaise) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}

/**
 * Format popularity count as a full integer without abbreviations (K/M).
 * - Clamp negative values to 0
 * - Returns exact integer string (e.g. 13000, 8500, 1200, 999)
 */
export function formatPopularity(value) {
  if (value == null || Number.isNaN(Number(value))) return '0';
  const num = Math.max(0, Math.floor(Number(value)));
  return num.toString();
}

