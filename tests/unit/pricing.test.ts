import { describe, expect, it } from "vitest";
import { compareAtPrice, discountPercent } from "@/lib/pricing";

describe("compareAtPrice", () => {
  it("returns Shopify's compare-at price only when it is higher than the price", () => {
    expect(compareAtPrice(599, "999.00")).toBe(999);
    expect(compareAtPrice(599, 999)).toBe(999);
  });

  it("never invents a price when there is no real discount", () => {
    expect(compareAtPrice(599, undefined)).toBeUndefined();
    expect(compareAtPrice(599, null)).toBeUndefined();
    expect(compareAtPrice(599, "")).toBeUndefined();
    expect(compareAtPrice(599, "0.00")).toBeUndefined();
    expect(compareAtPrice(599, "599.00")).toBeUndefined();
    expect(compareAtPrice(599, "499.00")).toBeUndefined();
  });
});

describe("discountPercent", () => {
  it("rounds the real discount", () => {
    expect(discountPercent(599, 999)).toBe(40);
    expect(discountPercent(1499, 1999)).toBe(25);
  });

  it("is empty without a real discount", () => {
    expect(discountPercent(599)).toBeUndefined();
    expect(discountPercent(599, 599)).toBeUndefined();
  });
});

describe("formatINR", () => {
  it("formats rupees the Indian way, with paise only when needed", async () => {
    const { formatINR } = await import("@/lib/pricing");
    expect(formatINR(1499)).toBe("₹1,499");
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(599.5)).toBe("₹599.50");
    expect(formatINR("99.00")).toBe("₹99");
    expect(formatINR(undefined)).toBe("₹0");
  });
});
