import { describe, expect, it } from "vitest";
import { loginUrlFor, safeRedirect, withRedirect } from "@/app/account/_lib/redirect";
import { isValidPin, mobileDigits, normalizeIndianMobile, passwordProblem, PASSWORD_RULES } from "@/app/account/_lib/validation";
import { isShopifyResetUrl } from "@/app/account/_lib/resetUrl";
import { canRequestReturn, orderStatus, paymentLabel, timelineSteps, unitsRemaining } from "@/app/account/_lib/orderStatus";

describe("safeRedirect", () => {
  it("keeps same-site relative paths", () => {
    expect(safeRedirect("/account/orders")).toBe("/account/orders");
    expect(safeRedirect("/shop/product-details?handle=tee&size=M")).toBe("/shop/product-details?handle=tee&size=M");
  });

  it("rejects other sites and tricks", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "evil", "/a\nb", "/a\tb", "", null, undefined]) {
      expect(safeRedirect(bad as string)).toBeNull();
    }
  });

  it("rejects sign-in pages so sign-in can't loop", () => {
    expect(safeRedirect("/account/login")).toBeNull();
    expect(safeRedirect("/account/signup?redirect=/x")).toBeNull();
    expect(safeRedirect("/account/loginx")).toBe("/account/loginx");
  });

  it("builds sign-in links", () => {
    expect(loginUrlFor("/account/wishlist")).toBe("/account/login?redirect=%2Faccount%2Fwishlist");
    expect(withRedirect("/account/signup", "https://evil.example")).toBe("/account/signup");
  });
});

describe("password rules", () => {
  it("accepts a good password", () => {
    expect(passwordProblem("travel2025")).toBeNull();
    expect(PASSWORD_RULES.every((r) => r.test("travel2025"))).toBe(true);
  });

  it("explains what is wrong", () => {
    expect(passwordProblem("")).toMatch(/enter a password/);
    expect(passwordProblem("abc1")).toMatch(/at least 8/);
    expect(passwordProblem("a1".repeat(21))).toMatch(/at most 40/);
    expect(passwordProblem("12345678")).toMatch(/letter/);
    expect(passwordProblem("abcdefgh")).toMatch(/number/);
    expect(passwordProblem(" abcdefg1")).toMatch(/space/);
  });
});

describe("Indian mobile numbers and PIN codes", () => {
  it("normalizes mobile numbers", () => {
    expect(normalizeIndianMobile("98765 43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("+91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("09876543210")).toBe("+919876543210");
    expect(normalizeIndianMobile("919876543210")).toBe("+919876543210");
    expect(normalizeIndianMobile("5876543210")).toBeNull();
    expect(normalizeIndianMobile("98765")).toBeNull();
    expect(mobileDigits("+919876543210")).toBe("9876543210");
  });

  it("checks PIN codes", () => {
    expect(isValidPin("560001")).toBe(true);
    expect(isValidPin("060001")).toBe(false);
    expect(isValidPin("56000")).toBe(false);
    expect(isValidPin("56000a")).toBe(false);
  });
});

describe("isShopifyResetUrl", () => {
  it("accepts Shopify reset links", () => {
    expect(isShopifyResetUrl("https://nomadica.myshopify.com/account/reset/123456/abc-DEF_123")).toBe(true);
    expect(isShopifyResetUrl("https://nomadica.in/en-in/account/reset/1/token")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isShopifyResetUrl("http://nomadica.in/account/reset/1/token")).toBe(false);
    expect(isShopifyResetUrl("https://nomadica.in/account/login")).toBe(false);
    expect(isShopifyResetUrl("https://user:pw@nomadica.in/account/reset/1/token")).toBe(false);
    expect(isShopifyResetUrl("not a url")).toBe(false);
  });
});

describe("orderStatus", () => {
  it("maps each Shopify fulfilment status", () => {
    expect(orderStatus({ fulfillmentStatus: "UNFULFILLED" }).stage).toBe("PLACED");
    expect(orderStatus({ fulfillmentStatus: "ON_HOLD" }).stage).toBe("PLACED");
    expect(orderStatus({ fulfillmentStatus: "IN_PROGRESS" }).stage).toBe("PACKED");
    expect(orderStatus({ fulfillmentStatus: "PENDING_FULFILLMENT" }).stage).toBe("PACKED");
    expect(orderStatus({ fulfillmentStatus: "FULFILLED" }).stage).toBe("SHIPPED");
    expect(orderStatus({ fulfillmentStatus: "RESTOCKED" }).stage).toBe("RETURNED");
    const partial = orderStatus({ fulfillmentStatus: "PARTIALLY_FULFILLED" });
    expect(partial.stage).toBe("SHIPPED");
    expect(partial.label).toBe("Partly shipped");
  });

  it("only says Delivered with a delivery signal", () => {
    expect(orderStatus({ fulfillmentStatus: "FULFILLED" }).label).toBe("Shipped");
    expect(orderStatus({ fulfillmentStatus: "FULFILLED", delivered: true }).stage).toBe("DELIVERED");
    expect(orderStatus({ fulfillmentStatus: "IN_PROGRESS", delivered: true }).stage).toBe("PACKED");
  });

  it("cancelled wins", () => {
    expect(orderStatus({ cancelledAt: "2025-01-01", fulfillmentStatus: "UNFULFILLED", financialStatus: "REFUNDED" })).toMatchObject({
      stage: "CANCELLED",
      detail: "Cancelled and refunded.",
    });
  });

  it("reads development sample statuses", () => {
    expect(orderStatus({ sampleStatus: "Delivered" }).stage).toBe("DELIVERED");
    expect(orderStatus({ sampleStatus: "In Transit" }).stage).toBe("SHIPPED");
    expect(orderStatus({ sampleStatus: "Pending COD" }).stage).toBe("PLACED");
  });

  it("labels payment and steps", () => {
    expect(paymentLabel("PAID")).toBe("Paid online");
    expect(paymentLabel("PENDING")).toBe("Cash on delivery");
    expect(paymentLabel("SOMETHING")).toBeNull();
    expect(timelineSteps("PACKED").map((s) => s.done)).toEqual([true, true, false, false]);
    expect(timelineSteps("CANCELLED")).toEqual([]);
  });

  it("offers returns only after shipping", () => {
    expect(canRequestReturn("SHIPPED", false)).toBe(true);
    expect(canRequestReturn("SHIPPED", true)).toBe(false);
    expect(canRequestReturn("PLACED", false)).toBe(false);
    expect(canRequestReturn("DELIVERED", false)).toBe(true);
  });

  it("counts remaining units", () => {
    expect(unitsRemaining([{ quantity: 2 }, { quantity: 0 }, { quantity: 1 }])).toBe(3);
  });
});

import { buyAgainLines, mapOrder, returnMailto, variantParts } from "@/app/account/_lib/orders";

describe("order view helpers", () => {
  it("maps an API order without inventing images or dates", () => {
    const order = mapOrder({
      id: "gid://shopify/Order/1",
      orderNumber: "#1001",
      createdAt: "2026-01-02T10:00:00Z",
      fulfillmentStatus: "IN_PROGRESS",
      totalPrice: { amount: "1998.00" },
      canCancel: false,
      lineItems: {
        edges: [
          { node: { id: "gid://shopify/ProductVariant/9", title: "Tee", quantity: 2, cancelledQuantity: 1, paidUnitPrice: "999.00", variant: { id: "gid://shopify/ProductVariant/9", title: "M / Black", price: { amount: "1099" } } } },
        ],
      },
    });
    expect(order.number).toBe("1001");
    expect(order.status.stage).toBe("PACKED");
    expect(order.units).toBe(2);
    expect(order.items[0]).toMatchObject({ size: "M", color: "Black", image: null, paidUnitPrice: 999, lineId: "gid://shopify/ProductVariant/9" });
  });

  it("buys again with the same variants, skipping deleted products", () => {
    expect(
      buyAgainLines([
        { variantId: "gid://shopify/ProductVariant/9", quantity: 2, cancelledQuantity: 0 },
        { variantId: "", quantity: 1, cancelledQuantity: 0 },
        { variantId: "gid://shopify/ProductVariant/8", quantity: 0, cancelledQuantity: 1 },
      ])
    ).toEqual([
      { merchandiseId: "gid://shopify/ProductVariant/9", quantity: 2 },
      { merchandiseId: "gid://shopify/ProductVariant/8", quantity: 1 },
    ]);
  });

  it("reads variant titles and builds the return email", () => {
    expect(variantParts("Default Title")).toEqual({ size: null, color: null });
    expect(returnMailto("#1001")).toMatch(/^mailto:support@nomadica\.in\?subject=Return%20request%20for%20order%20%231001/);
  });
});
