// app/api/checkout/route.ts
//
// Checkout flow. Every amount is worked out on the server from the Shopify cart:
// the browser only sends the cart ID, the shipping details and (for online
// payments) the Razorpay payment reference.
//
//   action "create" -> creates a Razorpay order for the server-side cart total and
//                      stores the cart ID and shipping details on it
//   action "verify" -> the browser's confirmation after paying: checks the Razorpay
//                      signature, then creates the paid Shopify order
//   action "cod"    -> creates a Shopify order marked payment pending
//
// The Razorpay webhook (/api/webhooks/razorpay) creates the same paid order if the
// browser never reports back after paying; either path results in exactly one order.
import { NextResponse, NextRequest } from 'next/server';
import { CartError, loadServerCart } from '@/lib/checkout/serverCart';
import { CheckoutError, readShipping, verifySignature } from '@/lib/checkout/validation';
import { confirmOrderTotal, createShopifyOrder, recordDevOrder } from '@/lib/checkout/orders';
import { fulfillPaidOrder, getRazorpay, orderNotes, PaymentNeedsReviewError } from '@/lib/checkout/razorpay';
import { LockBusyError } from '@/lib/checkout/lock';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'create') {
      const shipping = readShipping(body);
      const cart = await loadServerCart(body.cartId);
      const { client, keyId } = getRazorpay();
      // Shopify must agree on the total (including discounts) before we charge it.
      await confirmOrderTotal(cart);
      const razorpayOrder = await client.orders.create({
        amount: cart.totalMinor,
        currency: cart.currency,
        receipt: `rcpt_${Date.now()}`,
        notes: orderNotes(cart.id, shipping),
      });
      return NextResponse.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId,
      });
    }

    if (action === 'verify') {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        throw new CheckoutError('Missing payment verification details');
      }
      const { keySecret } = getRazorpay();
      if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret)) {
        throw new CheckoutError('Payment verification failed');
      }

      // Uses the cart and shipping details stored on the Razorpay order, not the request.
      const order =
        (await fulfillPaidOrder(razorpay_order_id, razorpay_payment_id)) ??
        (await recordDevOrder(await loadServerCart(body.cartId), readShipping(body), 'In Transit'));
      return NextResponse.json({ success: true, orderId: order.id, orderNumber: order.name, shopifyOrderId: order.id });
    }

    if (action === 'cod') {
      const shipping = readShipping(body);
      const cart = await loadServerCart(body.cartId);
      await confirmOrderTotal(cart);
      const order =
        (await createShopifyOrder(cart, shipping, { paid: false })) ??
        (await recordDevOrder(cart, shipping, 'Pending COD'));
      return NextResponse.json({ success: true, orderId: order.id, orderNumber: order.name, shopifyOrderId: order.id });
    }

    throw new CheckoutError('Unknown checkout action');
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { success: false, error: error.message, ...(error.field ? { field: error.field } : {}) },
        { status: error.status }
      );
    }
    if (error instanceof PaymentNeedsReviewError) {
      console.error('[checkout] PAYMENT NEEDS MANUAL REVIEW:', error.message);
      return NextResponse.json(
        { success: false, error: "We received your payment but couldn't confirm your order automatically. Our team will contact you shortly." },
        { status: 409 }
      );
    }
    if (error instanceof LockBusyError) {
      return NextResponse.json({ success: false, error: 'Your order is still being confirmed. Please check your orders in a minute.' }, { status: 503 });
    }
    if (error instanceof CartError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('[checkout] unexpected error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Checkout failed. Please try again.' }, { status: 500 });
  }
}
