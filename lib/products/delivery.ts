// lib/products/delivery.ts
//
// Delivery estimate shown on the product page. There is no courier serviceability API,
// so a PIN code is only checked for a valid Indian format and the store's standard
// estimate from POLICY (processing + transit days) is shown. Nothing here promises more
// than POLICY says. Client-safe.

import { POLICY } from "@/lib/site";

/** Indian PIN codes: six digits, not starting with 0. */
export function isValidPincode(value: string): boolean {
  return /^[1-9][0-9]{5}$/.test(value.trim());
}

/** Parses "1–3" / "4-7" / "5" into [min, max]; null when it isn't a day range. */
export function parseDayRange(range: string): [number, number] | null {
  const m = String(range).trim().match(/^(\d+)\s*(?:[–—-]\s*(\d+))?$/);
  if (!m) return null;
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : min;
  return max >= min ? [min, max] : null;
}

export interface DeliveryEstimate {
  /** e.g. "5–10 business days" (processing + transit), or null when POLICY can't be added up. */
  total: string | null;
  /** e.g. "Packed in 1–3 business days, then 4–7 business days in transit." */
  detail: string;
}

/** The standard delivery estimate from POLICY. */
export function deliveryEstimate(policy: { processingDays: string; deliveryDays: string } = POLICY): DeliveryEstimate {
  const a = parseDayRange(policy.processingDays);
  const b = parseDayRange(policy.deliveryDays);
  let total: string | null = null;
  if (a && b) {
    const min = a[0] + b[0];
    const max = a[1] + b[1];
    total = min === max ? `${min} business days` : `${min}–${max} business days`;
  }
  return {
    total,
    detail: `Packed in ${policy.processingDays} business days, then ${policy.deliveryDays} business days in transit.`,
  };
}
