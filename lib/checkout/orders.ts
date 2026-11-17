// lib/checkout/orders.ts
//
// Creates Shopify orders from the server-side cart. Used by checkout (cash on
// delivery and the browser's payment confirmation) and by the Razorpay webhook.
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/shopify/admin';
import { ServerCart } from '@/lib/checkout/serverCart';
import { CheckoutError, ShippingDetails } from '@/lib/checkout/validation';

const isDev = process.env.NODE_ENV !== 'production';

export interface CreatedOrder {
  id: string;
  name: string;
}

let fulfillmentTermsTemplateId: string | null | undefined;

/**
 * ID of Shopify's built-in "Due on fulfillment" payment terms template, used to create
 * cash-on-delivery orders as payment pending (Shopify's replacement for the deprecated
 * `paymentPending` argument of draftOrderComplete). Cached per server instance.
 * Returns null if the store can't use payment terms.
 */
async function getFulfillmentTermsTemplateId(admin: NonNullable<ReturnType<typeof getAdminClient>>): Promise<string | null> {
  if (fulfillmentTermsTemplateId !== undefined) return fulfillmentTermsTemplateId;
  let id: string | null = null;
  try {
    const data = await admin.request(
      `query FulfillmentTerms { paymentTermsTemplates(paymentTermsType: FULFILLMENT) { id } }`
    );
    id = data?.paymentTermsTemplates?.[0]?.id ?? null;
  } catch (error) {
    console.warn('[orders] payment terms unavailable, using paymentPending fallback:', error instanceof Error ? error.message : error);
  }
  fulfillmentTermsTemplateId = id;
  return id;
}

/**
 * The draft order fields that decide the price: the same items, discount codes,
 * automatic discounts and shipping as the server cart.
 */
function draftOrderInput(cart: ServerCart, shipping?: ShippingDetails): Record<string, unknown> {
  const input: Record<string, unknown> = {
    lineItems: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    discountCodes: cart.discountCodes,
    acceptAutomaticDiscounts: true,
  };
  if (cart.shipping > 0) {
    input.shippingLine = { title: 'Standard Shipping', priceWithCurrency: { amount: cart.shipping.toFixed(2), currencyCode: cart.currency } };
  }
  if (shipping) {
    const address = {
      firstName: shipping.firstName,
      lastName: shipping.lastName,
      address1: shipping.address1,
      address2: shipping.address2,
      city: shipping.city,
      province: shipping.province,
      zip: shipping.zip,
      phone: shipping.phone,
      countryCode: 'IN',
    };
    input.email = shipping.email;
    input.shippingAddress = address;
    input.billingAddress = address;
  }
  return input;
}

/**
 * Asks Shopify to price the order exactly as it will be created, before the customer is
 * charged. Throws if Shopify's total differs from the cart total, so the amount charged
 * always matches the order (for example when a discount code expired a moment ago).
 * Skipped in development when the admin API isn't configured.
 */
export async function confirmOrderTotal(cart: ServerCart): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    if (isDev) return;
    throw new CheckoutError('Order system is not configured', 503);
  }
  const data = await admin.request(
    `mutation DraftOrderCalculate($input: DraftOrderInput!) {
      draftOrderCalculate(input: $input) {
        calculatedDraftOrder { totalPriceSet { shopMoney { amount } } }
        userErrors { field message }
      }
    }`,
    { input: draftOrderInput(cart) }
  );
  const amount = data?.draftOrderCalculate?.calculatedDraftOrder?.totalPriceSet?.shopMoney?.amount;
  if (amount === undefined) {
    const msg = data?.draftOrderCalculate?.userErrors?.[0]?.message;
    console.error('[orders] draftOrderCalculate failed:', msg);
    throw new CheckoutError('Could not price your order. Please try again.', 502);
  }
  const shopifyMinor = Math.round(parseFloat(amount) * 100);
  if (shopifyMinor !== cart.totalMinor) {
    console.warn(`[orders] price check mismatch: Shopify ${shopifyMinor} vs cart ${cart.totalMinor}`);
    throw new CheckoutError('Your order total has changed. Please review your bag and try again.', 409);
  }
}

/** The Shopify tag that links an order to its Razorpay payment. */
export const paymentTag = (paymentId: string) => `rzp-${paymentId}`;

/**
 * Creates and completes a Shopify order for the server-side cart.
 * A paid order is tagged with its Razorpay payment ID, and an existing order or open
 * draft order with that tag is reused, so the same payment never creates two orders.
 * Returns null when the store admin API is not configured (development only).
 */
export async function createShopifyOrder(
  cart: ServerCart,
  shipping: ShippingDetails,
  opts: { paid: boolean; paymentRef?: string }
): Promise<CreatedOrder | null> {
  const admin = getAdminClient();
  if (!admin) {
    if (isDev) return null;
    throw new CheckoutError('Order system is not configured', 503);
  }

  const tag = opts.paymentRef ? paymentTag(opts.paymentRef) : undefined;
  let draftId: string | undefined;
  // Cash on delivery: payment pending via payment terms, or the deprecated flag if the
  // store can't use payment terms.
  const termsTemplateId = opts.paid ? null : await getFulfillmentTermsTemplateId(admin);
  const usePendingFlag = !opts.paid && !termsTemplateId;

  if (tag) {
    const existing = await admin.request(
      `query ExistingOrder($q: String!) {
        orders(first: 1, query: $q) { edges { node { id name } } }
        draftOrders(first: 1, query: $q) { edges { node { id status order { id name } } } }
      }`,
      { q: `tag:'${tag}'` }
    );
    const order = existing?.orders?.edges?.[0]?.node;
    if (order) return order;
    const draft = existing?.draftOrders?.edges?.[0]?.node;
    if (draft?.order) return draft.order;
    // A draft from an earlier attempt that failed before completion: complete it instead.
    if (draft?.status === 'OPEN') draftId = draft.id;
  }

  if (!draftId) {
    const draftInput: Record<string, unknown> = {
      ...draftOrderInput(cart, shipping),
      tags: tag ? ['nomadica-web', tag] : ['nomadica-web', 'cod'],
      note: opts.paid ? `Paid via Razorpay (${opts.paymentRef})` : 'Cash on delivery',
    };
    if (termsTemplateId) {
      draftInput.paymentTerms = { paymentTermsTemplateId: termsTemplateId };
    }

    const draftData = await admin.request(
      `mutation DraftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder { id totalPriceSet { shopMoney { amount } } }
          userErrors { field message }
        }
      }`,
      { input: draftInput }
    );
    const draft = draftData?.draftOrderCreate?.draftOrder;
    const draftErrors = draftData?.draftOrderCreate?.userErrors || [];
    if (!draft?.id || draftErrors.length > 0) {
      console.error('[orders] draftOrderCreate failed:', draftErrors.map((e: { message?: string }) => e.message).join('; '));
      throw new CheckoutError('Could not create your order. Please contact support.', 502);
    }

    // Shopify recalculates prices from the variants; refuse to mark it paid if the totals disagree.
    const draftTotal = Math.round(parseFloat(draft.totalPriceSet?.shopMoney?.amount || '0') * 100);
    if (opts.paid && draftTotal !== cart.totalMinor) {
      console.error(`[orders] total mismatch: draft ${draftTotal} vs paid ${cart.totalMinor}`);
      throw new CheckoutError('Order total changed during checkout. Please contact support.', 409);
    }
    draftId = draft.id;
  }

  // Without payment terms or the pending flag, Shopify marks the completed order as paid.
  const completeData = usePendingFlag
    ? await admin.request(
        `mutation DraftOrderCompletePending($id: ID!) {
          draftOrderComplete(id: $id, paymentPending: true) {
            draftOrder { order { id name } }
            userErrors { field message }
          }
        }`,
        { id: draftId }
      )
    : await admin.request(
        `mutation DraftOrderComplete($id: ID!) {
          draftOrderComplete(id: $id) {
            draftOrder { order { id name } }
            userErrors { field message }
          }
        }`,
        { id: draftId }
      );
  const order = completeData?.draftOrderComplete?.draftOrder?.order;
  if (!order?.id) {
    console.error('[orders] draftOrderComplete failed');
    throw new CheckoutError('Could not complete your order. Please contact support.', 502);
  }
  return order;
}

/** Development-only order record so the orders page works without Shopify. */
export async function recordDevOrder(cart: ServerCart, shipping: ShippingDetails, status: string): Promise<CreatedOrder> {
  const orderNumber = `NMD-DEV-${Date.now().toString().slice(-6)}`;
  const cookieStore = await cookies();
  let orders: unknown[] = [];
  try {
    orders = JSON.parse(cookieStore.get('mock_orders')?.value || '[]');
  } catch {}
  const record = {
    node: {
      id: `dev-order-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      email: shipping.email,
      totalPrice: { amount: cart.total.toFixed(2), currencyCode: cart.currency },
      status,
      shippingAddress: { ...shipping, country: 'India' },
      lineItems: {
        edges: cart.lines.map((l, idx) => ({
          node: {
            id: `l_${idx}`,
            title: l.title,
            quantity: l.quantity,
            variant: { price: { amount: l.unitPrice.toFixed(2), currencyCode: cart.currency }, image: { url: l.image || '' } },
          },
        })),
      },
    },
  };
  orders.unshift(record);
  cookieStore.set('mock_orders', JSON.stringify(orders.slice(0, 10)), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
  return { id: record.node.id, name: orderNumber };
}
