// lib/checkout/razorpay.ts
//
// Razorpay helpers shared by checkout and the Razorpay webhook.
//
// Shipping details are stored on the Razorpay order (as notes) when it is created, so
// the order can be completed from Razorpay's own data even if the customer's browser
// never reports back after paying.
import Razorpay from 'razorpay';
import { CartError, loadServerCart } from '@/lib/checkout/serverCart';
import { CheckoutError, ShippingDetails } from '@/lib/checkout/validation';
import { createShopifyOrder, CreatedOrder } from '@/lib/checkout/orders';
import { withLock } from '@/lib/checkout/lock';

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new CheckoutError('Online payment is not configured', 503);
  return { client: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId, keySecret };
}

type Notes = Record<string, string>;

// Razorpay allows up to 15 notes of 256 characters each.
const NOTE_LIMIT = 250;
const clip = (v: string | undefined) => (v || '').slice(0, NOTE_LIMIT);

export function orderNotes(cartId: string, s: ShippingDetails): Notes {
  return {
    cartId: clip(cartId),
    email: clip(s.email),
    firstName: clip(s.firstName),
    lastName: clip(s.lastName),
    address1: clip(s.address1),
    address2: clip(s.address2),
    city: clip(s.city),
    province: clip(s.province),
    zip: clip(s.zip),
    phone: clip(s.phone),
  };
}

export function shippingFromNotes(notes: unknown): { cartId: string; shipping: ShippingDetails } {
  const n = (notes && typeof notes === 'object' ? notes : {}) as Notes;
  if (!n.cartId || !n.email) throw new PaymentNeedsReviewError('Razorpay order has no cart or shipping details');
  return {
    cartId: n.cartId,
    shipping: {
      email: n.email,
      firstName: n.firstName || '',
      lastName: n.lastName || '',
      address1: n.address1 || '',
      address2: n.address2 || '',
      city: n.city || '',
      province: n.province || '',
      zip: n.zip || '',
      phone: n.phone || undefined,
    },
  };
}

/**
 * The payment was taken but no order can be created automatically (for example the
 * cart changed after payment). It must be handled by staff, so it is logged loudly and
 * not retried.
 */
export class PaymentNeedsReviewError extends Error {}

/**
 * Turns a successful Razorpay payment into a Shopify order, using only data held by
 * Razorpay and Shopify. Safe to call more than once for the same payment, and from the
 * browser confirmation and the webhook at the same time: the result is one order.
 *
 * Returns null in development when the Shopify admin API isn't configured.
 */
export async function fulfillPaidOrder(razorpayOrderId: string, paymentId: string): Promise<CreatedOrder | null> {
  const { client } = getRazorpay();
  const [rzpOrder, payment] = await Promise.all([
    client.orders.fetch(razorpayOrderId),
    client.payments.fetch(paymentId),
  ]);

  if (payment.order_id !== razorpayOrderId || !['authorized', 'captured'].includes(payment.status)) {
    throw new CheckoutError('Payment was not completed');
  }
  if (Number(payment.amount) !== Number(rzpOrder.amount)) {
    throw new PaymentNeedsReviewError(`Paid ${payment.amount} but order was for ${rzpOrder.amount}`);
  }

  const { cartId, shipping } = shippingFromNotes(rzpOrder.notes);

  return withLock(`payment:${paymentId}`, async () => {
    let cart;
    try {
      cart = await loadServerCart(cartId);
    } catch (error) {
      if (error instanceof CartError) throw new PaymentNeedsReviewError(`Cart unavailable: ${error.message}`);
      throw error;
    }
    if (cart.totalMinor !== Number(payment.amount)) {
      throw new PaymentNeedsReviewError(`Cart total ${cart.totalMinor} no longer matches payment ${payment.amount}`);
    }
    return createShopifyOrder(cart, shipping, { paid: true, paymentRef: paymentId });
  });
}
