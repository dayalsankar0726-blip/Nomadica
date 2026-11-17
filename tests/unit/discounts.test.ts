import { beforeEach, describe, expect, it, vi } from "vitest";

// Cookie store for development sample carts.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => jar.set(k, v),
    delete: (k: string) => jar.delete(k),
  }),
}));

// Fake Shopify Storefront API holding one cart.
const shopifyCart = {
  id: "gid://shopify/Cart/1",
  codes: [] as Array<{ code: string; applicable: boolean }>,
  // Shopify's discounted total for the current codes.
  totalFor: (codes: string[]) => (codes.includes("SAVE300") ? "2698.00" : "2998.00"),
};
const storefrontRequest = vi.fn(async (query: string, vars: { discountCodes: string[] }) => {
  if (query.includes("cartDiscountCodesUpdate")) {
    shopifyCart.codes = vars.discountCodes.map((code: string) => ({ code, applicable: code === "SAVE300" }));
    return { cartDiscountCodesUpdate: { cart: { id: shopifyCart.id, discountCodes: shopifyCart.codes }, userErrors: [] } };
  }
  const applied = shopifyCart.codes.filter((c) => c.applicable).map((c) => c.code);
  return {
    cart: {
      id: shopifyCart.id,
      discountCodes: shopifyCart.codes,
      cost: { totalAmount: { amount: shopifyCart.totalFor(applied), currencyCode: "INR" } },
      lines: { edges: [{ node: { quantity: 2, merchandise: { id: "v1", title: "M", price: { amount: "1499.00", currencyCode: "INR" }, product: { title: "Tee" } } } }] },
    },
  };
});
vi.mock("@/lib/shopify/client", () => ({
  ShopifyStorefrontClient: class { request = storefrontRequest; },
  SHOPIFY_API_VERSION: "2026-10",
}));

const { buildServerCart, setCartDiscountCode, loadServerCart, serverCartFromShopify, SHIPPING_FEE } =
  await import("@/lib/checkout/serverCart");

const line = (unitPrice: number, quantity = 1) => ({ variantId: "v1", title: "Tee", quantity, unitPrice });

beforeEach(() => {
  jar.clear();
  shopifyCart.codes = [];
  storefrontRequest.mockClear();
  vi.stubEnv("SHOPIFY_APP_URL", "shop.myshopify.com");
  vi.stubEnv("NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN", "tok");
});

describe("discount pricing", () => {
  it("subtracts the discount before shipping and total", () => {
    const cart = buildServerCart("c", [line(1499, 2)], "INR", false, { codes: ["SAVE300"], amount: 300 });
    expect(cart).toMatchObject({ subtotal: 2998, discount: 300, shipping: 0, total: 2698, discountCodes: ["SAVE300"] });
  });

  it("charges shipping when the discount takes the order under the free-shipping threshold", () => {
    const cart = buildServerCart("c", [line(1050, 2)], "INR", false, { codes: ["BIG"], amount: 200 });
    expect(cart.shipping).toBe(SHIPPING_FEE);
    expect(cart.totalMinor).toBe((2100 - 200 + SHIPPING_FEE) * 100);
  });

  it("never discounts below zero", () => {
    const cart = buildServerCart("c", [line(500)], "INR", false, { codes: ["ALL"], amount: 9999 });
    expect(cart.discount).toBe(500);
    expect(cart.total).toBe(SHIPPING_FEE);
  });

  it("reads Shopify's discounted total, including automatic discounts", () => {
    const cart = serverCartFromShopify({
      id: "c",
      discountCodes: [{ code: "NOPE", applicable: false }],
      cost: { totalAmount: { amount: "2848.10" } },
      lines: { edges: [{ node: { quantity: 2, merchandise: { id: "v1", price: { amount: "1499.00", currencyCode: "INR" } } } }] },
    });
    expect(cart.discount).toBeCloseTo(149.9, 2);
    expect(cart.discountCodes).toEqual([]); // not applicable codes aren't reported
    expect(cart.totalMinor).toBe(284810);
  });
});

describe("setCartDiscountCode with Shopify", () => {
  it("applies a code Shopify accepts and returns the discounted total", async () => {
    const { cart, applied } = await setCartDiscountCode(shopifyCart.id, " save300 ");
    expect(applied).toBe(true);
    expect(cart).toMatchObject({ discount: 300, total: 2698, discountCodes: ["SAVE300"] });
  });

  it("rejects a code Shopify doesn't accept and removes it from the cart", async () => {
    const { cart, applied } = await setCartDiscountCode(shopifyCart.id, "FAKE");
    expect(applied).toBe(false);
    expect(cart.discount).toBe(0);
    expect(shopifyCart.codes).toEqual([]);
  });

  it("removes codes", async () => {
    await setCartDiscountCode(shopifyCart.id, "SAVE300");
    const { cart } = await setCartDiscountCode(shopifyCart.id, null);
    expect(cart.discount).toBe(0);
  });

  it("ignores the old browser-only codes on real Shopify carts", async () => {
    const { applied } = await setCartDiscountCode(shopifyCart.id, "WELCOME10");
    expect(applied).toBe(false);
  });
});

describe("development sample carts", () => {
  beforeEach(() => {
    jar.set("shopify_cart_MOCK_CART_1", JSON.stringify([{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 2, price: 1499 }]));
  });

  it("supports the sample codes in development", async () => {
    const { applied, cart } = await setCartDiscountCode("MOCK_CART_1", "welcome10");
    expect(applied).toBe(true);
    expect(cart.discount).toBe(300);
    expect((await loadServerCart("MOCK_CART_1")).total).toBe(2998 - 300);
  });

  it("rejects unknown codes on sample carts", async () => {
    const { applied, cart } = await setCartDiscountCode("MOCK_CART_1", "FREEMONEY");
    expect(applied).toBe(false);
    expect(cart.discount).toBe(0);
  });
});
