// lib/site.ts
//
// Business facts shown across the site, in one place so every page says the same thing.
// Client-safe: no server imports.
//
// Anything set to null is NOT known yet and must come from the store owner. Pages hide
// whatever is null rather than showing a placeholder. Never fill these in with guesses.

export const SITE = {
  name: 'Nomadica',
  domain: 'nomadica.in',
  supportEmail: 'support@nomadica.in',
  /** Customer support response time, as stated on the contact page. */
  supportResponse: '24–48 business hours',

  // ---- Needed from the store owner (hidden until set) ----
  /** e.g. '+91 98xxxxxxxx' */
  supportPhone: null as string | null,
  /** WhatsApp number in international format without '+', e.g. '9198xxxxxxxx' */
  whatsappNumber: null as string | null,
  /** Full registered office address */
  registeredAddress: null as string | null,
  legalName: null as string | null,
  gstin: null as string | null,
  cin: null as string | null,
  grievanceOfficer: null as { name: string; email: string; phone?: string } | null,
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },
} as const;

/** Store policies. Checkout, cart and policy pages all read these. */
export const POLICY = {
  /** Return window in days from delivery. */
  returnDays: 3,
  /** Damaged or wrong items must be reported within this many hours of delivery. */
  damageReportHours: 24,
  /** Shipping fee below the free-shipping threshold, in INR. */
  shippingFee: 99,
  /** Orders at or above this merchandise total ship free, in INR. */
  freeShippingThreshold: 2000,
  /** Business days to pack an order. */
  processingDays: '1–3',
  /** Business days in transit after dispatch. */
  deliveryDays: '4–7',
  /** Business days for a refund to reach the original payment method. */
  refundDays: '5–7',
  /** India only: checkout accepts Indian addresses only. */
  shipsInternationally: false,
} as const;
