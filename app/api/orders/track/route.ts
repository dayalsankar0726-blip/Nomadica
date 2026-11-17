// app/api/orders/track/route.ts
import { getAdminClient } from '@/lib/shopify/admin';
import { isDevelopment } from '@/lib/devMocks';
import { MOCK_ORDERS } from '@/utils/mockData';
import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';

type AdminFulfillment = {
  id: string;
  status?: string | null;
  displayStatus?: string | null;
  createdAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  estimatedDeliveryAt?: string | null;
  trackingInfo?: Array<{ number?: string | null; company?: string | null; url?: string | null }>;
  fulfillmentLineItems?: { edges?: Array<{ node?: { quantity?: number; lineItem?: { id?: string } } }> };
};

export async function POST(request: NextRequest) {
  try {
    const { orderNumber, email } = await request.json();

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: 'Missing orderNumber or email' },
        { status: 400 }
      );
    }

    if (typeof orderNumber !== 'string' || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const client = getAdminClient();

    if (client) {
      try {
        // Clean order number for Shopify query
        // Only digits reach the search query, so input can't change the search.
        const cleanNumber = orderNumber.replace(/[^0-9]/g, '');
        if (!cleanNumber) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        const query = `
          query GetOrderByNumber($query: String!) {
            orders(first: 1, query: $query) {
              edges {
                node {
                  id
                  name
                  createdAt
                  email
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  cancelledAt
                  displayFulfillmentStatus
                  displayFinancialStatus
                  tags
                  subtotalPriceSet { shopMoney { amount } }
                  totalShippingPriceSet { shopMoney { amount } }
                  totalDiscountsSet { shopMoney { amount } }
                  shippingAddress {
                    firstName
                    lastName
                    address1
                    address2
                    city
                    province
                    zip
                    country
                  }
                  fulfillments(first: 10) {
                    id
                    status
                    displayStatus
                    createdAt
                    inTransitAt
                    deliveredAt
                    estimatedDeliveryAt
                    trackingInfo(first: 5) {
                      number
                      company
                      url
                    }
                    fulfillmentLineItems(first: 50) {
                      edges { node { quantity lineItem { id } } }
                    }
                  }
                  lineItems(first: 50) {
                    edges {
                      node {
                        id
                        title
                        quantity
                        variantTitle
                        image {
                          url
                        }
                        originalUnitPriceSet {
                          shopMoney {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        const data = await client.request(query, { query: `name:${cleanNumber}` });
        const orderNode = data?.orders?.edges?.[0]?.node;

        if (orderNode?.email && orderNode.email.toLowerCase() === email.trim().toLowerCase()) {
          const tags: string[] = Array.isArray(orderNode.tags) ? orderNode.tags : [];
          const money = (set: { shopMoney?: { amount?: string | null } } | null | undefined) => (set?.shopMoney?.amount != null ? String(set.shopMoney.amount) : null);
          const mappedOrder = {
            id: orderNode.id,
            orderNumber: orderNode.name,
            createdAt: orderNode.createdAt,
            email: orderNode.email,
            totalPrice: {
              amount: orderNode.totalPriceSet?.shopMoney?.amount || '0',
              currencyCode: orderNode.totalPriceSet?.shopMoney?.currencyCode || 'INR'
            },
            cancelledAt: orderNode.cancelledAt || null,
            fulfillmentStatus: orderNode.displayFulfillmentStatus,
            financialStatus: orderNode.displayFinancialStatus || null,
            // Checkout tags cash-on-delivery orders "cod" and paid orders "rzp-<payment id>".
            paymentMethod: tags.includes('cod') ? 'cod' : tags.some((t) => t.startsWith('rzp-')) ? 'online' : null,
            subtotal: money(orderNode.subtotalPriceSet),
            shipping: money(orderNode.totalShippingPriceSet),
            discount: money(orderNode.totalDiscountsSet),
            shippingAddress: orderNode.shippingAddress,
            shipments: (orderNode.fulfillments || []).map((f: AdminFulfillment) => ({
              id: f.id,
              status: f.status || null,
              displayStatus: f.displayStatus || null,
              createdAt: f.createdAt || null,
              inTransitAt: f.inTransitAt || null,
              deliveredAt: f.deliveredAt || null,
              estimatedDeliveryAt: f.estimatedDeliveryAt || null,
              tracking: (f.trackingInfo || []).map((t) => ({ number: t.number || null, company: t.company || null, url: t.url || null })),
              items: (f.fulfillmentLineItems?.edges || []).map((e) => ({ lineItemId: e.node?.lineItem?.id, quantity: e.node?.quantity || 0 })),
            })),
            lineItems: {
              edges: orderNode.lineItems?.edges?.map((itemEdge: any) => {
                const itemNode = itemEdge.node;
                const priceAmount = itemNode.originalUnitPriceSet?.shopMoney?.amount || '0';
                const currency = itemNode.originalUnitPriceSet?.shopMoney?.currencyCode || 'INR';
                return {
                  node: {
                    id: itemNode.id,
                    title: itemNode.title,
                    quantity: itemNode.quantity,
                    variant: {
                      id: itemNode.id,
                      title: itemNode.variantTitle || '',
                      price: {
                        amount: priceAmount,
                        currencyCode: currency
                      },
                      image: itemNode.image ? {
                        url: itemNode.image.url
                      } : null
                    }
                  }
                };
              })
            }
          };
          return NextResponse.json({ order: mappedOrder });
        }
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      } catch (err) {
        console.error('[track] order lookup failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Could not look up order' }, { status: 502 });
      }
    }

    // Sample data below is for local development only.
    if (!isDevelopment) {
      return NextResponse.json({ error: 'Order tracking is not configured' }, { status: 503 });
    }

    // 1. Try to find order in custom mock orders cookie first!
    const mockOrdersCookie = cookieStore.get('mock_orders')?.value;
    if (mockOrdersCookie) {
      try {
        const parsedOrders = JSON.parse(mockOrdersCookie);
        const foundCustom = parsedOrders.find((edge: any) => {
          const node = edge.node;
          return (
            (node.orderNumber.toLowerCase() === orderNumber.toLowerCase() ||
             node.orderNumber.replace('NMD-', '').toLowerCase() === orderNumber.toLowerCase() ||
             node.orderNumber.replace('#', '').toLowerCase() === orderNumber.replace('#', '').toLowerCase()) &&
            node.email.toLowerCase() === email.toLowerCase()
          );
        });
        if (foundCustom) {
          console.log('[TRACK API] Found order in local custom mock_orders cookie:', foundCustom.node.orderNumber);
          return NextResponse.json({ order: foundCustom.node });
        }
      } catch (e) {
        console.error('[TRACK API] Failed to parse custom mock_orders cookie:', e);
      }
    }

    // 2. Fallback to hardcoded mock order tracking
    const order = MOCK_ORDERS.find(o =>
      (o.orderNumber.toLowerCase() === orderNumber.toLowerCase() ||
       o.orderNumber.replace('NMD-', '').toLowerCase() === orderNumber.toLowerCase()) &&
      o.email.toLowerCase() === email.toLowerCase()
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        email: order.email,
        totalPrice: {
          amount: String(order.total),
          currencyCode: 'INR'
        },
        status: order.status,
        fulfillmentStatus: order.status === 'Delivered' ? 'FULFILLED' : 'UNFULFILLED',
        lineItems: {
          edges: order.lineItems.map(item => ({
            node: {
              id: item.id,
              title: item.title,
              quantity: item.quantity
            }
          }))
        }
      }
    });

  } catch (error) {
    console.error('Order tracking error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
