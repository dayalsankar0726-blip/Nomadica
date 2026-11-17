import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));
vi.mock("@/lib/devMocks", () => ({ devSamplesEnabled: () => false }));

// The customer's own orders, as their Storefront token sees them.
const ownOrders = vi.fn(async (_token: string) => [{ node: { id: "gid://shopify/Order/1?key=abc" } }]);
vi.mock("@/lib/shopify/customerOrders", () => ({ fetchCustomerOrders: (t: string) => ownOrders(t) }));

const TEE = "gid://shopify/ProductVariant/10";
const CAP = "gid://shopify/ProductVariant/20";

// Fake Shopify Admin API.
type Line = { id: string; title: string; currentQuantity: number; variant: { id: string }; unit: string };
let order: {
  cancelledAt: string | null;
  displayFulfillmentStatus: string;
  displayFinancialStatus: string;
  tags: string[];
  lines: Line[];
};
let editErrors: Array<{ message: string }> = [];
const calls: Array<{ name: string; vars: Record<string, unknown> }> = [];
const request = vi.fn(async (query: string, vars: Record<string, unknown>) => {
  const name = query.match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? "unknown";
  calls.push({ name, vars });
  switch (name) {
    case "CancelItemCheck":
    case "CancelCheck":
      return {
        order: {
          id: "gid://shopify/Order/1",
          name: "#1001",
          ...order,
          lineItems: {
            nodes: order.lines.map((l) => ({
              id: l.id,
              title: l.title,
              currentQuantity: l.currentQuantity,
              variant: l.variant,
              discountedUnitPriceAfterAllDiscountsSet: { shopMoney: { amount: l.unit } },
            })),
          },
        },
      };
    case "CancelItemBegin":
      return {
        orderEditBegin: {
          calculatedOrder: { id: "calc-1", lineItems: { nodes: order.lines.map((l) => ({ id: `calc-${l.id}`, variant: l.variant })) } },
          userErrors: [],
        },
      };
    case "CancelItemSetQuantity":
      return { orderEditSetQuantity: { calculatedOrder: editErrors.length ? null : { id: "calc-1" }, userErrors: editErrors } };
    case "CancelItemCommit":
      return { orderEditCommit: { order: { id: "gid://shopify/Order/1" }, userErrors: [] } };
    case "CancelItemPayment":
      return { order: { transactions: [{ id: "txn-1", kind: "SALE", status: "SUCCESS", gateway: "manual" }] } };
    case "CancelItemRefund":
      return { refundCreate: { refund: { id: "refund-1" }, userErrors: [] } };
    case "CancelOrder":
      return { orderCancel: { job: { id: "job-1" }, orderCancelUserErrors: [] } };
  }
  return {};
});
vi.mock("@/lib/shopify/admin", () => ({ getAdminClient: () => ({ request }) }));

// Fake Razorpay.
let payment: { amount: number; amount_refunded: number; status: string };
const refund = vi.fn(async (_id: string, _opts: Record<string, unknown>) => ({ id: "rfnd_1" }));
vi.mock("@/lib/checkout/razorpay", () => ({
  getRazorpay: () => ({ client: { payments: { fetch: async () => payment, refund } } }),
}));

const { cancelCustomerOrderItem } = await import("@/lib/checkout/cancelOrderItem");
const { itemCancelledMessage } = await import("@/lib/orders/cancellation");

const req = {
  customerAccessToken: "tok",
  orderId: "gid://shopify/Order/1?key=abc",
  itemId: TEE,
  quantity: 1,
  reason: "no_longer_needed",
};
const names = () => calls.map((c) => c.name);
const varsOf = (name: string) => calls.find((c) => c.name === name)?.vars;

beforeEach(() => {
  calls.length = 0;
  editErrors = [];
  refund.mockClear();
  ownOrders.mockClear();
  order = {
    cancelledAt: null,
    displayFulfillmentStatus: "UNFULFILLED",
    displayFinancialStatus: "PENDING",
    tags: ["nomadica-web", "cod"],
    lines: [
      { id: "li-1", title: "Nomad Tee", currentQuantity: 2, variant: { id: TEE }, unit: "1199.00" },
      { id: "li-2", title: "Trail Cap", currentQuantity: 1, variant: { id: CAP }, unit: "599.00" },
    ],
  };
  payment = { amount: 299700, amount_refunded: 0, status: "captured" };
});

describe("cancelCustomerOrderItem", () => {
  it("removes one item from a cash-on-delivery order, restocks it and refunds nothing", async () => {
    const result = await cancelCustomerOrderItem(req);
    expect(names()).toEqual(["CancelItemCheck", "CancelItemBegin", "CancelItemSetQuantity", "CancelItemCommit"]);
    expect(varsOf("CancelItemSetQuantity")).toEqual({ id: "calc-1", lineItemId: "calc-li-1", quantity: 1 });
    expect(String(varsOf("CancelItemCommit")?.staffNote)).toContain("1 × Nomad Tee cancelled");
    expect(refund).not.toHaveBeenCalled();
    expect(result).toMatchObject({ orderNumber: "#1001", refund: "none", itemTitle: "Nomad Tee", quantity: 1, remainingQuantity: 1, orderCancelled: false });
  });

  it("refunds only the cancelled item's price on an order paid online, and records it in Shopify", async () => {
    order.tags = ["nomadica-web", "rzp-pay_123"];
    order.displayFinancialStatus = "PAID";
    const result = await cancelCustomerOrderItem({ ...req, quantity: 2 });
    expect(varsOf("CancelItemSetQuantity")).toMatchObject({ quantity: 0 });
    expect(refund).toHaveBeenCalledWith("pay_123", expect.objectContaining({ amount: 239800 }));
    expect(result).toMatchObject({ refund: "started", refundAmount: 2398, orderCancelled: false });
    const refundInput = varsOf("CancelItemRefund")?.input as { transactions: Array<Record<string, unknown>> };
    expect(refundInput.transactions[0]).toMatchObject({ parentId: "txn-1", kind: "REFUND", amount: "2398.00" });
  });

  it("cancels the whole order when the last item is cancelled", async () => {
    order.lines = [order.lines[1]];
    order.tags = ["rzp-pay_123"];
    order.displayFinancialStatus = "PAID";
    const result = await cancelCustomerOrderItem({ ...req, itemId: CAP });
    expect(names()).toEqual(["CancelItemCheck", "CancelCheck", "CancelOrder"]);
    // The whole payment, shipping included, goes back.
    expect(refund).toHaveBeenCalledWith("pay_123", expect.objectContaining({ amount: 299700 }));
    expect(result).toMatchObject({ orderCancelled: true, refund: "started" });
  });

  it("refuses an order that isn't in the customer's own list", async () => {
    await expect(cancelCustomerOrderItem({ ...req, orderId: "gid://shopify/Order/999?key=x" })).rejects.toMatchObject({ status: 404 });
    expect(calls).toHaveLength(0);
  });

  it("refuses once the order is being packed or has shipped", async () => {
    order.displayFulfillmentStatus = "IN_PROGRESS";
    await expect(cancelCustomerOrderItem(req)).rejects.toMatchObject({ status: 409 });
    expect(names()).toEqual(["CancelItemCheck"]);
  });

  it("refuses an item that's already cancelled, or more than are left", async () => {
    order.lines[0].currentQuantity = 0;
    await expect(cancelCustomerOrderItem(req)).rejects.toMatchObject({ status: 409 });
    order.lines[0].currentQuantity = 2;
    await expect(cancelCustomerOrderItem({ ...req, quantity: 3 })).rejects.toMatchObject({ status: 400 });
    expect(names()).not.toContain("CancelItemBegin");
  });

  it("refuses an item that isn't on the order, and a bad quantity", async () => {
    await expect(cancelCustomerOrderItem({ ...req, itemId: "gid://shopify/ProductVariant/99" })).rejects.toMatchObject({ status: 404 });
    await expect(cancelCustomerOrderItem({ ...req, quantity: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(cancelCustomerOrderItem({ ...req, quantity: 1.5 })).rejects.toMatchObject({ status: 400 });
  });

  it("doesn't refund when Shopify can't remove the item", async () => {
    order.tags = ["rzp-pay_123"];
    order.displayFinancialStatus = "PAID";
    editErrors = [{ message: "Line item can't be edited" }];
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(cancelCustomerOrderItem(req)).rejects.toMatchObject({ status: 502 });
    expect(names()).not.toContain("CancelItemCommit");
    expect(refund).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("keeps the item cancelled and flags a manual refund when Razorpay fails", async () => {
    order.tags = ["rzp-pay_123"];
    order.displayFinancialStatus = "PAID";
    refund.mockRejectedValueOnce(new Error("Razorpay is down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await cancelCustomerOrderItem(req);
    expect(result.refund).toBe("manual");
    expect(names()).toContain("CancelItemCommit");
    expect(names()).not.toContain("CancelItemRefund");
    errors.mockRestore();
  });
});

describe("itemCancelledMessage", () => {
  const base = { orderNumber: "#1001", itemTitle: "Nomad Tee", quantity: 1, remainingQuantity: 0, orderCancelled: false };
  it("tells the customer what happened to the item and their money", () => {
    expect(itemCancelledMessage({ ...base, refund: "none" })).toBe(
      "Nomad Tee has been removed from order #1001. The rest of your order is unchanged."
    );
    expect(itemCancelledMessage({ ...base, remainingQuantity: 1, refund: "started", refundAmount: 1199 })).toContain(
      "Order #1001 now has 1 × Nomad Tee (was 2). Your refund of ₹1,199"
    );
    expect(itemCancelledMessage({ ...base, refund: "manual" })).toContain("support@nomadica.in");
    expect(itemCancelledMessage({ ...base, orderCancelled: true, refund: "none" })).toBe(
      "Order #1001 has been cancelled, as that was the last item in it."
    );
  });
});
