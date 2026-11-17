import { beforeEach, describe, expect, it, vi } from "vitest";

// Razorpay API: one order and one payment, adjustable per test.
const rzp = {
  order: { id: "order_1", amount: 299800, notes: {} as Record<string, string> },
  payment: { id: "pay_1", order_id: "order_1", amount: 299800, status: "captured" },
};
vi.mock("razorpay", () => ({
  default: class {
    orders = { fetch: async () => rzp.order };
    payments = { fetch: async () => rzp.payment };
  },
}));

const loadServerCart = vi.fn();
vi.mock("@/lib/checkout/serverCart", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/checkout/serverCart")>();
  return { ...actual, loadServerCart: (id: unknown) => loadServerCart(id) };
});

// Shopify: remembers the order per payment, like the tag lookup in createShopifyOrder.
const created = new Map<string, { id: string; name: string }>();
const createShopifyOrder = vi.fn(async (_cart: unknown, _shipping: unknown, opts: { paymentRef?: string }) => {
  await new Promise((r) => setTimeout(r, 20)); // simulate Shopify latency
  const key = opts.paymentRef!;
  if (!created.has(key)) created.set(key, { id: `gid://shopify/Order/${created.size + 1}`, name: `#${1001 + created.size}` });
  return created.get(key)!;
});
vi.mock("@/lib/checkout/orders", () => ({
  createShopifyOrder: (...args: [unknown, unknown, { paymentRef?: string }]) => createShopifyOrder(...args),
}));

const { buildServerCart } = await import("@/lib/checkout/serverCart");
const { fulfillPaidOrder, orderNotes, shippingFromNotes, PaymentNeedsReviewError } = await import("@/lib/checkout/razorpay");

const shipping = {
  email: "a@b.co", firstName: "Asha", lastName: "Rao", address1: "12 MG Road",
  address2: "", city: "Chennai", province: "Tamil Nadu", zip: "600001",
};
const cart = buildServerCart("cart-1", [{ variantId: "v1", title: "Tee", quantity: 2, unitPrice: 1499 }], "INR", false);

beforeEach(() => {
  vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_x");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
  rzp.order = { id: "order_1", amount: 299800, notes: orderNotes("cart-1", shipping) };
  rzp.payment = { id: "pay_1", order_id: "order_1", amount: 299800, status: "captured" };
  loadServerCart.mockReset().mockResolvedValue(cart);
  createShopifyOrder.mockClear();
  created.clear();
});

describe("order notes", () => {
  it("round-trips the cart ID and shipping details", () => {
    const back = shippingFromNotes(orderNotes("cart-1", shipping));
    expect(back.cartId).toBe("cart-1");
    expect(back.shipping).toMatchObject(shipping);
  });

  it("keeps every note within Razorpay's 256-character limit", () => {
    const notes = orderNotes("c".repeat(400), { ...shipping, address1: "x".repeat(400) });
    expect(Object.values(notes).every((v) => v.length <= 256)).toBe(true);
  });
});

describe("fulfillPaidOrder", () => {
  it("creates a paid order from the details stored on the Razorpay order", async () => {
    const order = await fulfillPaidOrder("order_1", "pay_1");
    expect(order?.name).toBe("#1001");
    expect(loadServerCart).toHaveBeenCalledWith("cart-1");
    expect(createShopifyOrder).toHaveBeenCalledWith(cart, expect.objectContaining({ zip: "600001" }), { paid: true, paymentRef: "pay_1" });
  });

  it("creates one order when the browser and the webhook arrive together", async () => {
    const [a, b] = await Promise.all([fulfillPaidOrder("order_1", "pay_1"), fulfillPaidOrder("order_1", "pay_1")]);
    expect(a).toEqual(b);
    expect(created.size).toBe(1);
  });

  it("refuses a payment that hasn't succeeded", async () => {
    rzp.payment.status = "failed";
    await expect(fulfillPaidOrder("order_1", "pay_1")).rejects.toThrow(/not completed/);
    expect(createShopifyOrder).not.toHaveBeenCalled();
  });

  it("refuses a payment that belongs to a different Razorpay order", async () => {
    rzp.payment.order_id = "order_other";
    await expect(fulfillPaidOrder("order_1", "pay_1")).rejects.toThrow(/not completed/);
  });

  it("flags for manual review when the cart changed after payment", async () => {
    loadServerCart.mockResolvedValue(
      buildServerCart("cart-1", [{ variantId: "v1", title: "Tee", quantity: 3, unitPrice: 1499 }], "INR", false)
    );
    await expect(fulfillPaidOrder("order_1", "pay_1")).rejects.toBeInstanceOf(PaymentNeedsReviewError);
    expect(createShopifyOrder).not.toHaveBeenCalled();
  });

  it("flags for manual review when the Razorpay order has no shipping details", async () => {
    rzp.order.notes = {};
    await expect(fulfillPaidOrder("order_1", "pay_1")).rejects.toBeInstanceOf(PaymentNeedsReviewError);
  });
});
