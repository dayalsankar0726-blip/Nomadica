import { beforeEach, describe, expect, it, vi } from "vitest";

// Cookies are not available outside a request; give routes an empty store.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));

// The cart always comes from the server-side loader, never from the request body.
const loadServerCart = vi.fn();
vi.mock("@/lib/checkout/serverCart", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/checkout/serverCart")>();
  return { ...actual, loadServerCart: (id: unknown) => loadServerCart(id) };
});

const { buildServerCart } = await import("@/lib/checkout/serverCart");
const { POST } = await import("@/app/api/checkout/route");

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/checkout", { method: "POST", body: JSON.stringify(body) }) as never);

const shipping = {
  email: "a@b.co",
  firstName: "A",
  lastName: "B",
  address1: "1 Street",
  city: "Chennai",
  province: "TN",
  zip: "600001",
  phone: "9876543210",
};

beforeEach(() => {
  loadServerCart.mockReset();
  vi.unstubAllEnvs();
});

describe("POST /api/checkout", () => {
  it("rejects the old flow that trusted browser prices and payment method", async () => {
    const res = await post({ paymentMethod: "cod", totalPrice: 1, lineItems: [{ price: 1, quantity: 5 }] });
    expect(res.status).toBe(400);
    expect(loadServerCart).not.toHaveBeenCalled();
  });

  it("uses the server cart total and ignores any total sent by the browser", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_x");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
    loadServerCart.mockResolvedValue(
      buildServerCart("cart-1", [{ variantId: "v1", title: "Tee", quantity: 2, unitPrice: 1499 }], "INR", false)
    );
    const create = vi.fn(async (opts: { amount: number }) => ({ id: "order_1", amount: opts.amount, currency: "INR" }));
    vi.doMock("razorpay", () => ({ default: class { orders = { create }; } }));
    vi.resetModules();
    const { POST: freshPost } = await import("@/app/api/checkout/route");

    const res = await freshPost(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        body: JSON.stringify({ action: "create", cartId: "cart-1", totalPrice: 1, ...shipping }),
      }) as never
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 299800, notes: expect.objectContaining({ cartId: "cart-1", zip: "600001", phone: "+919876543210" }) })
    );
    expect(json.amount).toBe(299800);
    vi.doUnmock("razorpay");
  });

  it("refuses to verify a payment with a bad signature", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_x");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
    const res = await post({
      action: "verify",
      razorpay_payment_id: "pay_1",
      razorpay_order_id: "order_1",
      razorpay_signature: "forged",
      cartId: "cart-1",
      ...shipping,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/verification failed/i);
  });

  it("returns 503 for online payment when Razorpay isn't configured", async () => {
    loadServerCart.mockResolvedValue(
      buildServerCart("cart-1", [{ variantId: "v1", title: "Tee", quantity: 1, unitPrice: 500 }], "INR", false)
    );
    const res = await post({ action: "create", cartId: "cart-1", ...shipping });
    expect(res.status).toBe(503);
  });

  it("rejects cash on delivery with invalid shipping details", async () => {
    const res = await post({ action: "cod", cartId: "cart-1", ...shipping, zip: "12" });
    expect(res.status).toBe(400);
  });
});
