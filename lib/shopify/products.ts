import { ShopifyStorefrontClient } from './client';
import { STOREFRONT_QUERIES } from './queries';
import { MOCK_COLLECTIONS, MOCK_PRODUCTS, formatCollectionGraphQL, formatProductGraphQL, type MockProduct } from '@/utils/mockData';
import { isDevelopment } from '@/lib/devMocks';
import { getEnvironment } from '@/utils/env';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Storefront requests that take longer than this are treated as failed, so pages never hang. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * The Storefront client, or null when the store isn't configured (local sample mode).
 * Without this check every request would go to "https://undefined/…" and wait on DNS.
 */
function storefront(): ShopifyStorefrontClient | null {
  const shopUrl = getEnvironment().shopUrl;
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!shopUrl || !token || !token.trim()) return null;
  return new ShopifyStorefrontClient(shopUrl, token);
}

async function request<T = any>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  const client = storefront();
  if (!client) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Storefront request timed out after ${REQUEST_TIMEOUT_MS}ms`)), REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([client.request<T>(query, variables), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** True when a live store is configured. */
export const isStoreConfigured = () => storefront() !== null;

/**
 * Fetches a product by its URL handle from Shopify Storefront (with mock fallback)
 */
export async function getProductByHandle(handle: string) {
  try {
    const data: any = await request(STOREFRONT_QUERIES.GET_PRODUCT_BY_HANDLE, { handle });
    if (data?.productByHandle) {
      return data.productByHandle;
    }
  } catch (error) {
    console.error(`Failed to fetch live product handle ${handle}:`, error);
  }

  // Sample products are for local development only.
  if (!isDevelopment) return null;
  const mockProduct = MOCK_PRODUCTS.find(p => p.handle === handle);
  if (mockProduct) {
    return formatProductGraphQL(mockProduct);
  }
  return null;
}

/** The handle for a product ID (old /shop/product-details?id= links), or null. */
export async function getProductHandleById(id: string): Promise<string | null> {
  try {
    const gid = /^\d+$/.test(id) ? `gid://shopify/Product/${id}` : id;
    const data: any = await request(STOREFRONT_QUERIES.GET_PRODUCT_HANDLE_BY_ID, { id: gid });
    if (data?.product?.handle) return data.product.handle;
  } catch (error) {
    console.error(`Failed to look up product ${id}:`, error);
  }
  if (!isDevelopment) return null;
  return MOCK_PRODUCTS.find((p) => p.id === id)?.handle ?? null;
}

/**
 * Related products for the product page, from Shopify's product recommendations.
 * Sample mode uses other products of the same type or category.
 */
export async function getProductRecommendations(productId: string, limit = 8): Promise<any[]> {
  try {
    const data: any = await request(STOREFRONT_QUERIES.GET_PRODUCT_RECOMMENDATIONS, { productId });
    if (Array.isArray(data?.productRecommendations)) {
      return data.productRecommendations.slice(0, limit);
    }
  } catch (error) {
    console.error(`Failed to fetch recommendations for ${productId}:`, error);
  }
  if (!isDevelopment || isStoreConfigured()) return [];
  const current = MOCK_PRODUCTS.find((p) => p.id === productId);
  if (!current) return [];
  const related = MOCK_PRODUCTS.filter(
    (p) => p.id !== current.id && (p.category === current.category || p.productType === current.productType),
  );
  return related.slice(0, limit).map(formatProductGraphQL);
}

/**
 * Fetches a collection by its handle along with one page of its products.
 */
export async function getCollectionByHandle(
  handle: string,
  first: number = 24,
  opts: { after?: string | null; sortKey?: string; reverse?: boolean } = {},
) {
  try {
    const data: any = await request(STOREFRONT_QUERIES.GET_COLLECTION_BY_HANDLE, {
      handle,
      first,
      ...(opts.after ? { after: opts.after } : {}),
      ...(opts.sortKey ? { sortKey: opts.sortKey } : {}),
      ...(opts.reverse !== undefined ? { reverse: opts.reverse } : {}),
    });
    if (data?.collectionByHandle) {
      return data.collectionByHandle;
    }
  } catch (error) {
    console.error(`Failed to fetch live collection handle ${handle}:`, error);
  }
  // Sample collections are for local development without a store only.
  if (!isDevelopment || isStoreConfigured()) return null;
  const mock = MOCK_COLLECTIONS.find((c) => c.handle === handle);
  if (!mock) return null;
  const formatted = formatCollectionGraphQL(mock);
  return { ...formatted, products: { ...formatted.products, pageInfo: { hasNextPage: false, endCursor: null } } };
}

// ---------------------------------------------------------------------------
// Listings (shop, collections, new arrivals, best sellers, search)
// ---------------------------------------------------------------------------

export type ListingKind = 'new' | 'best';

export interface ProductPageRequest {
  first: number;
  after?: string | null;
  /** ProductSortKeys / ProductCollectionSortKeys value. */
  sortKey?: string;
  reverse?: boolean;
  /** Shopify search syntax, e.g. "linen". */
  query?: string;
  /** Collection handle. */
  collection?: string;
  /** New arrivals / best sellers: a store collection when one exists, else Shopify's own sort. */
  list?: ListingKind;
}

export interface ProductPage {
  products: { edges: Array<{ node: any }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  collection?: { title: string; handle: string; description?: string } | null;
  /** How a new/best list was built: from a store collection, or Shopify's sort of the catalogue. */
  source?: 'collection' | 'sorted';
}

/** Collection handles the store may use for these lists. */
const LIST_COLLECTIONS: Record<ListingKind, string[]> = {
  new: ['new-arrivals', 'new-arrival', 'new'],
  best: ['best-sellers', 'bestsellers', 'best-seller'],
};

const PRODUCT_SORT_KEYS = new Set(['TITLE', 'PRODUCT_TYPE', 'VENDOR', 'UPDATED_AT', 'CREATED_AT', 'BEST_SELLING', 'PRICE', 'ID', 'RELEVANCE']);
const COLLECTION_SORT_KEYS = new Set(['TITLE', 'PRICE', 'BEST_SELLING', 'CREATED', 'ID', 'MANUAL', 'COLLECTION_DEFAULT', 'RELEVANCE']);

function collectionPage(collection: any): ProductPage {
  return {
    products: {
      edges: collection.products?.edges ?? [],
      pageInfo: collection.products?.pageInfo ?? { hasNextPage: false, endCursor: null },
    },
    collection: { title: collection.title, handle: collection.handle, description: collection.description },
    source: 'collection',
  };
}

/**
 * One page of products. Throws when the store can't be reached (callers show an error);
 * returns sample data only in local development without a store.
 */
export async function fetchProductPage(req: ProductPageRequest): Promise<ProductPage> {
  const first = Math.min(Math.max(Math.floor(req.first) || 24, 1), 100);
  const client = storefront();

  if (client) {
    // A named collection (or the store's "new arrivals" / "best sellers" collection).
    const handles = req.collection ? [req.collection] : req.list ? LIST_COLLECTIONS[req.list] : [];
    for (const handle of handles) {
      const sortKey = req.sortKey && COLLECTION_SORT_KEYS.has(req.sortKey)
        ? req.sortKey
        : req.list === 'best' ? 'BEST_SELLING' : req.list === 'new' ? 'CREATED' : undefined;
      const reverse = req.sortKey ? req.reverse : req.list === 'new' ? true : undefined;
      const data: any = await request(STOREFRONT_QUERIES.GET_COLLECTION_BY_HANDLE, {
        handle,
        first,
        ...(req.after ? { after: req.after } : {}),
        ...(sortKey ? { sortKey } : {}),
        ...(reverse !== undefined ? { reverse } : {}),
      });
      if (data?.collectionByHandle) return collectionPage(data.collectionByHandle);
    }
    if (req.collection) {
      return { products: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } }, collection: null };
    }

    // The catalogue, optionally searched; new/best fall back to Shopify's own sort.
    const sortKey = req.sortKey && PRODUCT_SORT_KEYS.has(req.sortKey)
      ? req.sortKey
      : req.list === 'best' ? 'BEST_SELLING' : req.list === 'new' ? 'CREATED_AT' : req.query ? 'RELEVANCE' : undefined;
    const reverse = req.sortKey ? req.reverse : req.list === 'new' ? true : undefined;
    const data: any = await request(STOREFRONT_QUERIES.GET_PRODUCTS, {
      first,
      ...(req.after ? { after: req.after } : {}),
      ...(sortKey ? { sortKey } : {}),
      ...(reverse !== undefined ? { reverse } : {}),
      ...(req.query ? { query: req.query } : {}),
    });
    return {
      products: data?.products ?? { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
      source: req.list ? 'sorted' : undefined,
    };
  }

  if (!isDevelopment) throw new Error('Store is not configured');
  return mockProductPage(req, first);
}

/** Sample-mode listing with the same paging contract (cursor = offset). */
function mockProductPage(req: ProductPageRequest, first: number): ProductPage {
  let items: MockProduct[] = [...MOCK_PRODUCTS];
  let collection: ProductPage['collection'];
  if (req.collection) {
    const mock = MOCK_COLLECTIONS.find((c) => c.handle === req.collection);
    if (!mock) return { products: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } }, collection: null };
    const formatted = formatCollectionGraphQL(mock);
    const ids = new Set(formatted.products.edges.map((e: any) => e.node.id));
    items = items.filter((p) => ids.has(p.id));
    collection = { title: mock.title, handle: mock.handle, description: mock.description };
  }
  if (req.query) {
    const words = req.query.toLowerCase().replace(/\*/g, '').split(/\s+/).filter(Boolean);
    items = items.filter((p) => {
      const text = `${p.name} ${p.category} ${p.productType ?? ''} ${p.description}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }
  const time = (p: MockProduct) => new Date(p.createdAt ?? 0).getTime();
  const key = req.sortKey ?? (req.list === 'new' ? 'CREATED_AT' : req.list === 'best' ? 'BEST_SELLING' : undefined);
  const reverse = req.sortKey ? !!req.reverse : req.list === 'new';
  if (key === 'PRICE') items.sort((a, b) => a.price - b.price);
  if (key === 'CREATED_AT' || key === 'CREATED') items.sort((a, b) => time(a) - time(b));
  if (key === 'BEST_SELLING') items.sort((a, b) => b.reviews - a.reviews);
  if (reverse) items.reverse();

  const offset = Math.max(parseInt(req.after ?? '0', 10) || 0, 0);
  const slice = items.slice(offset, offset + first);
  const next = offset + first;
  return {
    products: {
      edges: slice.map((p) => ({ node: formatProductGraphQL(p) })),
      pageInfo: { hasNextPage: next < items.length, endCursor: next < items.length ? String(next) : null },
    },
    collection,
    source: req.list ? 'sorted' : undefined,
  };
}

export interface ProductTypeConfigEntry {
  id: string;
  handle?: string;
  entryName: string;
  displayName: string;
  mockupImage?: string;
}

/**
 * Known product types and their display names. No stock photos here: a lifestyle
 * "mockup" image only comes from the store's own product_type_configuration entries.
 */
export const DEFAULT_PRODUCT_TYPE_CONFIGS: ProductTypeConfigEntry[] = [
  { id: "gid://shopify/Metaobject/ptc-adventure", handle: "adventure", entryName: "Adventure", displayName: "Trekkking Tees" },
  { id: "gid://shopify/Metaobject/ptc-wildlife-1", handle: "wildlife-tee-1", entryName: "Wildlife Tee 1", displayName: "Wildlife Tees" },
  { id: "gid://shopify/Metaobject/ptc-travel-1", handle: "travel-tee-1", entryName: "Travel Tee 1", displayName: "Travel Quotes Tee" },
  { id: "gid://shopify/Metaobject/ptc-regular-fit", handle: "regular-fit-tee", entryName: "Regular Fit Tee", displayName: "Comfortable Regular Fit Tee" },
  { id: "gid://shopify/Metaobject/ptc-oversized", handle: "oversized-tee", entryName: "Oversized Tee", displayName: "Cool Oversized Tee" },
  { id: "gid://shopify/Metaobject/ptc-boxy-fit", handle: "boxy-fit-tee", entryName: "Boxy Fit Tee", displayName: "Boxy Tees" },
  { id: "gid://shopify/Metaobject/ptc-beach-1", handle: "beach-tee-1", entryName: "Beach Tee 1", displayName: "Cool Beach Tees" },
  { id: "gid://shopify/Metaobject/ptc-tee", handle: "tee", entryName: "Tee", displayName: "T-Shirts" },
];

export async function getProductTypeMockups() {
  const lookup: Record<string, any> = {};
  const configsMap = new Map<string, ProductTypeConfigEntry>();

  // Initialize with known defaults
  for (const def of DEFAULT_PRODUCT_TYPE_CONFIGS) {
    configsMap.set(def.entryName.toLowerCase(), { ...def });
  }

  try {
    const data: any = await request(STOREFRONT_QUERIES.GET_PRODUCT_TYPE_MOCKUPS);
    const nodes = data?.metaobjects?.nodes || [];

    for (const node of nodes) {
      const fields = node?.fields || [];
      const productTypeField = fields.find((f: any) => f.key === "product_type");
      const displayNameField = fields.find((f: any) => f.key === "display_name");
      const mockupImageField = fields.find((f: any) => f.key === "mockup_image");

      const entryName = productTypeField?.value?.trim() || "";
      const displayName = displayNameField?.value?.trim() || entryName;
      const imageUrl = mockupImageField?.reference?.image?.url || mockupImageField?.reference?.url || "";

      if (entryName || node.id) {
        const item: ProductTypeConfigEntry = {
          id: node.id,
          handle: node.handle,
          entryName: entryName || displayName || node.handle,
          displayName: displayName || entryName,
          mockupImage: imageUrl || undefined
        };
        configsMap.set((item.entryName || node.id).toLowerCase(), item);
      }
    }
  } catch (error) {
    console.error("Failed to fetch product type mockups:", error);
  }

  const configurations = Array.from(configsMap.values());

  for (const config of configurations) {
    const entryData = {
      id: config.id,
      handle: config.handle,
      entryName: config.entryName,
      displayName: config.displayName,
      mockupImage: config.mockupImage
    };

    if (config.id) lookup[config.id] = entryData;
    if (config.handle) lookup[config.handle] = entryData;
    if (config.entryName) {
      lookup[config.entryName] = entryData;
      lookup[config.entryName.toLowerCase()] = entryData;
    }
    if (config.displayName) {
      lookup[config.displayName] = entryData;
      lookup[config.displayName.toLowerCase()] = entryData;
    }
  }

  lookup._configurations = configurations;
  return lookup;
}

export async function getAllStorefrontProducts(first: number = 50) {
  try {
    const data: any = await request(STOREFRONT_QUERIES.GET_PRODUCTS, { first });
    if (data?.products?.edges) return data.products.edges;
  } catch (error) {
    console.error("Failed to fetch all storefront products:", error);
  }
  // Sample products in local development without a store, so colour swatches work there too.
  if (isDevelopment && !isStoreConfigured()) {
    return MOCK_PRODUCTS.slice(0, first).map((p) => ({ node: formatProductGraphQL(p) }));
  }
  return [];
}
