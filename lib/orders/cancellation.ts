// lib/orders/cancellation.ts
//
// Rules for customers cancelling their own orders. Shared by the server (which
// enforces them) and the My Orders page (which shows the Cancel order button).
// No server-only imports here.
import { POLICY, SITE } from '@/lib/site';

/** Reasons a customer can pick. The value is stored on the Shopify order's staff note. */
export const CANCEL_REASONS = [
  { value: 'no_longer_needed', label: 'I no longer need it' },
  { value: 'ordered_by_mistake', label: 'I ordered it by mistake' },
  { value: 'change_order', label: 'I want to change the size, colour or address' },
  { value: 'better_price', label: 'I found a better price elsewhere' },
  { value: 'delivery_too_long', label: 'Delivery will take too long' },
  { value: 'other', label: 'Other reason' },
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number]['value'];

export const CANCEL_NOTE_MAX = 500;

export function cancelReasonLabel(value: string): string | null {
  return CANCEL_REASONS.find((r) => r.value === value)?.label ?? null;
}

/**
 * Shopify fulfilment statuses in which nothing has been packed or shipped yet.
 * Anything else (in progress, partly or fully shipped) must go through support as a return.
 */
const CANCELLABLE_FULFILLMENT = new Set(['UNFULFILLED', 'OPEN', 'ON_HOLD', 'SCHEDULED']);

export function canCustomerCancel(order: { cancelledAt?: string | null; fulfillmentStatus?: string | null }): boolean {
  if (order.cancelledAt) return false;
  return CANCELLABLE_FULFILLMENT.has(String(order.fulfillmentStatus || 'UNFULFILLED').toUpperCase());
}

/** What happened to the customer's money when the order was cancelled. */
export type RefundOutcome = 'none' | 'started' | 'already_refunded' | 'manual';

export interface CancelResult {
  orderNumber: string;
  refund: RefundOutcome;
  /** Refund amount in rupees, when a refund was started. */
  refundAmount?: number;
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** The message shown to the customer after cancelling. */
export function cancelledMessage(result: CancelResult): string {
  const base = `Order ${result.orderNumber} has been cancelled.`;
  switch (result.refund) {
    case 'started':
      return `${base} Your refund${result.refundAmount ? ` of ${rupees(result.refundAmount)}` : ''} has been started and usually reaches your original payment method within ${POLICY.refundDays} working days.`;
    case 'already_refunded':
      return `${base} Your payment has already been refunded.`;
    case 'manual':
      return `${base} We couldn't start your refund automatically. Please email ${SITE.supportEmail} with your order number and we will refund you in full.`;
    default:
      return base;
  }
}

/** Result of cancelling one item (or some of its quantity) from an order. */
export interface ItemCancelResult extends CancelResult {
  itemTitle: string;
  /** How many of the item were cancelled. */
  quantity: number;
  /** How many of the item are still on the order. */
  remainingQuantity: number;
  /** True when that was the last item, so the whole order was cancelled. */
  orderCancelled: boolean;
}

/** The message shown to the customer after cancelling an item. */
export function itemCancelledMessage(result: ItemCancelResult): string {
  if (result.orderCancelled) {
    return cancelledMessage(result).replace(
      'has been cancelled.',
      'has been cancelled, as that was the last item in it.'
    );
  }
  const base =
    result.remainingQuantity > 0
      ? `Order ${result.orderNumber} now has ${result.remainingQuantity} × ${result.itemTitle} (was ${result.remainingQuantity + result.quantity}).`
      : `${result.itemTitle} has been removed from order ${result.orderNumber}.`;
  switch (result.refund) {
    case 'started':
      return `${base} Your refund${result.refundAmount ? ` of ${rupees(result.refundAmount)}` : ''} has been started and usually reaches your original payment method within ${POLICY.refundDays} working days.`;
    case 'manual':
      return `${base} We couldn't start your refund automatically. Please email ${SITE.supportEmail} with your order number and we will refund you for this item.`;
    default:
      return `${base} The rest of your order is unchanged.`;
  }
}
