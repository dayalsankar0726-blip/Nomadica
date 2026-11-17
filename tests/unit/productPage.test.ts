import { describe, expect, it } from "vitest";
import { deliveryEstimate, isValidPincode, parseDayRange } from "@/lib/products/delivery";
import { hasText, sanitizeDescriptionHtml } from "@/lib/products/description";
import { sizeChartFor, TEE_SIZE_CHART } from "@/lib/products/sizeChart";

describe("isValidPincode", () => {
  it("accepts six digits not starting with 0", () => {
    expect(isValidPincode("560001")).toBe(true);
    expect(isValidPincode(" 110011 ")).toBe(true);
  });
  it("rejects anything else", () => {
    for (const bad of ["", "56000", "5600011", "060001", "56a001", "560 001"]) {
      expect(isValidPincode(bad)).toBe(false);
    }
  });
});

describe("deliveryEstimate", () => {
  it("parses day ranges with en dash, hyphen or a single number", () => {
    expect(parseDayRange("1–3")).toEqual([1, 3]);
    expect(parseDayRange("4-7")).toEqual([4, 7]);
    expect(parseDayRange("5")).toEqual([5, 5]);
    expect(parseDayRange("soon")).toBeNull();
  });
  it("adds processing and transit days from the policy", () => {
    const e = deliveryEstimate({ processingDays: "1–3", deliveryDays: "4–7" });
    expect(e.total).toBe("5–10 business days");
    expect(e.detail).toContain("1–3 business days");
    expect(e.detail).toContain("4–7 business days");
  });
  it("gives no total when the policy can't be added up", () => {
    expect(deliveryEstimate({ processingDays: "a few", deliveryDays: "4–7" }).total).toBeNull();
  });
});

describe("sanitizeDescriptionHtml", () => {
  it("keeps simple formatting and drops attributes", () => {
    expect(sanitizeDescriptionHtml('<p class="x" style="color:red">Soft <strong>cotton</strong></p>')).toBe(
      "<p>Soft <strong>cotton</strong></p>",
    );
  });
  it("removes scripts, styles, event handlers and unknown tags", () => {
    const out = sanitizeDescriptionHtml(
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><style>p{}</style><img src=x onerror=alert(1)><iframe src="x"></iframe>',
    );
    expect(out).toBe("<p>Hi</p>");
  });
  it("cuts everything after an unclosed script tag", () => {
    expect(sanitizeDescriptionHtml("<p>Ok</p><script>alert(1)")).toBe("<p>Ok</p>");
  });
  it("keeps only safe links", () => {
    expect(sanitizeDescriptionHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeDescriptionHtml('<a href="/support">x</a>')).toBe('<a href="/support" rel="noopener noreferrer nofollow">x</a>');
    expect(sanitizeDescriptionHtml('<a href="https://nomadica.in/a?b=1&amp;c=2">x</a>')).toBe(
      '<a href="https://nomadica.in/a?b=1&amp;c=2" rel="noopener noreferrer nofollow" target="_blank">x</a>',
    );
  });
  it("escapes stray angle brackets", () => {
    expect(sanitizeDescriptionHtml("Fits a < b")).toBe("Fits a &lt; b");
  });
  it("returns empty for empty or tag-only input", () => {
    expect(sanitizeDescriptionHtml("")).toBe("");
    expect(sanitizeDescriptionHtml("<p> </p>")).toBe("");
    expect(hasText("<p>x</p>")).toBe(true);
  });
});

describe("sizeChartFor", () => {
  it("returns the T-shirt chart only for tees", () => {
    expect(sizeChartFor({ productType: "Oversized Tee" })).toBe(TEE_SIZE_CHART);
    expect(sizeChartFor({ name: "Drift Cotton T-Shirt" })).toBe(TEE_SIZE_CHART);
    expect(sizeChartFor({ productType: "Trousers", name: "Desert Trek Trousers" })).toBeNull();
  });
  it("has one value per size in every row", () => {
    for (const row of TEE_SIZE_CHART.rows) expect(row.values).toHaveLength(TEE_SIZE_CHART.sizes.length);
  });
});
