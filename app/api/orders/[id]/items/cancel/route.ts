// app/api/orders/[id]/items/cancel/route.ts
//
// POST { itemId, quantity, reason, note? } cancels one item (or some of its quantity)
// from one of the signed-in customer's own orders, if the order hasn't been packed or
// shipped. Orders paid online are refunded for that item through Razorpay.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cancelCustomerOrderItem } from '@/lib/checkout/cancelOrderItem';
import { LockBusyError } from '@/lib/checkout/lock';
import { CheckoutError } from '@/lib/checkout/validation';
import { CustomerAuthError } from '@/lib/shopify/customerOrders';
import { itemCancelledMessage } from '@/lib/orders/cancellation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // Shopify order IDs contain '/' and '?', so the page sends them URL-encoded.
  const id = rawId.includes('%') ? decodeURIComponent(rawId) : rawId;
  const cookieStore = await cookies();
  const customerAccessToken = cookieStore.get('customer_access_token')?.value;
  if (!customerAccessToken) {
    return NextResponse.json({ error: 'Please sign in again to cancel this item.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const itemId = typeof body?.itemId === 'string' ? body.itemId : '';
  const quantity = typeof body?.quantity === 'number' ? body.quantity : NaN;
  const reason = typeof body?.reason === 'string' ? body.reason : '';
  const note = typeof body?.note === 'string' ? body.note : undefined;

  try {
    const result = await cancelCustomerOrderItem({ customerAccessToken, orderId: id, itemId, quantity, reason, note });
    return NextResponse.json({ success: true, ...result, message: itemCancelledMessage(result) });
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      return NextResponse.json({ error: 'Please sign in again to cancel this item.' }, { status: 401 });
    }
    if (error instanceof LockBusyError) {
      return NextResponse.json({ error: 'This order is already being changed. Please refresh in a moment.' }, { status: 409 });
    }
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[orders/cancel-item] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'We could not cancel this item right now. Please try again or contact support.' }, { status: 502 });
  }
}
