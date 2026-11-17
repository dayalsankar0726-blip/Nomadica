// lib/devMocks.ts
//
// Sample data used ONLY in local development (NODE_ENV !== 'production') when the
// store is not configured. Production code paths must never return these.
import { MOCK_ORDERS } from '@/utils/mockData';

export const isDevelopment = process.env.NODE_ENV !== 'production';

export function isStorefrontConfigured(): boolean {
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  return !!process.env.SHOPIFY_APP_URL && !!token && token.trim() !== '';
}

/** Dev sample mode: development build with no Shopify Storefront credentials. */
export function devSamplesEnabled(): boolean {
  return isDevelopment && !isStorefrontConfigured();
}

export function mockOrderEdges() {
  return MOCK_ORDERS.map((order) => ({
    node: {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      email: order.email,
      totalPrice: { amount: String(order.total), currencyCode: 'INR' },
      status: order.status,
      canCancel: false,
      isPrepaid: true,
      lineItems: {
        edges: order.lineItems.map((item) => ({
          node: {
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            variant: { price: { amount: String(item.price), currencyCode: 'INR' } },
          },
        })),
      },
    },
  }));
}
