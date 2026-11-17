// lib/pricing.ts
//
// "Was" prices and discounts shown to shoppers. Only Shopify's own compare-at price is
// used: a struck-through price is never invented, because showing a made-up original
// price is misleading (and a consumer-protection risk in India).

/**
 * The compare-at price to show beside `price`, or undefined when there is no real
 * discount (no compare-at price set in Shopify, or one that isn't higher than the price).
 */
export function compareAtPrice(price: number, compareAt?: string | number | null): number | undefined {
  const value = typeof compareAt === 'number' ? compareAt : parseFloat(compareAt ?? '');
  return Number.isFinite(value) && value > price ? value : undefined;
}

/** Whole-number percentage off, or undefined when there is no real discount. */
export function discountPercent(price: number, compareAt?: number): number | undefined {
  if (!compareAt || compareAt <= price) return undefined;
  const percent = Math.round(((compareAt - price) / compareAt) * 100);
  return percent > 0 ? percent : undefined;
}

const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const paise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Rupee amount for display, e.g. "₹1,499" or "₹599.50". Use everywhere a price is shown. */
export function formatINR(amount: number | string | null | undefined): string {
  const n = typeof amount === 'number' ? amount : parseFloat(amount ?? '');
  const value = Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  return Number.isInteger(value) ? whole.format(value) : paise.format(value);
}
