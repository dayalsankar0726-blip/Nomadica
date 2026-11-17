import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));

// Fake Shopify Admin API: records each GraphQL operation by name.
const calls: string[] = [];
let existing: { order?: object; draft?: object } = {};
let termsAvailable = true;
const request = vi.fn(async (query: string, _variables?: unknown): Promise<Record<string, unknown>> => {
  const name = query.match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? "unknown";
  calls.push(name);
  if (name === "FulfillmentTerms") {
    return { paymentTermsTemplates: termsAvailable ? [{ id: "gid://shopify/PaymentTermsTemplate/7" }] : [] };
  }
  if (name === "ExistingOrder") {
    return {
      orders: { edges: existing.order ? [{ node: existing.order }] : [] },
      draftOrders: { edges: existing.draft ? [{ node: existing.draft }] : [] },
    };
  }
  if (name === "DraftOrderCreate") {
    return { draftOrderCreate: { draftOrder: { id: "draft-new", totalPriceSet: { shopMoney: { amount: "2998.00" } } }, userErrors: [] } };
  }
  if (name.startsWith("DraftOrderComplete")) {
    return { draftOrderComplete: { draftOrder: { order: { id: "order-new", name: "#1001" } }, userErrors: [] } };
  }
  return {};
});
vi.mock("@/lib/shopify/admin", () => ({ getAdminClient: () => ({ request }) }));

const { buildServerCart } = await import("@/lib/checkout/serverCart");
let createShopifyOrder: typeof import("@/lib/checkout/orders").createShopifyOrder;

const cart = buildServerCart("cart-1", [{ variantId: "v1", title: "Tee", quantity: 2, unitPrice: 1499 }], "INR", false);
const shipping = {
  email: "a@b.co", firstName: "A", lastName: "B", address1: "1 St", address2: "",
  city: "Chennai", province: "TN", zip: "600001",
};
type Vars = { input: Record<string, unknown> } & Record<string, unknown>;
const varsOf = (name: string) => request.mock.calls.find(([q]) => q.includes(name))?.[1] as Vars;
const queryOf = (name: string) => request.mock.calls.find(([q]) => q.includes(name))?.[0] as string;

beforeEach(async () => {
  calls.length = 0;
  existing = {};
  termsAvailable = true;
  request.mockClear();
  // Fresh module each test so the cached payment terms template is reset.
  vi.resetModules();
  ({ createShopifyOrder } = await import("@/lib/checkout/orders"));
});

describe("createShopifyOrder (Shopify API 2026-10)", () => {
  it("creates and completes a paid order tagged with the payment ID, without deprecated arguments", async () => {
    const order = await createShopifyOrder(cart, shipping, { paid: true, paymentRef: "pay_1" });
    expect(order?.name).toBe("#1001");
    expect(calls).toEqual(["ExistingOrder", "DraftOrderCreate", "DraftOrderComplete"]);
    expect(varsOf("DraftOrderCreate").input.tags).toContain("rzp-pay_1");
    expect(varsOf("DraftOrderCreate").input.paymentTerms).toBeUndefined();
    expect(queryOf("mutation DraftOrderComplete")).not.toContain("paymentPending");
  });

  it("returns the existing order when the payment was already processed", async () => {
    existing.order = { id: "order-old", name: "#1000" };
    const order = await createShopifyOrder(cart, shipping, { paid: true, paymentRef: "pay_1" });
    expect(order?.name).toBe("#1000");
    expect(calls).toEqual(["ExistingOrder"]);
  });

  it("completes a draft left open by an earlier failed attempt instead of creating another", async () => {
    existing.draft = { id: "draft-old", status: "OPEN", order: null };
    await createShopifyOrder(cart, shipping, { paid: true, paymentRef: "pay_1" });
    expect(calls).toEqual(["ExistingOrder", "DraftOrderComplete"]);
    expect(varsOf("DraftOrderComplete")).toMatchObject({ id: "draft-old" });
  });

  it("creates cash-on-delivery orders with 'due on fulfillment' payment terms", async () => {
    await createShopifyOrder(cart, shipping, { paid: false });
    expect(calls).toEqual(["FulfillmentTerms", "DraftOrderCreate", "DraftOrderComplete"]);
    expect(varsOf("DraftOrderCreate").input.paymentTerms).toEqual({
      paymentTermsTemplateId: "gid://shopify/PaymentTermsTemplate/7",
    });
  });

  it("falls back to the payment-pending flag when the store can't use payment terms", async () => {
    termsAvailable = false;
    await createShopifyOrder(cart, shipping, { paid: false });
    expect(calls).toEqual(["FulfillmentTerms", "DraftOrderCreate", "DraftOrderCompletePending"]);
    expect(queryOf("DraftOrderCompletePending")).toContain("paymentPending: true");
  });
});

describe("confirmOrderTotal", () => {
  let confirmOrderTotal: typeof import("@/lib/checkout/orders").confirmOrderTotal;
  const discounted = buildServerCart("cart-1", [{ variantId: "v1", title: "Tee", quantity: 2, unitPrice: 1499 }], "INR", false, {
    codes: ["SAVE300"],
    amount: 300,
  });

  beforeEach(async () => {
    ({ confirmOrderTotal } = await import("@/lib/checkout/orders"));
  });

  it("passes when Shopify prices the order the same, with the cart's discount codes", async () => {
    request.mockImplementationOnce(async () => ({
      draftOrderCalculate: { calculatedDraftOrder: { totalPriceSet: { shopMoney: { amount: "2698.00" } } }, userErrors: [] },
    }));
    await expect(confirmOrderTotal(discounted)).resolves.toBeUndefined();
    expect(varsOf("DraftOrderCalculate").input).toMatchObject({ discountCodes: ["SAVE300"], acceptAutomaticDiscounts: true });
  });

  it("stops the charge when Shopify's total differs, e.g. a code just expired", async () => {
    request.mockImplementationOnce(async () => ({
      draftOrderCalculate: { calculatedDraftOrder: { totalPriceSet: { shopMoney: { amount: "2998.00" } } }, userErrors: [] },
    }));
    await expect(confirmOrderTotal(discounted)).rejects.toThrow(/total has changed/);
  });
});
