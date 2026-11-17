import { parseProduct, groupProducts } from "@/utils/productGroup";
import { badgeOf } from "@/lib/products/listing";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ProductDetails {
  id: string;
  name: string;
  rawName: string;
  price: number;
  originalPrice?: number;
  category: string;
  productType: string;
  /** Plain-text description from Shopify. */
  description: string;
  /** Description HTML from Shopify (sanitise before rendering). */
  descriptionHtml: string;
  /** Materials from the custom.materials metafield; empty when the store hasn't set it. */
  materials: string;
  /** Care instructions from the custom.care_instructions metafield; empty when not set. */
  care: string;
  colors: string[];
  images: string[];
  /** Only a badge the store set (custom.badge metafield). */
  badge?: string;
  handle?: string;
  /** First collection the product is in, for the breadcrumb. */
  collection?: { title: string; handle: string };
}

export const mapRawProduct = (rawProduct: any): ProductDetails => {
  const parsed = parseProduct({ name: rawProduct.title, colors: rawProduct.colors });
  const priceVal = rawProduct.price || parseFloat(rawProduct.variants?.edges?.[0]?.node?.price?.amount || "0");
  const origPriceVal = rawProduct.originalPrice || (rawProduct.variants?.edges?.[0]?.node?.compareAtPrice ? parseFloat(rawProduct.variants?.edges?.[0]?.node?.compareAtPrice?.amount || "0") : undefined);
  const firstCollection = rawProduct.collections?.edges?.[0]?.node;
  const images: string[] = rawProduct.images?.edges?.map((edge: any) => edge.node.url).filter(Boolean) || (rawProduct.image ? [rawProduct.image] : []);
  return {
    id: rawProduct.id,
    name: parsed.baseName || rawProduct.title,
    rawName: rawProduct.title,
    price: priceVal,
    originalPrice: origPriceVal,
    category: rawProduct.category || rawProduct.productType || "",
    productType: rawProduct.productType || rawProduct.category || "",
    description: rawProduct.description || "",
    descriptionHtml: rawProduct.descriptionHtml || "",
    materials: rawProduct.materialsField?.value || rawProduct.materials || "",
    care: rawProduct.careField?.value || "",
    colors: rawProduct.colors || [],
    images,
    badge: badgeOf(rawProduct),
    handle: rawProduct.handle,
    collection: firstCollection?.handle ? { title: firstCollection.title, handle: firstCollection.handle } : undefined,
  };
};

/**
 * The product's display name and colour variations, worked out once from the products
 * the server already sent (no refetch in the browser).
 */
export function groupNameFor(rawProduct: any, allEdges: any[], mockupLookup: Record<string, any>): string | null {
  if (!rawProduct || !allEdges?.length) return null;
  const items = allEdges.map((e: any) => e.node || e);
  if (!items.some((p: any) => p.id === rawProduct.id)) items.push(rawProduct);
  const grouped = groupProducts(
    items.map((n: any) => ({ id: n.id, name: n.title, handle: n.handle, productType: n.productType || n.category, category: n.productType || n.category, productTypeConfig: n.productTypeConfig, metafieldProductType: n.metafieldProductType, productTypeConfiguration: n.productTypeConfiguration, variants: n.variants })),
    mockupLookup,
  );
  const group = grouped.find((g) => g.colorVariants.some((v) => v.id === rawProduct.id));
  // A shared display name only makes sense when several colours are grouped together.
  return group && group.products.length > 1 ? group.name || null : null;
}

export function getInitialMockup(rawProduct: any, mockupLookup: Record<string, any>) {
  if (!rawProduct) return undefined;
  const productType = rawProduct.productType || rawProduct.category || "Tee";
  let config = mockupLookup[productType];
  if (!config) {
    const lowerType = productType.toLowerCase();
    for (const [key, val] of Object.entries(mockupLookup)) {
      if (lowerType.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerType)) {
        config = val;
        break;
      }
    }
  }
  if (!config && (productType.toLowerCase().includes("tee") || productType.toLowerCase().includes("t-shirt"))) {
    config = mockupLookup["Tee"];
  }
  return typeof config === "object" ? config.mockupImage : config;
}

export function computeVariations(rawProduct: any, allEdges: any[], mockupLookup: Record<string, any>) {
  if (!rawProduct || !allEdges?.length) return [];
  const allMapped = allEdges.map((edge: any) => {
    const node = edge.node;
    if (node.id === rawProduct.id) {
      return {
        id: rawProduct.id,
        name: rawProduct.title,
        handle: rawProduct.handle,
        price: parseFloat(rawProduct.variants?.edges?.[0]?.node?.price?.amount || "0"),
        originalPrice: parseFloat(rawProduct.variants?.edges?.[0]?.node?.compareAtPrice?.amount || "0") || undefined,
        image: rawProduct.images?.edges?.[0]?.node?.url || rawProduct.image || "",
        category: rawProduct.productType || rawProduct.category || "Tops",
        productType: rawProduct.productType || rawProduct.category || "Tops",
        productTypeConfig: rawProduct.productTypeConfig,
        metafieldProductType: rawProduct.metafieldProductType,
        productTypeConfiguration: rawProduct.productTypeConfiguration,
        variants: rawProduct.variants,
        createdAt: rawProduct.createdAt || node.createdAt || ""
      };
    }
    return {
      id: node.id,
      name: node.title,
      handle: node.handle,
      price: node.price || parseFloat(node.variants?.edges?.[0]?.node?.price?.amount || "0"),
      image: node.images?.edges?.[0]?.node?.url || "",
      category: node.productType || node.category || "Tops",
      productType: node.productType || node.category || "Tops",
      productTypeConfig: node.productTypeConfig,
      metafieldProductType: node.metafieldProductType,
      productTypeConfiguration: node.productTypeConfiguration,
      variants: node.variants,
      createdAt: node.createdAt || ""
    };
  });
  if (!allMapped.some((p: any) => p.id === rawProduct.id)) {
    allMapped.push({
      id: rawProduct.id,
      name: rawProduct.title,
      handle: rawProduct.handle,
      price: parseFloat(rawProduct.variants?.edges?.[0]?.node?.price?.amount || "0"),
      originalPrice: parseFloat(rawProduct.variants?.edges?.[0]?.node?.compareAtPrice?.amount || "0") || undefined,
      image: rawProduct.images?.edges?.[0]?.node?.url || rawProduct.image || "",
      category: rawProduct.productType || rawProduct.category || "Tops",
      productType: rawProduct.productType || rawProduct.category || "Tops",
      productTypeConfig: rawProduct.productTypeConfig,
      metafieldProductType: rawProduct.metafieldProductType,
      productTypeConfiguration: rawProduct.productTypeConfiguration,
      variants: rawProduct.variants,
      createdAt: rawProduct.createdAt || ""
    });
  }
  const grouped = groupProducts(allMapped, mockupLookup);
  const parsedCurrent = parseProduct({ name: rawProduct.title, colors: rawProduct.colors });
  const currentGroup = grouped.find(g => 
    g.colorVariants.some(v => v.id === rawProduct.id || (v.handle && rawProduct.handle && v.handle === rawProduct.handle)) ||
    (g.products && g.products.some((p: any) => p.id === rawProduct.id || (p.handle && rawProduct.handle && p.handle === rawProduct.handle))) ||
    (g.displayName && rawProduct.title && g.displayName.toLowerCase() === rawProduct.title.toLowerCase()) ||
    (parsedCurrent.baseName && g.name.toLowerCase() === parsedCurrent.baseName.toLowerCase())
  );
  if (!currentGroup) {
    const parsed = parseProduct({ name: rawProduct.title, colors: rawProduct.colors });
    return [{
      id: rawProduct.id,
      handle: rawProduct.handle,
      colorName: parsed.colorName || "Original",
      colorHex: parsed.colorHex || "#FFFFFF",
      image: rawProduct.images?.edges?.[0]?.node?.url || (Array.isArray(rawProduct.images) ? rawProduct.images[0] : rawProduct.image) || "",
      createdAt: rawProduct.createdAt || ""
    }];
  }
  const vars = currentGroup.colorVariants.map(v => ({
    id: v.id,
    handle: v.handle,
    colorName: v.colorName,
    colorHex: v.colorHex,
    image: v.image,
    createdAt: v.createdAt
  }));
  if (!vars.some(v => v.id === rawProduct.id)) {
    const parsed = parseProduct({ name: rawProduct.title, colors: rawProduct.colors });
    const matchIdx = vars.findIndex(v => v.colorHex.toLowerCase() === (parsed.colorHex || "").toLowerCase());
    const rep = {
      id: rawProduct.id,
      handle: rawProduct.handle,
      colorName: parsed.colorName || "Original",
      colorHex: parsed.colorHex || "#FFFFFF",
      image: rawProduct.images?.edges?.[0]?.node?.url || rawProduct.image || "",
      createdAt: rawProduct.createdAt || ""
    };
    if (matchIdx !== -1) {
      vars[matchIdx] = rep;
    } else {
      vars.push(rep);
    }
  }
  vars.sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return 0;
  });
  return vars;
}
