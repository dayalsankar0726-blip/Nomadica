// lib/checkout/cancelOrder.ts
//
// Lets a signed-in customer cancel their own order before it is packed or shipped.
//  1. The order must be in the customer's own order list (checked with their token).
//  2. Shopify's current status is re-checked with the admin API: not cancelled, nothing shipped.
//  3. Shopify cancels the order, puts the stock back and emails the customer.
//  4. Orders paid online are refunded in full through Razorpay. The Razorpay payment ID is
//     on the order's `rzp-<paymentId>` tag. If the refund can't be started, the order stays
//     cancelled and the failure is logged for staff to refund by hand.
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/shopify/admin';
import { fetchCustomerOrders } from '@/lib/shopify/customerOrders';
import { getRazorpay } from '@/lib/checkout/razorpay';
import { withLock } from '@/lib/checkout/lock';
import { CheckoutError } from '@/lib/checkout/validation';
import { devSamplesEnabled } from '@/lib/devMocks';
import { SITE } from '@/lib/site';
import {
  CANCEL_NOTE_MAX,
  CancelResult,
  RefundOutcome,
  canCustomerCancel,
  cancelReasonLabel,
} from '@/lib/orders/cancellation';

export interface CancelRequest {
  customerAccessToken: string;
  orderId: string;
  reason: string;
  note?: string;
}

export const NOT_CANCELLABLE =
  "This order is already being packed or has shipped, so it can't be cancelled here. " +
  `Please contact ${SITE.supportEmail} and we will help you return it.`;

/** Validates the reason and builds the staff note saved on the Shopify order. */
export function staffNoteFor(reason: string, note?: string): string {
  const label = cancelReasonLabel(reason);
  if (!label) throw new CheckoutError('Please choose a reason for cancelling', 400);
  const extra = (note || '').replace(/\s+/g, ' ').trim().slice(0, CANCEL_NOTE_MAX);
  return `Cancelled by the customer on the website. Reason: ${label}${extra ? `. Customer note: ${extra}` : ''}`;
}

export type AdminClient = NonNullable<ReturnType<typeof getAdminClient>>;

/**
 * Checks the order is in the signed-in customer's own order list and returns the admin
 * client with the order's admin ID. Throws 404 for anyone else's order.
 */
export async function ownedOrder(customerAccessToken: string, orderId: string): Promise<{ admin: AdminClient; adminId: string }> {
  const own = (await fetchCustomerOrders(customerAccessToken)).find((e) => e.node.id === orderId);
  if (!own) throw new CheckoutError('Order not found', 404);
  const admin = getAdminClient();
  if (!admin) throw new CheckoutError('Order system is not configured', 503);
  // Storefront order IDs carry a `?key=` suffix; the admin API wants the bare ID.
  return { admin, adminId: orderId.split('?')[0] };
}

/** Lock key shared by whole-order and single-item cancels, so they never run at the same time. */
export const cancelLockKey = (adminId: string) => `cancel:${adminId}`;

export async function cancelCustomerOrder(req: CancelRequest): Promise<CancelResult> {
  const staffNote = staffNoteFor(req.reason, req.note);
  if (devSamplesEnabled()) return cancelDevOrder(req.orderId);

  // 1. Only the customer's own orders.
  const { admin, adminId } = await ownedOrder(req.customerAccessToken, req.orderId);
  return withLock(cancelLockKey(adminId), () => cancelOrderLocked(admin, adminId, staffNote, req.reason));
}

/** Cancels the whole order. Call only while holding the order's cancel lock. */
export async function cancelOrderLocked(
  admin: AdminClient,
  adminId: string,
  staffNote: string,
  reason: string
): Promise<CancelResult> {
  // 2. Shopify's current state, not the customer's possibly stale page.
  const data = await admin.request(
    `query CancelCheck($id: ID!) {
      order(id: $id) { id name cancelledAt displayFulfillmentStatus displayFinancialStatus tags }
    }`,
    { id: adminId }
  );
  const order = data?.order;
  if (!order) throw new CheckoutError('Order not found', 404);

  const paymentId = paymentIdFromTags(order.tags);
  const paidOnline = !!paymentId && order.displayFinancialStatus !== 'PENDING';

  if (order.cancelledAt) {
    // Already cancelled (e.g. a second click, or by staff). Retry a refund that failed earlier.
    const refund = paidOnline ? await refundPayment(paymentId!, order.name, reason) : { outcome: 'none' as const };
    return { orderNumber: order.name, refund: refund.outcome, refundAmount: refund.amount };
  }
  if (!canCustomerCancel({ fulfillmentStatus: order.displayFulfillmentStatus })) {
    throw new CheckoutError(NOT_CANCELLABLE, 409);
  }

  // 3. Cancel in Shopify. For a paid order Shopify also records the refund against the
  //    order's own (manual) payment record; the money itself moves through Razorpay below.
  const variables: Record<string, unknown> = {
    orderId: adminId,
    reason: 'CUSTOMER',
    restock: true,
    notifyCustomer: true,
    staffNote,
  };
  if (paidOnline) variables.refundMethod = { originalPaymentMethodsRefund: true };

  const result = await admin.request(
    `mutation CancelOrder($orderId: ID!, $reason: OrderCancelReason!, $restock: Boolean!, $notifyCustomer: Boolean, $staffNote: String, $refundMethod: OrderCancelRefundMethodInput) {
      orderCancel(orderId: $orderId, reason: $reason, restock: $restock, notifyCustomer: $notifyCustomer, staffNote: $staffNote, refundMethod: $refundMethod) {
        job { id }
        orderCancelUserErrors { code field message }
      }
    }`,
    variables
  );
  const errors: Array<{ message?: string }> = result?.orderCancel?.orderCancelUserErrors || [];
  if (errors.length > 0 || !result?.orderCancel?.job) {
    console.error('[cancel] orderCancel failed:', errors.map((e) => e.message).join('; ') || 'no job returned');
    throw new CheckoutError('We could not cancel your order right now. Please try again or contact support.', 502);
  }

  // 4. Refund online payments.
  const refund = paidOnline ? await refundPayment(paymentId!, order.name, reason) : { outcome: 'none' as const };
  return { orderNumber: order.name, refund: refund.outcome, refundAmount: refund.amount };
}

export function paymentIdFromTags(tags: unknown): string | null {
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
  const tag = list.map((t) => String(t).trim()).find((t) => t.startsWith('rzp-'));
  return tag ? tag.slice(4) : null;
}

/**
 * Refunds a Razorpay payment: `amountPaise` if given (never more than is left), otherwise
 * whatever is left. Never throws: failures are logged for staff to refund by hand.
 */
export async function refundPayment(
  paymentId: string,
  orderName: string,
  reason: string,
  amountPaise?: number
): Promise<{ outcome: RefundOutcome; amount?: number }> {
  try {
    const { client } = getRazorpay();
    const payment = await client.payments.fetch(paymentId);
    const left = Number(payment.amount) - Number(payment.amount_refunded || 0);
    if (left <= 0) return { outcome: 'already_refunded' };
    const remaining = amountPaise === undefined ? left : Math.min(left, Math.round(amountPaise));
    if (remaining <= 0) return { outcome: 'none' };
    if (payment.status !== 'captured') {
      throw new Error(`payment is ${payment.status}, not captured`);
    }
    await client.payments.refund(paymentId, {
      amount: remaining,
      speed: 'normal',
      notes: { shopify_order: orderName, reason: cancelReasonLabel(reason) || reason },
    });
    return { outcome: 'started', amount: remaining / 100 };
  } catch (error) {
    console.error(
      `[cancel] REFUND NEEDS MANUAL ACTION: order ${orderName}, Razorpay payment ${paymentId}:`,
      error instanceof Error ? error.message : error
    );
    return { outcome: 'manual' };
  }
}

/** Development without Shopify: cancels a test order placed in this browser. */
async function cancelDevOrder(orderId: string): Promise<CancelResult> {
  const cookieStore = await cookies();
  let orders: Array<{ node: Record<string, unknown> }> = [];
  try {
    orders = JSON.parse(cookieStore.get('mock_orders')?.value || '[]');
  } catch {}
  const order = orders.find((o) => o.node.id === orderId)?.node;
  if (!order) throw new CheckoutError('Order not found', 404);
  const orderNumber = String(order.orderNumber);
  if (order.cancelledAt) return { orderNumber, refund: 'none' };
  const paid = order.status !== 'Pending COD';
  order.status = 'CANCELLED';
  order.cancelledAt = new Date().toISOString();
  cookieStore.set('mock_orders', JSON.stringify(orders), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });
  const amount = Number((order.totalPrice as { amount?: string } | undefined)?.amount || 0);
  return paid ? { orderNumber, refund: 'started', refundAmount: amount } : { orderNumber, refund: 'none' };
}
