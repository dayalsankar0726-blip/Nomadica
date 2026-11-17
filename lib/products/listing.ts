// lib/products/listing.ts
//
// Shared logic for product listings (shop, collections, new arrivals, best sellers,
// search): turning Shopify product nodes into card data, keeping filters and sort in the
// URL, building filter options from the real catalogue, and server-side sort keys.
// Client-safe and pure: no React, no server imports.

import { sizeOf, type VariantLike } from "./sizes";

// ---------------------------------------------------------------------------
// Product nodes -> card data
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A listing product: one Shopify product, ready for groupProducts() and ProductCard. */
export interface ListingProduct {
  id: string;
  name: string;
  handle: string;
  price: number;
  originalPrice?: number;
  image: string;
  hoverImage: string;
  /** Only when the store set one (custom.badge metafield); never invented. */
  badge?: string;
  category: string;
  productType: string;
  productTypeConfig?: any;
  metafieldProductType?: any;
  productTypeConfiguration?: any;
  description: string;
  createdAt: string;
  collections: string[];
  tags: string[];
  options: any[];
  sizes: string[];
  colors: string[];
  variants: any;
}

const amount = (value: any): number | undefined => {
  const n = typeof value === "number" ? value : parseFloat(value?.amount ?? value ?? "");
  return Number.isFinite(n) ? n : undefined;
};

/** The store-set badge for a product node (custom.badge metafield), if any. */
export function badgeOf(node: any): string | undefined {
  const value = node?.badge ?? node?.badgeField?.value;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Maps a Storefront product node (or a sample product) to listing card data. */
export function mapProductNode(node: any, extraCollections: string[] = []): ListingProduct {
  const firstVariant = node?.variants?.edges?.[0]?.node;
  const images: string[] = (node?.images?.edges ?? [])
    .map((e: any) => e?.node?.url)
    .filter(Boolean);
  const image = images[0] || node?.image?.url || (typeof node?.image === "string" ? node.image : "") || "";
  const sizeOption = node?.options?.find((o: any) => String(o?.name ?? "").toLowerCase() === "size");
  return {
    id: node?.id,
    name: node?.title ?? node?.name ?? "",
    handle: node?.handle ?? "",
    price: amount(node?.price) ?? amount(firstVariant?.price) ?? 0,
    originalPrice: amount(node?.originalPrice) ?? amount(firstVariant?.compareAtPrice),
    image,
    hoverImage: images[1] || image,
    badge: badgeOf(node),
    category: node?.productType || node?.category || "Tops",
    productType: node?.productType || node?.category || "Tops",
    productTypeConfig: node?.productTypeConfig,
    metafieldProductType: node?.metafieldProductType,
    productTypeConfiguration: node?.productTypeConfiguration,
    description: node?.description ?? "",
    createdAt: node?.createdAt ?? "",
    collections: [
      ...extraCollections,
      ...(node?.collections?.edges?.flatMap((e: any) => [e?.node?.title, e?.node?.handle].filter(Boolean)) ?? []),
      ...(node?.category ? [node.category] : []),
      ...(node?.productType ? [node.productType] : []),
    ],
    tags: node?.tags ?? [],
    options: node?.options ?? [],
    sizes: node?.sizes ?? sizeOption?.values ?? [],
    colors: node?.colors ?? [],
    variants: node?.variants,
  };
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export type ListingSort = "featured" | "price-asc" | "price-desc" | "newest";

export const SORT_OPTIONS: Array<{ value: ListingSort; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

/** Label used by sortProducts() in utils/productFilters. */
export const sortLabel = (sort: ListingSort) => SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Featured";

const isSort = (v: string | null | undefined): v is ListingSort => SORT_OPTIONS.some((o) => o.value === v);

/**
 * Shopify sort for a listing, so every loaded page is in the right order.
 * Collections use ProductCollectionSortKeys, the catalogue uses ProductSortKeys.
 */
export function shopifySort(sort: ListingSort, isCollection: boolean): { sortKey?: string; reverse?: boolean } {
  switch (sort) {
    case "price-asc":
      return { sortKey: "PRICE", reverse: false };
    case "price-desc":
      return { sortKey: "PRICE", reverse: true };
    case "newest":
      return { sortKey: isCollection ? "CREATED" : "CREATED_AT", reverse: true };
    default:
      return isCollection ? { sortKey: "COLLECTION_DEFAULT" } : {};
  }
}

// ---------------------------------------------------------------------------
// Filters in the URL
// ---------------------------------------------------------------------------

export interface ListingState {
  sort: ListingSort;
  sizes: string[];
  colors: string[];
  /** Collection titles chosen in the Collection filter (shop pages only). */
  collections: string[];
}

type ParamsLike = { get(name: string): string | null };

const list = (value: string | null): string[] =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

/** Reads ?sort=&size=&color=&collection= from the URL. */
export function parseListingState(params: ParamsLike | null | undefined, defaultSort: ListingSort = "featured"): ListingState {
  const sort = params?.get("sort") ?? null;
  return {
    sort: isSort(sort) ? sort : defaultSort,
    sizes: list(params?.get("size") ?? null),
    colors: list(params?.get("color") ?? null),
    collections: list(params?.get("collection") ?? null),
  };
}

/**
 * The query string for a listing state (without "?"). Keeps unrelated params (e.g. q),
 * drops empty filters and the default sort so clean URLs stay clean.
 */
export function listingQueryString(
  state: ListingState,
  current: string = "",
  defaultSort: ListingSort = "featured",
): string {
  const params = new URLSearchParams(current);
  const set = (key: string, values: string[]) => {
    if (values.length > 0) params.set(key, values.join(","));
    else params.delete(key);
  };
  if (state.sort !== defaultSort) params.set("sort", state.sort);
  else params.delete("sort");
  set("size", state.sizes);
  set("color", state.colors);
  set("collection", state.collections);
  return params.toString();
}

// ---------------------------------------------------------------------------
// Filter options from the real catalogue
// ---------------------------------------------------------------------------

export interface FilterOption {
  value: string;
  /** Number of product cards in the current listing that have this option. */
  count: number;
}

interface GroupLike {
  allVariants?: Array<{ node?: VariantLike } | VariantLike>;
  colorVariants?: Array<{ colorName?: string; colorHex?: string; allVariants?: any[] }>;
  sizes?: string[];
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL"];

function sizeRank(label: string): number {
  const head = label.split(/[\s-]/)[0].toUpperCase();
  const i = SIZE_ORDER.indexOf(head);
  if (i >= 0) return i;
  const n = parseFloat(head);
  return Number.isFinite(n) ? 100 + n : 1000;
}

const variantNode = (v: any): VariantLike => (v && "node" in v ? v.node : v) ?? {};

/** The sizes a grouped product really has, from its variants' Size option. */
export function sizesOfGroup(group: GroupLike): string[] {
  const out = new Map<string, string>();
  const add = (label: string | null | undefined) => {
    const clean = label?.trim();
    if (clean && clean !== "Default Title") out.set(clean.toLowerCase(), clean);
  };
  for (const v of group.allVariants ?? []) add(sizeOf(variantNode(v)));
  for (const cv of group.colorVariants ?? []) for (const v of cv.allVariants ?? []) add(sizeOf(variantNode(v)));
  if (out.size === 0) for (const s of group.sizes ?? []) add(s);
  return [...out.values()];
}

/** The colour names a grouped product comes in (its colour variants). */
export function colorsOfGroup(group: GroupLike): string[] {
  const out = new Map<string, string>();
  for (const cv of group.colorVariants ?? []) {
    const name = cv.colorName?.trim();
    if (name && name !== "Original") out.set(name.toLowerCase(), name);
  }
  return [...out.values()];
}

const has = (values: string[], wanted: string) => values.some((v) => v.toLowerCase() === wanted.toLowerCase());

/** True when the product has at least one of the chosen sizes (exact match). */
export function groupHasSize(group: GroupLike, chosen: string[]): boolean {
  if (chosen.length === 0) return true;
  const sizes = sizesOfGroup(group);
  return chosen.some((c) => has(sizes, c));
}

/** True when the product comes in at least one of the chosen colours (exact name match). */
export function groupHasColor(group: GroupLike, chosen: string[]): boolean {
  if (chosen.length === 0) return true;
  const colors = colorsOfGroup(group);
  return chosen.some((c) => has(colors, c));
}

/** Size and colour options found in these products, with how many products have each. */
export function buildFilterOptions(groups: GroupLike[]): { sizes: FilterOption[]; colors: FilterOption[] } {
  const count = (pick: (g: GroupLike) => string[]) => {
    const map = new Map<string, FilterOption>();
    for (const g of groups) {
      for (const value of pick(g)) {
        const key = value.toLowerCase();
        const existing = map.get(key);
        if (existing) existing.count += 1;
        else map.set(key, { value, count: 1 });
      }
    }
    return [...map.values()];
  };
  const sizes = count(sizesOfGroup).sort((a, b) => sizeRank(a.value) - sizeRank(b.value) || a.value.localeCompare(b.value));
  const colors = count(colorsOfGroup).sort((a, b) => a.value.localeCompare(b.value));
  return { sizes, colors };
}

/** "1 product", "2 products". */
export function pluralize(count: number, noun: string, plural = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : plural}`;
}

/** Shopify search syntax for what the shopper typed: each word as a prefix ("lin" finds "linen"). */
export function toShopifyQuery(input: string): string {
  return input
    .replace(/["\\:()*]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => `${w}*`)
    .join(" ");
}
