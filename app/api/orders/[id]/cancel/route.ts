// app/api/orders/[id]/cancel/route.ts
//
// POST { reason, note? } cancels one of the signed-in customer's own orders, if it
// hasn't been packed or shipped. Orders paid online are refunded through Razorpay.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cancelCustomerOrder } from '@/lib/checkout/cancelOrder';
import { LockBusyError } from '@/lib/checkout/lock';
import { CheckoutError } from '@/lib/checkout/validation';
import { CustomerAuthError } from '@/lib/shopify/customerOrders';
import { cancelledMessage } from '@/lib/orders/cancellation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // Shopify order IDs contain '/' and '?', so the page sends them URL-encoded.
  const id = rawId.includes('%') ? decodeURIComponent(rawId) : rawId;
  const cookieStore = await cookies();
  const customerAccessToken = cookieStore.get('customer_access_token')?.value;
  if (!customerAccessToken) {
    return NextResponse.json({ error: 'Please sign in again to cancel this order.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason : '';
  const note = typeof body?.note === 'string' ? body.note : undefined;

  try {
    const result = await cancelCustomerOrder({ customerAccessToken, orderId: id, reason, note });
    return NextResponse.json({ success: true, ...result, message: cancelledMessage(result) });
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      return NextResponse.json({ error: 'Please sign in again to cancel this order.' }, { status: 401 });
    }
    if (error instanceof LockBusyError) {
      return NextResponse.json({ error: 'This order is already being cancelled. Please refresh in a moment.' }, { status: 409 });
    }
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[orders/cancel] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'We could not cancel your order right now. Please try again or contact support.' }, { status: 502 });
  }
}
