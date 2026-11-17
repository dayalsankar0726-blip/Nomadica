import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fulfillPaidOrder = vi.fn();
vi.mock("@/lib/checkout/razorpay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/checkout/razorpay")>();
  return { ...actual, fulfillPaidOrder: (...args: unknown[]) => fulfillPaidOrder(...args) };
});

const { POST } = await import("@/app/api/webhooks/razorpay/route");
const { PaymentNeedsReviewError } = await import("@/lib/checkout/razorpay");
const { CheckoutError } = await import("@/lib/checkout/validation");

const SECRET = "whsec_test";
const capturedEvent = {
  event: "payment.captured",
  payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 299800, status: "captured" } } },
};

function webhook(body: unknown, { secret = SECRET, signature }: { secret?: string; signature?: string } = {}) {
  const raw = JSON.stringify(body);
  const sig = signature ?? crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return POST(new Request("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    body: raw,
    headers: { "x-razorpay-signature": sig },
  }));
}

beforeEach(() => {
  fulfillPaidOrder.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", SECRET);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/webhooks/razorpay", () => {
  it("refuses requests when the webhook secret isn't configured", async () => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
    expect((await webhook(capturedEvent)).status).toBe(503);
  });

  it("rejects a forged signature without creating an order", async () => {
    const res = await webhook(capturedEvent, { secret: "wrong" });
    expect(res.status).toBe(400);
    expect(fulfillPaidOrder).not.toHaveBeenCalled();
  });

  it("creates the order for a captured payment", async () => {
    fulfillPaidOrder.mockResolvedValue({ id: "gid://shopify/Order/1", name: "#1001" });
    const res = await webhook(capturedEvent);
    expect(res.status).toBe(200);
    expect(fulfillPaidOrder).toHaveBeenCalledWith("order_1", "pay_1");
    expect((await res.json()).order).toBe("#1001");
  });

  it("ignores events it doesn't handle", async () => {
    const res = await webhook({ event: "payment.failed", payload: {} });
    expect(res.status).toBe(200);
    expect(fulfillPaidOrder).not.toHaveBeenCalled();
  });

  it("does not ask Razorpay to retry a payment that needs manual review", async () => {
    fulfillPaidOrder.mockRejectedValue(new PaymentNeedsReviewError("cart changed"));
    const res = await webhook(capturedEvent);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("needs_review");
  });

  it("ignores a payment that isn't completed yet", async () => {
    fulfillPaidOrder.mockRejectedValue(new CheckoutError("Payment was not completed"));
    expect((await webhook(capturedEvent)).status).toBe(200);
  });

  it("asks Razorpay to retry on temporary failures", async () => {
    fulfillPaidOrder.mockRejectedValue(new Error("Shopify timeout"));
    expect((await webhook(capturedEvent)).status).toBe(500);
  });
});
