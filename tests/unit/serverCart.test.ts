import { describe, expect, it } from "vitest";
import { buildServerCart, CartError, SHIPPING_FEE } from "@/lib/checkout/serverCart";

const line = (unitPrice: number, quantity = 1) => ({
  variantId: "gid://shopify/ProductVariant/1",
  title: "Tee",
  quantity,
  unitPrice,
});

describe("buildServerCart", () => {
  it("adds the shipping fee at or below the free-shipping threshold", () => {
    const cart = buildServerCart("c1", [line(999, 2)], "INR", false);
    expect(cart.subtotal).toBe(1998);
    expect(cart.shipping).toBe(SHIPPING_FEE);
    expect(cart.total).toBe(1998 + SHIPPING_FEE);
    expect(cart.totalMinor).toBe((1998 + SHIPPING_FEE) * 100);
  });

  it("gives free shipping above the threshold", () => {
    const cart = buildServerCart("c1", [line(1499, 2)], "INR", false);
    expect(cart.shipping).toBe(0);
    expect(cart.totalMinor).toBe(299800);
  });

  it("works in paise so decimal prices don't drift", () => {
    const cart = buildServerCart("c1", [line(0.1, 3), line(0.2)], "INR", false);
    expect(cart.totalMinor).toBe(50 + SHIPPING_FEE * 100);
  });

  it("rejects an empty cart", () => {
    expect(() => buildServerCart("c1", [], "INR", false)).toThrow(CartError);
  });

  it("rejects zero, negative or fractional quantities", () => {
    for (const q of [0, -1, 1.5, 101]) {
      expect(() => buildServerCart("c1", [line(100, q)], "INR", false)).toThrow(/quantity/);
    }
  });

  it("rejects zero or missing prices", () => {
    expect(() => buildServerCart("c1", [line(0)], "INR", false)).toThrow(/price/);
    expect(() => buildServerCart("c1", [line(NaN)], "INR", false)).toThrow(/price/);
  });
});
