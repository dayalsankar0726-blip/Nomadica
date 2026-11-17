// app/order-tracking/trackingStatus.ts
//
// Turns the order returned by /api/orders/track into what the tracking page shows:
// a status word, the Placed → Packed → Shipped → Delivered steps, payment wording and
// items grouped by parcel. Uses only real status fields; nothing is guessed.
// Client-safe: no server imports.

export interface TrackedShipment {
  id: string;
  status?: string | null;
  displayStatus?: string | null;
  createdAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  estimatedDeliveryAt?: string | null;
  tracking?: Array<{ number?: string | null; company?: string | null; url?: string | null }>;
  items?: Array<{ lineItemId: string; quantity: number }>;
}

export interface TrackedOrder {
  orderNumber: string;
  createdAt: string;
  cancelledAt?: string | null;
  /** Shopify displayFulfillmentStatus (or the development sample's status). */
  fulfillmentStatus?: string | null;
  financialStatus?: string | null;
  paymentMethod?: 'cod' | 'online' | null;
  /** Development sample orders only. */
  status?: string | null;
  shipments?: TrackedShipment[];
}

export type StepKey = 'placed' | 'packed' | 'shipped' | 'delivered';

export interface TrackingStep {
  key: StepKey;
  label: string;
  done: boolean;
  date: string | null;
}

export interface TrackingState {
  cancelled: boolean;
  label: string;
  steps: TrackingStep[];
  shipped: boolean;
  delivered: boolean;
}

const up = (v: string | null | undefined) => String(v ?? '').trim().toUpperCase();

const earliest = (dates: Array<string | null | undefined>): string | null =>
  dates.filter((d): d is string => !!d).sort()[0] ?? null;
const latest = (dates: Array<string | null | undefined>): string | null =>
  dates.filter((d): d is string => !!d).sort().pop() ?? null;

export function trackingState(order: TrackedOrder): TrackingState {
  const fs = up(order.fulfillmentStatus);
  const st = up(order.status);
  const shipments = order.shipments ?? [];
  const isDelivered = (s: TrackedShipment) => up(s.displayStatus) === 'DELIVERED' || !!s.deliveredAt;

  const cancelled = !!order.cancelledAt || st === 'CANCELLED';
  const delivered =
    st === 'DELIVERED' || (fs === 'FULFILLED' && shipments.length > 0 && shipments.every(isDelivered));
  const shipped =
    delivered ||
    fs === 'FULFILLED' ||
    fs === 'PARTIALLY_FULFILLED' ||
    shipments.length > 0 ||
    st === 'SHIPPED' ||
    st === 'IN TRANSIT' ||
    st === 'IN_TRANSIT';
  const packed = shipped || fs === 'IN_PROGRESS' || fs === 'PENDING_FULFILLMENT';

  let label = 'Order placed';
  if (cancelled) label = 'Cancelled';
  else if (delivered) label = 'Delivered';
  else if (fs === 'PARTIALLY_FULFILLED') label = 'Partly shipped';
  else if (shipped) label = 'Shipped';
  else if (packed) label = 'Being packed';
  else if (fs === 'ON_HOLD') label = 'On hold';

  const steps: TrackingStep[] = [
    { key: 'placed', label: 'Placed', done: true, date: order.createdAt || null },
    { key: 'packed', label: 'Packed', done: packed, date: null },
    { key: 'shipped', label: 'Shipped', done: shipped, date: earliest(shipments.map((s) => s.createdAt)) },
    { key: 'delivered', label: 'Delivered', done: delivered, date: delivered ? latest(shipments.map((s) => s.deliveredAt)) : null },
  ];

  return { cancelled, label, steps, shipped, delivered };
}

export interface PaymentSummary {
  method: string | null;
  status: string | null;
}

/** How the order was paid, and where the payment stands. */
export function paymentSummary(order: TrackedOrder): PaymentSummary {
  const fin = up(order.financialStatus);
  const cod = order.paymentMethod === 'cod' || up(order.status) === 'PENDING COD';
  const method = cod ? 'Cash on delivery' : order.paymentMethod === 'online' ? 'Paid online (Razorpay)' : null;

  const statuses: Record<string, string> = {
    PAID: 'Paid',
    REFUNDED: 'Refunded',
    PARTIALLY_REFUNDED: 'Partly refunded',
    PARTIALLY_PAID: 'Partly paid',
    AUTHORIZED: 'Authorised',
    VOIDED: 'Cancelled',
  };
  let status = statuses[fin] ?? null;
  if (!status && (fin === 'PENDING' || cod)) status = cod ? 'To pay on delivery' : 'Payment pending';
  return { method, status };
}

export interface ParcelGroup<T> {
  /** null for items not shipped yet. */
  shipment: TrackedShipment | null;
  items: Array<{ item: T; quantity: number }>;
}

/** Items grouped by the parcel they shipped in; anything not yet shipped is grouped last. */
export function groupByParcel<T extends { id: string; quantity: number }>(items: T[], shipments: TrackedShipment[] = []): ParcelGroup<T>[] {
  const remaining = new Map(items.map((i) => [i.id, i.quantity]));
  const byId = new Map(items.map((i) => [i.id, i]));
  const groups: ParcelGroup<T>[] = [];
  for (const shipment of shipments) {
    const group: ParcelGroup<T> = { shipment, items: [] };
    for (const entry of shipment.items ?? []) {
      const item = byId.get(entry.lineItemId);
      if (!item || entry.quantity <= 0) continue;
      group.items.push({ item, quantity: entry.quantity });
      remaining.set(item.id, Math.max((remaining.get(item.id) ?? 0) - entry.quantity, 0));
    }
    if (group.items.length > 0 || (shipment.tracking ?? []).some((t) => t.number || t.url)) groups.push(group);
  }
  const unshipped = items.filter((i) => (remaining.get(i.id) ?? 0) > 0).map((item) => ({ item, quantity: remaining.get(item.id)! }));
  if (unshipped.length > 0) groups.push({ shipment: null, items: unshipped });
  return groups;
}
