// lib/checkout/validation.ts
// Input checks and payment signature verification for checkout.
import crypto from 'crypto';
import { normalizeIndianMobile, SHIPPING_FIELDS, validateShippingFields } from '@/app/checkout/checkoutFields';

export interface ShippingDetails {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
  phone?: string;
}

export class CheckoutError extends Error {
  /** `field` names the shipping field the message is about, so the page can show it there. */
  constructor(message: string, public status = 400, public field?: string) {
    super(message);
  }
}

export function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function readShipping(body: Record<string, unknown>): ShippingDetails {
  const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const details: ShippingDetails = {
    email: str(body.email, 254).toLowerCase(),
    firstName: str(body.firstName, 100),
    lastName: str(body.lastName, 100),
    address1: str(body.address1),
    address2: str(body.address2),
    city: str(body.city, 100),
    province: str(body.province, 100),
    zip: str(body.zip, 20),
    phone: str(body.phone, 20),
  };
  // Same rules and messages as the checkout form; couriers need the mobile number.
  const errors = validateShippingFields({ ...details, phone: details.phone ?? '' });
  const first = SHIPPING_FIELDS.find((f) => errors[f]);
  if (first) throw new CheckoutError(errors[first]!, 400, first);
  details.phone = normalizeIndianMobile(details.phone) ?? undefined;
  return details;
}

/**
 * Checks a Razorpay webhook: the X-Razorpay-Signature header must be the HMAC-SHA256
 * of the raw request body, keyed with the webhook secret set in the Razorpay dashboard.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
