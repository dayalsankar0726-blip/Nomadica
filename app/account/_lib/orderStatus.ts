// app/account/_lib/orderStatus.ts
//
// What to call an order's state, from Shopify's own fulfilment and payment statuses.
// Every Shopify value is mapped explicitly; nothing is guessed from dates.
//
// Shopify's Storefront API has no delivery status, so an order is only "Delivered"
// when we are given a real delivery signal. Otherwise a shipped order stays "Shipped".

export type OrderStage = 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';

export const STAGE_LABELS: Record<OrderStage, string> = {
  PLACED: 'Order placed',
  PACKED: 'Being packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
};

/** Filter options on My Orders, in display order. */
export const STAGE_FILTERS: OrderStage[] = ['PLACED', 'PACKED', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'];

export interface OrderStatusInput {
  cancelledAt?: string | null;
  fulfillmentStatus?: string | null;
  financialStatus?: string | null;
  /** True only with a real delivery signal (e.g. a carrier delivery event). */
  delivered?: boolean;
  /** Development sample orders carry a plain status word instead of Shopify statuses. */
  sampleStatus?: string | null;
}

export interface OrderStatus {
  stage: OrderStage;
  label: string;
  /** One line explaining where the order is, without dates we don't have. */
  detail: string;
  /** True when only some items have shipped. */
  partial: boolean;
}

const FULFILLMENT_STAGE: Record<string, OrderStage> = {
  UNFULFILLED: 'PLACED',
  OPEN: 'PLACED',
  SCHEDULED: 'PLACED',
  ON_HOLD: 'PLACED',
  PENDING_FULFILLMENT: 'PACKED',
  IN_PROGRESS: 'PACKED',
  PARTIALLY_FULFILLED: 'SHIPPED',
  FULFILLED: 'SHIPPED',
  RESTOCKED: 'RETURNED',
};

function sampleStage(status: string): OrderStage {
  const s = status.trim().toUpperCase();
  if (s === 'DELIVERED') return 'DELIVERED';
  if (s === 'IN TRANSIT' || s === 'SHIPPED') return 'SHIPPED';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED';
  if (s === 'RETURNED') return 'RETURNED';
  return 'PLACED';
}

export function orderStatus(input: OrderStatusInput): OrderStatus {
  const fulfillment = String(input.fulfillmentStatus || '').toUpperCase();
  const financial = String(input.financialStatus || '').toUpperCase();
  let stage: OrderStage;
  if (input.cancelledAt) stage = 'CANCELLED';
  else if (!fulfillment && input.sampleStatus) stage = sampleStage(input.sampleStatus);
  else stage = FULFILLMENT_STAGE[fulfillment] ?? 'PLACED';

  if (stage === 'SHIPPED' && input.delivered) stage = 'DELIVERED';
  const partial = stage === 'SHIPPED' && fulfillment === 'PARTIALLY_FULFILLED';
  const refunded = financial === 'REFUNDED';

  let detail: string;
  switch (stage) {
    case 'PLACED':
      detail = fulfillment === 'ON_HOLD' ? 'On hold. We will email you if we need anything.' : "We've received your order and will pack it soon.";
      break;
    case 'PACKED':
      detail = "We're packing your order. You'll get tracking details once it ships.";
      break;
    case 'SHIPPED':
      detail = partial ? 'Some items have shipped. The rest will follow.' : 'Your order is on its way.';
      break;
    case 'DELIVERED':
      detail = 'Your order has been delivered.';
      break;
    case 'RETURNED':
      detail = refunded ? 'Returned and refunded.' : 'Items were returned to us.';
      break;
    default:
      detail = refunded ? 'Cancelled and refunded.' : 'This order was cancelled.';
  }

  return { stage, label: partial ? 'Partly shipped' : STAGE_LABELS[stage], detail, partial };
}

/** How the order was paid, from Shopify's financial status (checkout offers online payment or cash on delivery). */
export function paymentLabel(financialStatus?: string | null): string | null {
  switch (String(financialStatus || '').toUpperCase()) {
    case 'PAID':
      return 'Paid online';
    case 'PARTIALLY_PAID':
      return 'Partly paid';
    case 'PENDING':
    case 'AUTHORIZED':
      return 'Cash on delivery';
    case 'REFUNDED':
      return 'Refunded';
    case 'PARTIALLY_REFUNDED':
      return 'Paid online, partly refunded';
    case 'VOIDED':
      return 'Payment voided';
    default:
      return null;
  }
}

/** Steps for the order timeline, with how far the order has got. Cancelled/returned orders have no steps. */
export function timelineSteps(stage: OrderStage): Array<{ stage: OrderStage; label: string; done: boolean; current: boolean }> {
  const steps: OrderStage[] = ['PLACED', 'PACKED', 'SHIPPED', 'DELIVERED'];
  const reached = steps.indexOf(stage);
  if (reached === -1) return [];
  return steps.map((s, i) => ({ stage: s, label: STAGE_LABELS[s], done: i <= reached, current: i === reached }));
}

/** Whether a "Request a return" option makes sense: the order has shipped and wasn't cancelled. */
export function canRequestReturn(stage: OrderStage, partial: boolean): boolean {
  return (stage === 'SHIPPED' && !partial) || stage === 'DELIVERED';
}

/** Units still on the order (cancelled units excluded). */
export function unitsRemaining(items: Array<{ quantity: number }>): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.quantity || 0), 0);
}
