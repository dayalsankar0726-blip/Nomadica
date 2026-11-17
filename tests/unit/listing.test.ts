import { describe, expect, it } from "vitest";
import {
  badgeOf,
  buildFilterOptions,
  groupHasColor,
  groupHasSize,
  listingQueryString,
  mapProductNode,
  parseListingState,
  pluralize,
  shopifySort,
  toShopifyQuery,
} from "@/lib/products/listing";

const variant = (size: string) => ({ node: { id: `v-${size}`, title: size, selectedOptions: [{ name: "Size", value: size }] } });

describe("mapProductNode", () => {
  it("maps a Storefront node with the first variant's price and compare-at price", () => {
    const p = mapProductNode({
      id: "gid://shopify/Product/1",
      title: "Drift Tee",
      handle: "drift-tee",
      productType: "Tee",
      images: { edges: [{ node: { url: "a.jpg" } }, { node: { url: "b.jpg" } }] },
      variants: { edges: [{ node: { price: { amount: "999.00" }, compareAtPrice: { amount: "1299.00" } } }] },
      collections: { edges: [{ node: { title: "Beach", handle: "beach" } }] },
    });
    expect(p.price).toBe(999);
    expect(p.originalPrice).toBe(1299);
    expect(p.image).toBe("a.jpg");
    expect(p.hoverImage).toBe("b.jpg");
    expect(p.collections).toContain("Beach");
    expect(p.badge).toBeUndefined();
  });
  it("only uses a badge the store set", () => {
    expect(badgeOf({ badgeField: { value: "Limited" } })).toBe("Limited");
    expect(badgeOf({ badgeField: { value: "  " } })).toBeUndefined();
    expect(badgeOf({})).toBeUndefined();
  });
});

describe("listing state in the URL", () => {
  it("reads sort and filters", () => {
    const s = parseListingState(new URLSearchParams("sort=price-asc&size=M,L&color=Black&collection=Beach%20Vibes"));
    expect(s).toEqual({ sort: "price-asc", sizes: ["M", "L"], colors: ["Black"], collections: ["Beach Vibes"] });
  });
  it("falls back to the default sort for unknown values", () => {
    expect(parseListingState(new URLSearchParams("sort=bogus"), "newest").sort).toBe("newest");
    expect(parseListingState(null).sort).toBe("featured");
  });
  it("writes a clean query string and keeps other params", () => {
    expect(listingQueryString({ sort: "featured", sizes: [], colors: [], collections: [] }, "q=tee&size=M")).toBe("q=tee");
    expect(listingQueryString({ sort: "newest", sizes: ["S"], colors: [], collections: [] })).toBe("sort=newest&size=S");
    expect(listingQueryString({ sort: "newest", sizes: [], colors: [], collections: [] }, "", "newest")).toBe("");
  });
});

describe("shopifySort", () => {
  it("maps to collection and catalogue sort keys", () => {
    expect(shopifySort("newest", true)).toEqual({ sortKey: "CREATED", reverse: true });
    expect(shopifySort("newest", false)).toEqual({ sortKey: "CREATED_AT", reverse: true });
    expect(shopifySort("price-desc", false)).toEqual({ sortKey: "PRICE", reverse: true });
    expect(shopifySort("featured", false)).toEqual({});
    expect(shopifySort("featured", true)).toEqual({ sortKey: "COLLECTION_DEFAULT" });
  });
});

describe("filter options", () => {
  const groups = [
    { allVariants: [variant("M"), variant("S")], colorVariants: [{ colorName: "Black" }, { colorName: "White" }] },
    { allVariants: [variant("XL"), variant("M")], colorVariants: [{ colorName: "Black" }, { colorName: "Original" }] },
  ];
  it("builds sizes in size order and colours with product counts", () => {
    const o = buildFilterOptions(groups);
    expect(o.sizes).toEqual([
      { value: "S", count: 1 },
      { value: "M", count: 2 },
      { value: "XL", count: 1 },
    ]);
    expect(o.colors).toEqual([
      { value: "Black", count: 2 },
      { value: "White", count: 1 },
    ]);
  });
  it("matches sizes and colours exactly", () => {
    expect(groupHasSize(groups[0], ["S"])).toBe(true);
    expect(groupHasSize(groups[1], ["S"])).toBe(false);
    expect(groupHasSize(groups[1], [])).toBe(true);
    expect(groupHasColor(groups[0], ["white"])).toBe(true);
    expect(groupHasColor(groups[1], ["White"])).toBe(false);
  });
});

describe("pluralize", () => {
  it("uses the singular for one", () => {
    expect(pluralize(1, "product")).toBe("1 product");
    expect(pluralize(0, "product")).toBe("0 products");
    expect(pluralize(3, "result")).toBe("3 results");
  });
});

describe("toShopifyQuery", () => {
  it("turns words into prefix searches and strips search syntax", () => {
    expect(toShopifyQuery("lin shirt")).toBe("lin* shirt*");
    expect(toShopifyQuery('title:"x" (y)')).toBe("title* x* y*");
    expect(toShopifyQuery("   ")).toBe("");
  });
});
