// lib/checkout/serverCart.ts
//
// The one place the store's prices are worked out. Every amount shown to the customer
// and every amount charged comes from here, never from the browser.
import { cookies } from 'next/headers';
import { ShopifyStorefrontClient } from '@/lib/shopify/client';
import { STOREFRONT_QUERIES } from '@/lib/shopify/queries';
import { MOCK_PRODUCTS } from '@/utils/mockData';

import { POLICY } from '@/lib/site';

export const FREE_SHIPPING_THRESHOLD = POLICY.freeShippingThreshold; // INR, on the merchandise total after discounts
export const SHIPPING_FEE = POLICY.shippingFee; // INR

/** Sample codes that work only in local development without Shopify (percent off). */
export const DEV_SAMPLE_CODES: Record<string, number> = { WELCOME10: 10, EXPLORE20: 20 };

export interface ServerCartLine {
  variantId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

export interface CartDiscount {
  /** Codes Shopify accepted for this cart. */
  codes: string[];
  /** Total discount on the merchandise, in rupees (codes and automatic discounts). */
  amount: number;
}

export interface ServerCart {
  id: string;
  lines: ServerCartLine[];
  currency: string;
  /** Merchandise total before discounts. */
  subtotal: number;
  discount: number;
  discountCodes: string[];
  shipping: number;
  total: number;
  /** Total in the smallest currency unit (paise for INR), as Razorpay expects. */
  totalMinor: number;
  isMock: boolean;
}

/** What the cart and checkout pages display. */
export interface CartPricing {
  currency: string;
  subtotal: number;
  discount: number;
  discountCodes: string[];
  shipping: number;
  freeShippingThreshold: number;
  total: number;
}

export class CartError extends Error {}

/** The parts of a Shopify Storefront cart (GET_CART query) used for pricing. */
export interface ShopifyCart {
  id: string;
  lines?: {
    edges?: Array<{
      node: {
        quantity: number;
        merchandise?: {
          id?: string;
          title?: string;
          price?: { amount?: string; currencyCode?: string };
          product?: { title?: string; images?: { edges?: Array<{ node?: { url?: string } }> } };
        };
      };
    }>;
  };
  cost?: { totalAmount?: { amount?: string } };
  discountCodes?: ShopifyDiscountCode[];
}

interface ShopifyDiscountCode {
  code?: string;
  applicable?: boolean;
}

/** A line of a development sample cart, as stored in its cookie. */
interface MockCartItem {
  merchandiseId?: string;
  variantId?: string;
  productTitle?: string;
  quantity?: number | string;
  price?: number | string;
  image?: string;
}

const isDev = process.env.NODE_ENV !== 'production';

function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

/** Validates cart lines and works out subtotal, discount, shipping and total. */
export function buildServerCart(
  id: string,
  lines: ServerCartLine[],
  currency: string,
  isMock: boolean,
  discount: CartDiscount = { codes: [], amount: 0 }
): ServerCart {
  if (lines.length === 0) throw new CartError('Your shopping bag is empty');
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) {
      throw new CartError('Invalid quantity in cart');
    }
    if (!(line.unitPrice > 0)) throw new CartError('Invalid price in cart');
  }
  const subtotalMinor = lines.reduce((sum, l) => sum + toMinor(l.unitPrice) * l.quantity, 0);
  const discountMinor = Math.min(Math.max(toMinor(discount.amount), 0), subtotalMinor);
  const merchandiseMinor = subtotalMinor - discountMinor;
  // Free at or above the threshold, as the shipping policy says.
  const shipping = merchandiseMinor >= toMinor(FREE_SHIPPING_THRESHOLD) ? 0 : SHIPPING_FEE;
  const totalMinor = merchandiseMinor + toMinor(shipping);
  return {
    id,
    lines,
    currency,
    subtotal: subtotalMinor / 100,
    discount: discountMinor / 100,
    discountCodes: discountMinor > 0 || discount.codes.length > 0 ? discount.codes : [],
    shipping,
    total: totalMinor / 100,
    totalMinor,
    isMock,
  };
}

export function cartPricing(cart: ServerCart): CartPricing {
  return {
    currency: cart.currency,
    subtotal: cart.subtotal,
    discount: cart.discount,
    discountCodes: cart.discountCodes,
    shipping: cart.shipping,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    total: cart.total,
  };
}

/**
 * Builds the server cart from a Shopify Storefront `cart` object (GET_CART query).
 * The discount is the difference between the undiscounted lines and Shopify's own
 * cart total, so it covers discount codes and automatic discounts alike.
 */
export function serverCartFromShopify(cart: ShopifyCart): ServerCart {
  let currency = 'INR';
  const lines: ServerCartLine[] = (cart.lines?.edges || []).map((edge) => {
    const node = edge.node;
    const merch = node.merchandise;
    if (!merch?.id || !merch?.price?.amount) throw new CartError('Cart contains an unavailable item');
    currency = merch.price.currencyCode || currency;
    return {
      variantId: merch.id,
      title: merch.product?.title || merch.title || 'Product',
      quantity: node.quantity,
      unitPrice: parseFloat(merch.price.amount),
      image: merch.product?.images?.edges?.[0]?.node?.url,
    };
  });

  const undiscountedMinor = lines.reduce((sum, l) => sum + toMinor(l.unitPrice) * l.quantity, 0);
  const shopifyTotal = parseFloat(cart.cost?.totalAmount?.amount ?? '');
  const discountMinor = Number.isFinite(shopifyTotal) ? Math.max(0, undiscountedMinor - toMinor(shopifyTotal)) : 0;
  const codes: string[] = (cart.discountCodes || [])
    .filter((d) => d?.applicable && d.code)
    .map((d) => String(d.code));

  return buildServerCart(cart.id, lines, currency, false, { codes, amount: discountMinor / 100 });
}

function storefront() {
  const shopUrl = process.env.SHOPIFY_APP_URL;
  const storefrontToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!shopUrl || !storefrontToken) throw new CartError('Store is not configured');
  return new ShopifyStorefrontClient(shopUrl, storefrontToken);
}

function validCartId(cartId: unknown): string {
  if (typeof cartId !== 'string' || cartId.length === 0 || cartId.length > 300) {
    throw new CartError('Missing cart');
  }
  return cartId;
}

/**
 * Loads a cart and its prices from Shopify on the server.
 * Prices sent by the browser are never used for payment or orders.
 */
export async function loadServerCart(cartId: unknown): Promise<ServerCart> {
  const id = validCartId(cartId);

  // Local mock carts exist only for development without Shopify credentials.
  if (id.startsWith('MOCK_CART_')) {
    if (!isDev) throw new CartError('Invalid cart');
    return loadMockCart(id);
  }

  const data = await storefront().request(STOREFRONT_QUERIES.GET_CART, { id });
  if (!data?.cart) throw new CartError('Cart not found');
  return serverCartFromShopify(data.cart);
}

/**
 * Applies a discount code to the cart (or removes all codes when `code` is null).
 * Shopify decides whether the code is valid; an invalid code is removed again and
 * reported as not applicable.
 */
export async function setCartDiscountCode(
  cartId: unknown,
  code: string | null
): Promise<{ cart: ServerCart; applied: boolean }> {
  const id = validCartId(cartId);
  const normalized = code?.trim().toUpperCase().slice(0, 64) || null;

  if (id.startsWith('MOCK_CART_')) {
    if (!isDev) throw new CartError('Invalid cart');
    const applied = !normalized || normalized in DEV_SAMPLE_CODES;
    const cookieStore = await cookies();
    if (normalized && applied) cookieStore.set(`cart_discount_${id}`, normalized, { path: '/', httpOnly: true, sameSite: 'lax' });
    if (!normalized) cookieStore.delete(`cart_discount_${id}`);
    return { cart: await loadMockCart(id), applied };
  }

  const client = storefront();
  const update = (discountCodes: string[]) =>
    client.request(STOREFRONT_QUERIES.UPDATE_CART_DISCOUNT_CODES, { cartId: id, discountCodes });

  const result = await update(normalized ? [normalized] : []);
  const payload = result?.cartDiscountCodesUpdate;
  if (payload?.userErrors?.length) throw new CartError(payload.userErrors[0].message);
  if (!payload?.cart) throw new CartError('Cart not found');

  const accepted = (payload.cart.discountCodes || []).some(
    (d: ShopifyDiscountCode) => d?.applicable && String(d.code).toUpperCase() === normalized
  );
  if (normalized && !accepted) {
    // Don't leave an unusable code on the cart.
    await update([]);
  }
  return { cart: await loadServerCart(id), applied: !normalized || accepted };
}

async function loadMockCart(cartId: string): Promise<ServerCart> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(`shopify_cart_${cartId}`)?.value;
  let items: MockCartItem[] = [];
  try {
    items = raw ? JSON.parse(raw) : [];
  } catch {
    throw new CartError('Invalid cart');
  }
  const lines: ServerCartLine[] = items.map((item) => {
    const rawId = String(item.merchandiseId || item.variantId || '1');
    const numericId = (rawId.split('/').pop() || '1').replace(/[^0-9]/g, '');
    const product = MOCK_PRODUCTS.find((p) => p.id === numericId);
    return {
      variantId: rawId,
      title: item.productTitle || product?.name || 'Product',
      quantity: Number(item.quantity),
      unitPrice: Number(item.price || product?.price || 0),
      image: item.image || product?.image,
    };
  });

  const code = cookieStore.get(`cart_discount_${cartId}`)?.value;
  const percent = code ? DEV_SAMPLE_CODES[code] : undefined;
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = percent ? { codes: [code!], amount: Math.round((subtotal * percent) / 100) } : undefined;
  return buildServerCart(cartId, lines, 'INR', true, discount);
}
