// app/api/orders/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CustomerAuthError, fetchCustomerOrders } from '@/lib/shopify/customerOrders';
import { mockOrderEdges, devSamplesEnabled } from '@/lib/devMocks';

/** Lists the signed-in customer's own orders. */
export async function GET() {
  const cookieStore = await cookies();
  const customerAccessToken = cookieStore.get('customer_access_token')?.value;

  if (!customerAccessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Local development without Shopify: sample orders plus any test orders placed in this browser.
  if (devSamplesEnabled()) {
    let devOrders: Array<{ node: Record<string, unknown> }> = [];
    try {
      devOrders = JSON.parse(cookieStore.get('mock_orders')?.value || '[]');
    } catch {}
    // Test orders placed in this browser haven't shipped, so they can be cancelled.
    const placed = devOrders.map(({ node }) => ({
      node: { ...node, canCancel: !node.cancelledAt, isPrepaid: node.status !== 'Pending COD' },
    }));
    return NextResponse.json({ orders: { edges: [...placed, ...mockOrderEdges()] } });
  }

  try {
    const edges = await fetchCustomerOrders(customerAccessToken);
    return NextResponse.json({ orders: { edges } });
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.error('[orders] failed to load customer orders:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not load orders' }, { status: 502 });
  }
}
