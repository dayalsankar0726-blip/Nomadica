// lib/checkout/paymentMessages.ts
//
// Customer-facing messages for the Razorpay checkout window: failed payments,
// cancelled payments, and a payment that went through but couldn't be confirmed.
import { SITE } from '@/lib/site';

/** The `error` object Razorpay passes to the `payment.failed` event. */
export interface RazorpayPaymentError {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: { order_id?: string; payment_id?: string };
}

const NOT_CHARGED = 'You have not been charged.';
const TRY_AGAIN = 'Please try again, use a different payment method, or choose Cash on Delivery.';

// Razorpay sometimes returns technical text; don't show that to customers.
const UNHELPFUL = /undefined|null|internal|exception|bad_request|server error/i;

/** Message shown after Razorpay reports a failed payment and the customer closes the window. */
export function failedPaymentMessage(error?: RazorpayPaymentError | null): string {
  const description = error?.description?.trim();
  const reason = description && description.length <= 200 && !UNHELPFUL.test(description)
    ? description.replace(/\.?$/, '.')
    : 'Your payment could not be completed.';
  return `Payment failed: ${reason} ${NOT_CHARGED} ${TRY_AGAIN}`;
}

/** Message shown when the customer closes the Razorpay window without paying. */
export function cancelledPaymentMessage(): string {
  return `Payment cancelled. ${NOT_CHARGED} You can place your order again when you're ready.`;
}

/**
 * Message shown when Razorpay took the payment but the site couldn't confirm the order
 * (for example a network error). The Razorpay webhook still creates the order, so the
 * customer must not pay again.
 */
export function unconfirmedPaymentMessage(paymentId?: string): string {
  const ref = paymentId ? ` (payment reference ${paymentId})` : '';
  return (
    `We received your payment${ref}, but couldn't confirm your order on this page. ` +
    'Please don\'t pay again. Your order will be confirmed shortly, or refunded in full if it can\'t be. ' +
    `For help, contact ${SITE.supportEmail} with the payment reference.`
  );
}
