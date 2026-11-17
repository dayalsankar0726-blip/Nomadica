// app/api/customers/orders/[number]/route.ts
//
// GET: full details of one of the signed-in customer's own orders, by order number.
// Only the customer's Storefront token is used, so nobody can read another customer's order.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CustomerAuthError, fetchCustomerOrderDetail, type CustomerOrderDetail } from '@/lib/shopify/customerOrders';
import { devSamplesEnabled, mockOrderEdges } from '@/lib/devMocks';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Development only: a detail record built from the sample orders and test orders placed in this browser. */
function devDetail(cookieValue: string | undefined, wanted: string): { order: CustomerOrderDetail; sampleStatus: string } | null {
  let placed: Array<{ node: any }> = [];
  try {
    placed = JSON.parse(cookieValue || '[]');
  } catch {}
  const edges: Array<{ node: any }> = [...placed, ...mockOrderEdges()];
  const found = edges.find((e) => String(e.node.orderNumber || '').replace(/[^0-9]/g, '') === wanted)?.node;
  if (!found) return null;
  const items = (found.lineItems?.edges || []).map((e: any) => {
    const unit = parseFloat(e.node.variant?.price?.amount || '0') || 0;
    return {
      variantId: e.node.variant?.id || '',
      title: e.node.title,
      variantTitle: e.node.variant?.title || '',
      quantity: e.node.quantity,
      cancelledQuantity: 0,
      paidTotal: (unit * e.node.quantity).toFixed(2),
      paidUnitPrice: unit.toFixed(2),
      image: e.node.variant?.image?.url || undefined,
    };
  });
  const subtotal = items.reduce((s: number, i: { paidTotal: string }) => s + parseFloat(i.paidTotal), 0);
  const total = parseFloat(found.totalPrice?.amount || '0') || subtotal;
  const a = found.shippingAddress;
  const sample = String(found.status || '');
  const order: CustomerOrderDetail = {
    id: found.id,
    orderNumber: found.orderNumber,
    createdAt: found.createdAt,
    cancelledAt: found.cancelledAt ?? null,
    financialStatus: sample === 'Pending COD' ? 'PENDING' : 'PAID',
    fulfillmentStatus: sample === 'Delivered' || sample === 'In Transit' ? 'FULFILLED' : 'UNFULFILLED',
    canCancel: false,
    isPrepaid: sample !== 'Pending COD',
    itemsSubtotal: subtotal.toFixed(2),
    discount: '0.00',
    discountCodes: [],
    shipping: Math.max(0, total - subtotal).toFixed(2),
    tax: '0.00',
    total: total.toFixed(2),
    refunded: '0.00',
    shippingAddress: a
      ? {
          name: [a.firstName, a.lastName].filter(Boolean).join(' ') || a.name || '',
          address1: a.address1 || a.address || '',
          address2: a.address2 || '',
          city: a.city || '',
          province: a.province || a.state || '',
          zip: a.zip || a.pincode || '',
          country: a.country || 'India',
          phone: a.phone || '',
        }
      : null,
    tracking: [],
    lineItems: items,
  };
  return { order, sampleStatus: sample };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function GET(_request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const wanted = decodeURIComponent(number).replace(/[^0-9]/g, '');
  if (!wanted) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const cookieStore = await cookies();
  const token = cookieStore.get('customer_access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (devSamplesEnabled()) {
    const result = devDetail(cookieStore.get('mock_orders')?.value, wanted);
    if (!result) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    // Development samples carry their own status word (e.g. "Delivered").
    return NextResponse.json(result);
  }

  try {
    const order = await fetchCustomerOrderDetail(token, wanted);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof CustomerAuthError) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    console.error('[customers/orders/number] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not load this order' }, { status: 502 });
  }
}
