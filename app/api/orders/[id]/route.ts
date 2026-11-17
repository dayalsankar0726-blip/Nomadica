// app/api/orders/[id]/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CustomerAuthError, fetchCustomerOrders } from '@/lib/shopify/customerOrders';
import { mockOrderEdges, devSamplesEnabled } from '@/lib/devMocks';

/** Returns one of the signed-in customer's own orders, by order ID or order number. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const customerAccessToken = cookieStore.get('customer_access_token')?.value;

  if (!customerAccessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const matches = (edge: any) => {
    const node = edge.node;
    const number = String(node.orderNumber || '').replace(/^#|^NMD-/, '');
    return node.id === id || node.orderNumber === id || number === id.replace(/^#|^NMD-/, '');
  };

  try {
    const edges = devSamplesEnabled() ? mockOrderEdges() : await fetchCustomerOrders(customerAccessToken);
    const found = edges.find(matches);
    if (!found) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ order: found.node });
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.error('[orders/id] failed to load order:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not load order' }, { status: 502 });
  }
}
