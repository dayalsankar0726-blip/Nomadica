import { describe, expect, it } from "vitest";
import { groupByParcel, paymentSummary, trackingState } from "@/app/order-tracking/trackingStatus";

const base = { orderNumber: "#1001", createdAt: "2026-11-01T10:00:00Z" };

describe("trackingState", () => {
  it("labels a fulfilled order Shipped, not Delivered", () => {
    const s = trackingState({ ...base, fulfillmentStatus: "FULFILLED", shipments: [{ id: "f1", createdAt: "2026-11-02T10:00:00Z" }] });
    expect(s.label).toBe("Shipped");
    expect(s.steps.map((x) => x.done)).toEqual([true, true, true, false]);
    expect(s.steps[2].date).toBe("2026-11-02T10:00:00Z");
  });

  it("marks Delivered only when every parcel is delivered", () => {
    const s = trackingState({
      ...base,
      fulfillmentStatus: "FULFILLED",
      shipments: [
        { id: "f1", displayStatus: "DELIVERED", deliveredAt: "2026-11-05T10:00:00Z" },
        { id: "f2", displayStatus: "IN_TRANSIT" },
      ],
    });
    expect(s.label).toBe("Shipped");
    const d = trackingState({ ...base, fulfillmentStatus: "FULFILLED", shipments: [{ id: "f1", displayStatus: "DELIVERED" }] });
    expect(d.label).toBe("Delivered");
    expect(d.delivered).toBe(true);
  });

  it("shows a new order as placed and an in-progress one as being packed", () => {
    expect(trackingState({ ...base, fulfillmentStatus: "UNFULFILLED" }).label).toBe("Order placed");
    const packing = trackingState({ ...base, fulfillmentStatus: "IN_PROGRESS" });
    expect(packing.label).toBe("Being packed");
    expect(packing.steps.map((x) => x.done)).toEqual([true, true, false, false]);
  });

  it("shows partly shipped and cancelled orders", () => {
    expect(trackingState({ ...base, fulfillmentStatus: "PARTIALLY_FULFILLED" }).label).toBe("Partly shipped");
    const c = trackingState({ ...base, fulfillmentStatus: "UNFULFILLED", cancelledAt: "2026-11-02T00:00:00Z" });
    expect(c.cancelled).toBe(true);
    expect(c.label).toBe("Cancelled");
  });
});

describe("paymentSummary", () => {
  it("labels unpaid cash on delivery orders correctly", () => {
    expect(paymentSummary({ ...base, paymentMethod: "cod", financialStatus: "PENDING" })).toEqual({ method: "Cash on delivery", status: "To pay on delivery" });
  });

  it("does not call a pending online payment cash on delivery", () => {
    expect(paymentSummary({ ...base, paymentMethod: "online", financialStatus: "PENDING" })).toEqual({ method: "Paid online (Razorpay)", status: "Payment pending" });
    expect(paymentSummary({ ...base, financialStatus: "PENDING" }).method).toBeNull();
  });

  it("shows paid and refunded orders", () => {
    expect(paymentSummary({ ...base, paymentMethod: "online", financialStatus: "PAID" }).status).toBe("Paid");
    expect(paymentSummary({ ...base, paymentMethod: "cod", financialStatus: "REFUNDED" }).status).toBe("Refunded");
  });
});

describe("groupByParcel", () => {
  const items = [
    { id: "li1", quantity: 2 },
    { id: "li2", quantity: 1 },
  ];

  it("groups shipped items by parcel and keeps the rest as not shipped", () => {
    const groups = groupByParcel(items, [{ id: "f1", items: [{ lineItemId: "li1", quantity: 1 }] }]);
    expect(groups).toHaveLength(2);
    expect(groups[0].shipment?.id).toBe("f1");
    expect(groups[0].items).toEqual([{ item: items[0], quantity: 1 }]);
    expect(groups[1].shipment).toBeNull();
    expect(groups[1].items).toEqual([{ item: items[0], quantity: 1 }, { item: items[1], quantity: 1 }]);
  });

  it("puts everything in one unshipped group when nothing has shipped", () => {
    expect(groupByParcel(items)).toEqual([{ shipment: null, items: [{ item: items[0], quantity: 2 }, { item: items[1], quantity: 1 }] }]);
  });
});
