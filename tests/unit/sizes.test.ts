import { describe, expect, it } from "vitest";
import { sizeOf, sizeOptions, variantForSize } from "@/lib/products/sizes";

const v = (id: string, size: string, available = true, color = "Black") => ({
  id,
  title: `${size} / ${color}`,
  available,
  selectedOptions: [
    { name: "Size", value: size },
    { name: "Color", value: color },
  ],
});

const tee = [v("xs", "XS"), v("s", "S"), v("m", "M", false), v("l", "L"), v("xl", "XL"), v("xxl", "XXL")];

describe("sizeOptions", () => {
  it("lists only the product's real sizes, in size order, with stock", () => {
    const shuffled = [tee[4], tee[0], tee[3], tee[1], tee[5], tee[2]];
    expect(sizeOptions(shuffled)).toEqual([
      { label: "XS", variantId: "xs", available: true },
      { label: "S", variantId: "s", available: true },
      { label: "M", variantId: "m", available: false },
      { label: "L", variantId: "l", available: true },
      { label: "XL", variantId: "xl", available: true },
      { label: "XXL", variantId: "xxl", available: true },
    ]);
  });

  it("keeps labels like 'M - 40' and sorts numeric sizes", () => {
    expect(sizeOptions([v("b", "L - 42"), v("a", "M - 40")]).map((o) => o.label)).toEqual(["M - 40", "L - 42"]);
    expect(sizeOptions([v("b", "34"), v("a", "30"), v("c", "32")]).map((o) => o.label)).toEqual(["30", "32", "34"]);
  });

  it("is empty for a one-size product", () => {
    expect(sizeOptions([{ id: "one", title: "Default Title", available: true }])).toEqual([]);
  });

  it("falls back to the variant title when options are missing", () => {
    expect(sizeOf({ id: "x", title: "M / Black" })).toBe("M");
  });
});

describe("variantForSize", () => {
  it("adds exactly the chosen size: S never matches XS, L never matches XL", () => {
    expect(variantForSize(tee, "S")?.id).toBe("s");
    expect(variantForSize(tee, "L")?.id).toBe("l");
    expect(variantForSize(tee, "XL")?.id).toBe("xl");
  });

  it("returns nothing when no size is chosen, or the size is sold out or missing", () => {
    expect(variantForSize(tee, null)).toBeNull();
    expect(variantForSize(tee, "M")).toBeNull();
    expect(variantForSize(tee, "3XL")).toBeNull();
  });

  it("uses the first in-stock variant of a one-size product", () => {
    expect(variantForSize([{ id: "one", title: "Default Title", available: true }], null)?.id).toBe("one");
    expect(variantForSize([{ id: "one", title: "Default Title", available: false }], null)).toBeNull();
  });
});
