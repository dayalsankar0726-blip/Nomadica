// app/api/webhooks/razorpay/route.ts
//
// Razorpay webhook. Razorpay calls this server-to-server when a payment succeeds, so a
// Shopify order is created even if the customer closes the tab or loses connection
// before their browser confirms the payment.
//
// Setup (Razorpay dashboard > Settings > Webhooks):
//   URL:     https://<your-domain>/api/webhooks/razorpay
//   Secret:  same value as RAZORPAY_WEBHOOK_SECRET
//   Events:  payment.captured, order.paid
//
// Responses: 200 when handled or deliberately ignored; 400 for a bad signature;
// 5xx for temporary failures, which Razorpay retries.
import { NextResponse } from 'next/server';
import { verifyWebhookSignature, CheckoutError } from '@/lib/checkout/validation';
import { fulfillPaidOrder, PaymentNeedsReviewError } from '@/lib/checkout/razorpay';

const HANDLED_EVENTS = new Set(['payment.captured', 'order.paid']);

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get('x-razorpay-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event?.event ?? '')) {
    return NextResponse.json({ status: 'ignored', event: event?.event ?? null });
  }

  const payment = event?.payload?.payment?.entity;
  const razorpayOrderId: string | undefined = payment?.order_id || event?.payload?.order?.entity?.id;
  const paymentId: string | undefined = payment?.id;
  if (!razorpayOrderId || !paymentId) {
    // Payments not created through our checkout (e.g. payment links) have no order.
    return NextResponse.json({ status: 'ignored', reason: 'no order or payment id' });
  }

  try {
    const order = await fulfillPaidOrder(razorpayOrderId, paymentId);
    return NextResponse.json({ status: 'ok', order: order?.name ?? null });
  } catch (error) {
    if (error instanceof PaymentNeedsReviewError) {
      // Money was taken but the order can't be created automatically. Don't retry:
      // staff must handle it from this log line and the Razorpay dashboard.
      console.error(`[razorpay-webhook] PAYMENT NEEDS MANUAL REVIEW: payment ${paymentId}, order ${razorpayOrderId}: ${error.message}`);
      return NextResponse.json({ status: 'needs_review' });
    }
    if (error instanceof CheckoutError && error.status < 500) {
      // e.g. the payment isn't captured yet: nothing to do for this event.
      return NextResponse.json({ status: 'ignored', reason: error.message });
    }
    console.error(`[razorpay-webhook] failed for payment ${paymentId}:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Temporary failure' }, { status: 500 });
  }
}
