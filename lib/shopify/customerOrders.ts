// lib/shopify/customerOrders.ts
import { ShopifyStorefrontClient } from '@/lib/shopify/client';
import { canCustomerCancel } from '@/lib/orders/cancellation';

interface Money {
  amount?: string;
  currencyCode?: string;
}

/** One order as the Storefront API returns it (GetCustomerOrders query). */
interface StorefrontOrder {
  id: string;
  orderNumber: number;
  processedAt: string;
  canceledAt?: string | null;
  financialStatus?: string;
  fulfillmentStatus?: string;
  totalPrice?: Money;
  /** Total after any items were cancelled. */
  currentTotalPrice?: Money;
  lineItems?: {
    edges?: Array<{
      node: {
        title: string;
        quantity: number;
        /** Quantity still on the order, after any items were cancelled. */
        currentQuantity?: number;
        /** What was paid for the original quantity, after discounts. */
        discountedTotalPrice?: Money;
        variant?: { id?: string; title?: string; image?: { url: string }; price?: Money; product?: { handle?: string } };
      };
    }>;
  };
}

/** One order in the shape the account pages use. */
export interface CustomerOrderEdge {
  node: {
    id: string;
    orderNumber: string;
    createdAt: string;
    email: string;
    totalPrice: { amount: string; currencyCode: string };
    financialStatus?: string;
    fulfillmentStatus?: string;
    /** Set once the order is cancelled. */
    cancelledAt?: string | null;
    /** Whether the customer can still cancel it themselves (nothing packed or shipped). */
    canCancel: boolean;
    /** Paid online, so cancelling refunds the payment. */
    isPrepaid: boolean;
    lineItems: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          /** Quantity still on the order. */
          quantity: number;
          /** How many the customer (or staff) cancelled. */
          cancelledQuantity: number;
          /** Price paid for one, after discounts. */
          paidUnitPrice: string;
          variant: {
            id: string;
            title: string;
            image?: { url: string };
            price: { amount: string; currencyCode: string };
            /** Product page handle, when the product still exists. */
            productHandle?: string;
          };
        };
      }>;
    };
  };
}

/**
 * Fetches the signed-in customer's own orders with their Storefront customer token.
 * Never use the admin token for customer-facing order data: it can read every order.
 */
export async function fetchCustomerOrders(customerAccessToken: string): Promise<CustomerOrderEdge[]> {
  const shopUrl = process.env.SHOPIFY_APP_URL;
  const storefrontToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!shopUrl || !storefrontToken) throw new Error('Store is not configured');

  const client = new ShopifyStorefrontClient(shopUrl, storefrontToken);
  const data = await client.request(
    `query GetCustomerOrders($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
          edges {
            node {
              id
              orderNumber
              processedAt
              canceledAt
              financialStatus
              fulfillmentStatus
              totalPrice { amount currencyCode }
              currentTotalPrice { amount currencyCode }
              lineItems(first: 20) {
                edges {
                  node {
                    title
                    quantity
                    currentQuantity
                    discountedTotalPrice { amount }
                    variant {
                      id
                      title
                      image { url }
                      price { amount currencyCode }
                      product { handle }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`,
    { customerAccessToken }
  );

  if (!data?.customer) throw new CustomerAuthError();

  const edges: Array<{ node: StorefrontOrder }> = data.customer.orders?.edges || [];
  return edges.map((edge): CustomerOrderEdge => {
    const node = edge.node;
    return {
      node: {
        id: node.id,
        orderNumber: `#${node.orderNumber}`,
        createdAt: node.processedAt,
        email: '',
        totalPrice: {
          amount: (node.currentTotalPrice ?? node.totalPrice)?.amount || '0',
          currencyCode: (node.currentTotalPrice ?? node.totalPrice)?.currencyCode || 'INR',
        },
        financialStatus: node.financialStatus,
        fulfillmentStatus: node.fulfillmentStatus,
        cancelledAt: node.canceledAt ?? null,
        canCancel: canCustomerCancel({ cancelledAt: node.canceledAt, fulfillmentStatus: node.fulfillmentStatus }),
        isPrepaid: ['PAID', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED'].includes(String(node.financialStatus)),
        lineItems: {
          edges: (node.lineItems?.edges || []).map((itemEdge) => {
            const item = itemEdge.node;
            const current = item.currentQuantity ?? item.quantity;
            const paid = parseFloat(item.discountedTotalPrice?.amount || '');
            return {
              node: {
                id: item.variant?.id || '',
                title: item.title,
                quantity: current,
                cancelledQuantity: Math.max(0, item.quantity - current),
                paidUnitPrice:
                  Number.isFinite(paid) && item.quantity > 0
                    ? (paid / item.quantity).toFixed(2)
                    : item.variant?.price?.amount || '0',
                variant: {
                  id: item.variant?.id || '',
                  title: item.variant?.title || '',
                  image: item.variant?.image ? { url: item.variant.image.url } : undefined,
                  price: {
                    amount: item.variant?.price?.amount || '0',
                    currencyCode: item.variant?.price?.currencyCode || 'INR',
                  },
                  productHandle: item.variant?.product?.handle || undefined,
                },
              },
            };
          }),
        },
      },
    };
  });
}

/** The customer token is missing, expired or invalid. */
export class CustomerAuthError extends Error {
  constructor() {
    super('Not authenticated');
  }
}

/** Full details of one order, for the order detail page. Amounts are strings in rupees. */
export interface CustomerOrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  cancelledAt: string | null;
  financialStatus?: string;
  fulfillmentStatus?: string;
  canCancel: boolean;
  isPrepaid: boolean;
  /** Sum of the items at their original prices, before discounts. */
  itemsSubtotal: string;
  /** Discount on the items (0 when none). */
  discount: string;
  discountCodes: string[];
  shipping: string;
  tax: string;
  total: string;
  refunded: string;
  shippingAddress: {
    name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone: string;
  } | null;
  tracking: Array<{ company: string | null; number: string | null; url: string | null }>;
  lineItems: Array<{
    variantId: string;
    title: string;
    variantTitle: string;
    quantity: number;
    cancelledQuantity: number;
    /** What was paid for the remaining quantity, after discounts. */
    paidTotal: string;
    paidUnitPrice: string;
    image?: string;
    productHandle?: string;
  }>;
}

const num = (m?: Money | null) => {
  const n = parseFloat(m?.amount || '');
  return Number.isFinite(n) ? n : 0;
};

/**
 * One of the signed-in customer's own orders, found by order number, with prices,
 * address and tracking. Returns null when the customer has no such order.
 * Uses only the customer's own token, so other customers' orders can't be read.
 */
export async function fetchCustomerOrderDetail(customerAccessToken: string, orderNumber: string): Promise<CustomerOrderDetail | null> {
  const wanted = String(orderNumber).replace(/[^0-9]/g, '');
  if (!wanted) return null;
  const shopUrl = process.env.SHOPIFY_APP_URL;
  const storefrontToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!shopUrl || !storefrontToken) throw new Error('Store is not configured');

  const client = new ShopifyStorefrontClient(shopUrl, storefrontToken);
  const data = await client.request(
    `query GetCustomerOrderDetail($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
          nodes {
            id
            orderNumber
            processedAt
            canceledAt
            financialStatus
            fulfillmentStatus
            totalPrice { amount }
            currentTotalPrice { amount }
            totalShippingPrice { amount }
            totalTax { amount }
            totalRefunded { amount }
            shippingAddress { name address1 address2 city province zip country phone }
            discountApplications(first: 10) {
              nodes {
                ... on DiscountCodeApplication { code }
              }
            }
            successfulFulfillments(first: 10) {
              trackingCompany
              trackingInfo(first: 5) { number url }
            }
            lineItems(first: 50) {
              nodes {
                title
                quantity
                currentQuantity
                originalTotalPrice { amount }
                discountedTotalPrice { amount }
                variant {
                  id
                  title
                  image { url }
                  price { amount }
                  product { handle }
                }
              }
            }
          }
        }
      }
    }`,
    { customerAccessToken }
  );

  if (!data?.customer) throw new CustomerAuthError();
  const order = (data.customer.orders?.nodes || []).find((o: { orderNumber: number }) => String(o.orderNumber) === wanted);
  if (!order) return null;

  type Line = {
    title: string;
    quantity: number;
    currentQuantity?: number;
    originalTotalPrice?: Money;
    discountedTotalPrice?: Money;
    variant?: { id?: string; title?: string; image?: { url: string }; price?: Money; product?: { handle?: string } } | null;
  };
  const lines: Line[] = order.lineItems?.nodes || [];
  let original = 0;
  let paid = 0;
  const lineItems = lines.map((line) => {
    const current = line.currentQuantity ?? line.quantity;
    const unitPaid = line.quantity > 0 ? num(line.discountedTotalPrice) / line.quantity : num(line.variant?.price);
    const unitOriginal = line.quantity > 0 ? num(line.originalTotalPrice) / line.quantity : unitPaid;
    original += unitOriginal * current;
    paid += unitPaid * current;
    return {
      variantId: line.variant?.id || '',
      title: line.title,
      variantTitle: line.variant?.title && line.variant.title !== 'Default Title' ? line.variant.title : '',
      quantity: current,
      cancelledQuantity: Math.max(0, line.quantity - current),
      paidTotal: (unitPaid * current).toFixed(2),
      paidUnitPrice: unitPaid.toFixed(2),
      image: line.variant?.image?.url || undefined,
      productHandle: line.variant?.product?.handle || undefined,
    };
  });

  const address = order.shippingAddress;
  type Fulfillment = { trackingCompany?: string | null; trackingInfo?: Array<{ number?: string | null; url?: string | null }> };
  const tracking = ((order.successfulFulfillments || []) as Fulfillment[]).flatMap((f) => {
    const infos = f.trackingInfo && f.trackingInfo.length > 0 ? f.trackingInfo : [{ number: null, url: null }];
    return infos.map((t) => ({ company: f.trackingCompany || null, number: t.number || null, url: t.url || null }));
  }).filter((t) => t.company || t.number || t.url);

  return {
    id: order.id,
    orderNumber: `#${order.orderNumber}`,
    createdAt: order.processedAt,
    cancelledAt: order.canceledAt ?? null,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    canCancel: canCustomerCancel({ cancelledAt: order.canceledAt, fulfillmentStatus: order.fulfillmentStatus }),
    isPrepaid: ['PAID', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED'].includes(String(order.financialStatus)),
    itemsSubtotal: original.toFixed(2),
    discount: Math.max(0, original - paid).toFixed(2),
    discountCodes: ((order.discountApplications?.nodes || []) as Array<{ code?: string }>).map((d) => d.code).filter((c): c is string => !!c),
    shipping: num(order.totalShippingPrice).toFixed(2),
    tax: num(order.totalTax).toFixed(2),
    total: num(order.currentTotalPrice ?? order.totalPrice).toFixed(2),
    refunded: num(order.totalRefunded).toFixed(2),
    shippingAddress: address
      ? {
          name: address.name || '',
          address1: address.address1 || '',
          address2: address.address2 || '',
          city: address.city || '',
          province: address.province || '',
          zip: address.zip || '',
          country: address.country || '',
          phone: address.phone || '',
        }
      : null,
    tracking,
    lineItems,
  };
}
