// lib/checkout/cancelOrderItem.ts
//
// Lets a signed-in customer cancel one item (or some of its quantity) from their own
// order before it is packed or shipped. The rest of the order carries on as normal.
//  1. The order must be in the customer's own order list (checked with their token).
//  2. Shopify's current status is re-checked: not cancelled, nothing packed or shipped,
//     and the item still has that many left.
//  3. If that would leave the order empty, the whole order is cancelled instead (which
//     also refunds shipping).
//  4. Otherwise Shopify's order editing removes the item, puts it back in stock and emails
//     the customer the updated order. A cash-on-delivery total simply goes down.
//  5. For orders paid online, the price paid for the item (after discounts) is refunded
//     through Razorpay and the refund is recorded on the Shopify order.
import { cookies } from 'next/headers';
import { withLock } from '@/lib/checkout/lock';
import { CheckoutError } from '@/lib/checkout/validation';
import { devSamplesEnabled } from '@/lib/devMocks';
import {
  AdminClient,
  NOT_CANCELLABLE,
  cancelLockKey,
  cancelOrderLocked,
  ownedOrder,
  paymentIdFromTags,
  refundPayment,
  staffNoteFor,
} from '@/lib/checkout/cancelOrder';
import { ItemCancelResult, canCustomerCancel } from '@/lib/orders/cancellation';

export interface CancelItemRequest {
  customerAccessToken: string;
  orderId: string;
  /** The item's ID as the My Orders page has it (its product variant ID). */
  itemId: string;
  quantity: number;
  reason: string;
  note?: string;
}

interface AdminLineItem {
  id: string;
  title: string;
  currentQuantity: number;
  variant?: { id?: string } | null;
  discountedUnitPriceAfterAllDiscountsSet?: { shopMoney?: { amount?: string } };
}

const ALREADY_GONE = 'This item has already been cancelled. Please refresh the page.';

export async function cancelCustomerOrderItem(req: CancelItemRequest): Promise<ItemCancelResult> {
  const staffNote = staffNoteFor(req.reason, req.note);
  if (!Number.isInteger(req.quantity) || req.quantity < 1) {
    throw new CheckoutError('Please choose how many to cancel', 400);
  }
  if (!req.itemId) throw new CheckoutError('Item not found', 404);
  if (devSamplesEnabled()) return cancelDevItem(req);

  const { admin, adminId } = await ownedOrder(req.customerAccessToken, req.orderId);
  return withLock(cancelLockKey(adminId), () => cancelItemLocked(admin, adminId, req, staffNote));
}

async function cancelItemLocked(
  admin: AdminClient,
  adminId: string,
  req: CancelItemRequest,
  staffNote: string
): Promise<ItemCancelResult> {
  const data = await admin.request(
    `query CancelItemCheck($id: ID!) {
      order(id: $id) {
        id name cancelledAt displayFulfillmentStatus displayFinancialStatus tags
        lineItems(first: 50) {
          nodes {
            id title currentQuantity
            variant { id }
            discountedUnitPriceAfterAllDiscountsSet { shopMoney { amount } }
          }
        }
      }
    }`,
    { id: adminId }
  );
  const order = data?.order;
  if (!order) throw new CheckoutError('Order not found', 404);
  if (order.cancelledAt) throw new CheckoutError('This order has already been cancelled. Please refresh the page.', 409);
  if (!canCustomerCancel({ fulfillmentStatus: order.displayFulfillmentStatus })) {
    throw new CheckoutError(NOT_CANCELLABLE, 409);
  }

  const lines: AdminLineItem[] = order.lineItems?.nodes || [];
  const line = lines.find((l) => l.variant?.id === req.itemId);
  if (!line) throw new CheckoutError('Item not found', 404);
  if (line.currentQuantity <= 0) throw new CheckoutError(ALREADY_GONE, 409);
  if (req.quantity > line.currentQuantity) {
    throw new CheckoutError(`Only ${line.currentQuantity} of this item ${line.currentQuantity === 1 ? 'is' : 'are'} left to cancel.`, 400);
  }

  // Nothing would be left: cancel the whole order instead, so shipping is refunded too.
  const unitsLeft = lines.reduce((sum, l) => sum + Math.max(0, l.currentQuantity), 0);
  if (unitsLeft - req.quantity <= 0) {
    const result = await cancelOrderLocked(admin, adminId, staffNote, req.reason);
    return { ...result, itemTitle: line.title, quantity: req.quantity, remainingQuantity: 0, orderCancelled: true };
  }

  const itemLabel = `${req.quantity} × ${line.title}`;
  await removeLineItem(admin, adminId, line, line.currentQuantity - req.quantity, `${itemLabel} cancelled. ${staffNote}`);

  // Refund what the customer paid for these units, after discounts.
  const paymentId = paymentIdFromTags(order.tags);
  const paidOnline = !!paymentId && order.displayFinancialStatus !== 'PENDING';
  const unitPrice = parseFloat(line.discountedUnitPriceAfterAllDiscountsSet?.shopMoney?.amount || '0');
  const amountPaise = Math.round(unitPrice * 100) * req.quantity;

  let refund: { outcome: ItemCancelResult['refund']; amount?: number } = { outcome: 'none' };
  if (paidOnline && amountPaise > 0) {
    refund = await refundPayment(paymentId!, order.name, req.reason, amountPaise);
    if (refund.outcome === 'started' && refund.amount) {
      await recordShopifyRefund(admin, adminId, refund.amount, `Razorpay refund for ${itemLabel}, cancelled by the customer.`);
    }
  }

  return {
    orderNumber: order.name,
    refund: refund.outcome,
    refundAmount: refund.amount,
    itemTitle: line.title,
    quantity: req.quantity,
    remainingQuantity: line.currentQuantity - req.quantity,
    orderCancelled: false,
  };
}

/** Uses Shopify order editing to set a line item's quantity, restocking the removed units. */
async function removeLineItem(admin: AdminClient, adminId: string, line: AdminLineItem, newQuantity: number, staffNote: string) {
  const fail = (step: string, errors?: Array<{ message?: string }>) => {
    console.error(`[cancel-item] ${step} failed:`, errors?.map((e) => e.message).join('; ') || 'no result');
    throw new CheckoutError('We could not cancel this item right now. Please try again or contact support.', 502);
  };

  const begin = await admin.request(
    `mutation CancelItemBegin($id: ID!) {
      orderEditBegin(id: $id) {
        calculatedOrder { id lineItems(first: 50) { nodes { id variant { id } } } }
        userErrors { field message }
      }
    }`,
    { id: adminId }
  );
  const calculated = begin?.orderEditBegin?.calculatedOrder;
  if (!calculated?.id || begin.orderEditBegin.userErrors?.length) fail('orderEditBegin', begin?.orderEditBegin?.userErrors);
  const calculatedLine = (calculated.lineItems?.nodes || []).find(
    (l: { id: string; variant?: { id?: string } | null }) => l.variant?.id === line.variant?.id
  );
  if (!calculatedLine) fail('finding the item in the order edit');

  const set = await admin.request(
    `mutation CancelItemSetQuantity($id: ID!, $lineItemId: ID!, $quantity: Int!) {
      orderEditSetQuantity(id: $id, lineItemId: $lineItemId, quantity: $quantity, restock: true) {
        calculatedOrder { id }
        userErrors { field message }
      }
    }`,
    { id: calculated.id, lineItemId: calculatedLine.id, quantity: newQuantity }
  );
  if (!set?.orderEditSetQuantity?.calculatedOrder || set.orderEditSetQuantity.userErrors?.length) {
    fail('orderEditSetQuantity', set?.orderEditSetQuantity?.userErrors);
  }

  const commit = await admin.request(
    `mutation CancelItemCommit($id: ID!, $staffNote: String) {
      orderEditCommit(id: $id, notifyCustomer: true, staffNote: $staffNote) {
        order { id }
        userErrors { field message }
      }
    }`,
    { id: calculated.id, staffNote }
  );
  if (!commit?.orderEditCommit?.order || commit.orderEditCommit.userErrors?.length) {
    fail('orderEditCommit', commit?.orderEditCommit?.userErrors);
  }
}

/**
 * Records the Razorpay refund on the Shopify order so its balance is right. No money moves
 * here: the order's payment was recorded manually, so Shopify only logs the refund.
 * Best effort: a failure is logged for staff and never undoes the cancel.
 */
async function recordShopifyRefund(admin: AdminClient, adminId: string, amount: number, note: string) {
  try {
    const data = await admin.request(
      `query CancelItemPayment($id: ID!) {
        order(id: $id) { transactions(first: 20) { id kind status gateway } }
      }`,
      { id: adminId }
    );
    const sale = (data?.order?.transactions || []).find(
      (t: { kind: string; status: string }) => (t.kind === 'SALE' || t.kind === 'CAPTURE') && t.status === 'SUCCESS'
    );
    if (!sale) throw new Error('no successful payment transaction on the order');
    const result = await admin.request(
      `mutation CancelItemRefund($input: RefundInput!) {
        refundCreate(input: $input) { refund { id } userErrors { field message } }
      }`,
      {
        input: {
          orderId: adminId,
          note,
          notify: false,
          transactions: [{ orderId: adminId, parentId: sale.id, gateway: sale.gateway, kind: 'REFUND', amount: amount.toFixed(2) }],
        },
      }
    );
    const errors: Array<{ message?: string }> = result?.refundCreate?.userErrors || [];
    if (errors.length || !result?.refundCreate?.refund) throw new Error(errors.map((e) => e.message).join('; ') || 'no refund returned');
  } catch (error) {
    console.error(
      `[cancel-item] Razorpay refund of ₹${amount} started, but recording it on Shopify order ${adminId} failed. Please mark it refunded by hand:`,
      error instanceof Error ? error.message : error
    );
  }
}

/** Development without Shopify: cancels an item from a test order placed in this browser. */
async function cancelDevItem(req: CancelItemRequest): Promise<ItemCancelResult> {
  const cookieStore = await cookies();
  let orders: Array<{ node: Record<string, unknown> }> = [];
  try {
    orders = JSON.parse(cookieStore.get('mock_orders')?.value || '[]');
  } catch {}
  const order = orders.find((o) => o.node.id === req.orderId)?.node;
  if (!order) throw new CheckoutError('Order not found', 404);
  if (order.cancelledAt) throw new CheckoutError('This order has already been cancelled. Please refresh the page.', 409);

  type DevLine = { node: { id: string; title: string; quantity: number; cancelledQuantity?: number; variant?: { price?: { amount?: string } } } };
  const lines = ((order.lineItems as { edges?: DevLine[] })?.edges || []).map((e) => e.node);
  const line = lines.find((l) => l.id === req.itemId);
  if (!line) throw new CheckoutError('Item not found', 404);
  if (line.quantity <= 0) throw new CheckoutError(ALREADY_GONE, 409);
  if (req.quantity > line.quantity) throw new CheckoutError(`Only ${line.quantity} of this item left to cancel.`, 400);

  const orderNumber = String(order.orderNumber);
  const paid = order.status !== 'Pending COD';
  const unitsLeft = lines.reduce((sum, l) => sum + l.quantity, 0) - req.quantity;
  const amount = parseFloat(line.variant?.price?.amount || '0') * req.quantity;

  line.quantity -= req.quantity;
  line.cancelledQuantity = (line.cancelledQuantity || 0) + req.quantity;
  const total = order.totalPrice as { amount?: string } | undefined;
  if (unitsLeft <= 0) {
    order.status = 'CANCELLED';
    order.cancelledAt = new Date().toISOString();
  } else if (total) {
    total.amount = Math.max(0, parseFloat(total.amount || '0') - amount).toFixed(2);
  }
  cookieStore.set('mock_orders', JSON.stringify(orders), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });

  const refundAmount = unitsLeft <= 0 ? parseFloat(total?.amount || '0') : amount;
  return {
    orderNumber,
    refund: paid ? 'started' : 'none',
    refundAmount: paid ? refundAmount : undefined,
    itemTitle: line.title,
    quantity: req.quantity,
    remainingQuantity: line.quantity,
    orderCancelled: unitsLeft <= 0,
  };
}
