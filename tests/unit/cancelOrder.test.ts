import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));
vi.mock("@/lib/devMocks", () => ({ devSamplesEnabled: () => false }));

// The customer's own orders, as their Storefront token sees them.
const ownOrders = vi.fn(async (_token: string) => [{ node: { id: "gid://shopify/Order/1?key=abc" } }]);
vi.mock("@/lib/shopify/customerOrders", () => ({ fetchCustomerOrders: (t: string) => ownOrders(t) }));

// Fake Shopify Admin API.
type AdminOrder = {
  id: string;
  name: string;
  cancelledAt: string | null;
  displayFulfillmentStatus: string;
  displayFinancialStatus: string;
  tags: string[];
};
let adminOrder: AdminOrder;
let cancelErrors: Array<{ message: string }> = [];
const adminCalls: Array<{ name: string; vars: Record<string, unknown> }> = [];
const request = vi.fn(async (query: string, vars: Record<string, unknown>) => {
  const name = query.match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? "unknown";
  adminCalls.push({ name, vars });
  if (name === "CancelCheck") return { order: adminOrder };
  if (name === "CancelOrder") {
    return { orderCancel: { job: cancelErrors.length ? null : { id: "job-1" }, orderCancelUserErrors: cancelErrors } };
  }
  return {};
});
vi.mock("@/lib/shopify/admin", () => ({ getAdminClient: () => ({ request }) }));

// Fake Razorpay.
let payment: { amount: number; amount_refunded: number; status: string };
const refund = vi.fn(async (_id: string, _opts: Record<string, unknown>) => ({ id: "rfnd_1" }));
const fetchPayment = vi.fn(async (_id: string) => payment);
vi.mock("@/lib/checkout/razorpay", () => ({
  getRazorpay: () => ({ client: { payments: { fetch: fetchPayment, refund } } }),
}));

const { cancelCustomerOrder, paymentIdFromTags, staffNoteFor } = await import("@/lib/checkout/cancelOrder");
const { canCustomerCancel, cancelledMessage } = await import("@/lib/orders/cancellation");

const req = { customerAccessToken: "tok", orderId: "gid://shopify/Order/1?key=abc", reason: "no_longer_needed" };
const names = () => adminCalls.map((c) => c.name);
const cancelVars = () => adminCalls.find((c) => c.name === "CancelOrder")?.vars;

beforeEach(() => {
  adminCalls.length = 0;
  cancelErrors = [];
  refund.mockClear();
  fetchPayment.mockClear();
  ownOrders.mockClear();
  adminOrder = {
    id: "gid://shopify/Order/1",
    name: "#1001",
    cancelledAt: null,
    displayFulfillmentStatus: "UNFULFILLED",
    displayFinancialStatus: "PENDING",
    tags: ["nomadica-web", "cod"],
  };
  payment = { amount: 269800, amount_refunded: 0, status: "captured" };
});

describe("cancelCustomerOrder", () => {
  it("cancels a cash-on-delivery order, restocks it and refunds nothing", async () => {
    const result = await cancelCustomerOrder(req);
    expect(result).toEqual({ orderNumber: "#1001", refund: "none", refundAmount: undefined });
    expect(names()).toEqual(["CancelCheck", "CancelOrder"]);
    expect(cancelVars()).toMatchObject({ orderId: "gid://shopify/Order/1", reason: "CUSTOMER", restock: true, notifyCustomer: true });
    expect(cancelVars()?.refundMethod).toBeUndefined();
    expect(String(cancelVars()?.staffNote)).toContain("I no longer need it");
    expect(refund).not.toHaveBeenCalled();
  });

  it("refunds an order paid online in full through Razorpay", async () => {
    adminOrder.tags = ["nomadica-web", "rzp-pay_123"];
    adminOrder.displayFinancialStatus = "PAID";
    const result = await cancelCustomerOrder(req);
    expect(cancelVars()?.refundMethod).toEqual({ originalPaymentMethodsRefund: true });
    expect(refund).toHaveBeenCalledWith("pay_123", expect.objectContaining({ amount: 269800, speed: "normal" }));
    expect(result).toEqual({ orderNumber: "#1001", refund: "started", refundAmount: 2698 });
  });

  it("refuses an order that isn't in the customer's own list", async () => {
    await expect(cancelCustomerOrder({ ...req, orderId: "gid://shopify/Order/999?key=x" })).rejects.toMatchObject({ status: 404 });
    expect(adminCalls).toHaveLength(0);
  });

  it("refuses once the order is being packed or has shipped", async () => {
    for (const status of ["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"]) {
      adminCalls.length = 0;
      adminOrder.displayFulfillmentStatus = status;
      await expect(cancelCustomerOrder(req)).rejects.toMatchObject({ status: 409 });
      expect(names()).toEqual(["CancelCheck"]);
    }
  });

  it("doesn't cancel twice, and doesn't refund twice", async () => {
    adminOrder.cancelledAt = "2026-11-09T10:00:00Z";
    adminOrder.tags = ["rzp-pay_123"];
    adminOrder.displayFinancialStatus = "REFUNDED";
    payment.amount_refunded = 269800;
    const result = await cancelCustomerOrder(req);
    expect(result.refund).toBe("already_refunded");
    expect(names()).toEqual(["CancelCheck"]);
    expect(refund).not.toHaveBeenCalled();
  });

  it("retries a refund that failed earlier on an already cancelled order", async () => {
    adminOrder.cancelledAt = "2026-11-09T10:00:00Z";
    adminOrder.tags = ["rzp-pay_123"];
    adminOrder.displayFinancialStatus = "REFUNDED";
    const result = await cancelCustomerOrder(req);
    expect(result.refund).toBe("started");
    expect(names()).toEqual(["CancelCheck"]);
  });

  it("keeps the order cancelled and flags a manual refund when Razorpay fails", async () => {
    adminOrder.tags = ["rzp-pay_123"];
    adminOrder.displayFinancialStatus = "PAID";
    refund.mockRejectedValueOnce(new Error("Razorpay is down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await cancelCustomerOrder(req);
    expect(result.refund).toBe("manual");
    expect(names()).toContain("CancelOrder");
    expect(errors.mock.calls[0][0]).toContain("REFUND NEEDS MANUAL ACTION");
    errors.mockRestore();
  });

  it("reports a Shopify failure without refunding", async () => {
    adminOrder.tags = ["rzp-pay_123"];
    adminOrder.displayFinancialStatus = "PAID";
    cancelErrors = [{ message: "Order can't be cancelled" }];
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(cancelCustomerOrder(req)).rejects.toMatchObject({ status: 502 });
    expect(refund).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("requires a valid reason", async () => {
    await expect(cancelCustomerOrder({ ...req, reason: "hacked" })).rejects.toMatchObject({ status: 400 });
    expect(ownOrders).not.toHaveBeenCalled();
  });
});

describe("cancellation helpers", () => {
  it("only allows cancelling before anything is packed or shipped", () => {
    expect(canCustomerCancel({ fulfillmentStatus: "UNFULFILLED" })).toBe(true);
    expect(canCustomerCancel({ fulfillmentStatus: "ON_HOLD" })).toBe(true);
    expect(canCustomerCancel({ fulfillmentStatus: "IN_PROGRESS" })).toBe(false);
    expect(canCustomerCancel({ fulfillmentStatus: "FULFILLED" })).toBe(false);
    expect(canCustomerCancel({ fulfillmentStatus: "UNFULFILLED", cancelledAt: "2026-11-09" })).toBe(false);
  });

  it("reads the Razorpay payment ID from the order tags", () => {
    expect(paymentIdFromTags(["nomadica-web", "rzp-pay_ABC"])).toBe("pay_ABC");
    expect(paymentIdFromTags("nomadica-web, rzp-pay_ABC")).toBe("pay_ABC");
    expect(paymentIdFromTags(["cod"])).toBeNull();
  });

  it("keeps the customer's note short and on one line", () => {
    const note = staffNoteFor("other", "line one\nline two " + "x".repeat(600));
    expect(note).toContain("Reason: Other reason. Customer note: line one line two");
    expect(note.length).toBeLessThan(620);
  });

  it("tells the customer what happens to their money", () => {
    expect(cancelledMessage({ orderNumber: "#1001", refund: "none" })).toBe("Order #1001 has been cancelled.");
    expect(cancelledMessage({ orderNumber: "#1001", refund: "started", refundAmount: 2698 })).toContain("refund of ₹2,698 has been started");
    expect(cancelledMessage({ orderNumber: "#1001", refund: "manual" })).toContain("support@nomadica.in");
  });
});
