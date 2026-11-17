// lib/products/sizes.ts
//
// Sizes on the product page come from the product's real Shopify variants, so shoppers
// can only pick sizes that exist, can see which are sold out, and always get exactly
// the size they picked. Client-safe: no server imports.

export interface VariantLike {
  id?: string;
  title?: string;
  selectedOptions?: Array<{ name?: string; value?: string }>;
  available?: boolean;
  availableForSale?: boolean;
}

export interface SizeOption {
  /** The size as Shopify names it, e.g. "M" or "M - 40". */
  label: string;
  variantId: string;
  available: boolean;
}

const SIZE_OPTION = /^(size|sizes)$/i;
const ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL'];

const norm = (s: string) => s.trim().toLowerCase();

/** The variant's size, from its "Size" option; null when the product has no sizes. */
export function sizeOf(variant: VariantLike): string | null {
  const option = variant.selectedOptions?.find((o) => SIZE_OPTION.test(String(o.name ?? '').trim()));
  const value = option?.value?.trim();
  if (value) return value;
  // Older data without selectedOptions: the size is the first part of "M / Black".
  const first = String(variant.title ?? '').split('/')[0].trim();
  return first && first !== 'Default Title' ? first : null;
}

const isAvailable = (v: VariantLike) => (v.available ?? v.availableForSale) !== false;

/** Rank for sorting: XS before S before M…, numeric sizes by number, others last. */
function rank(label: string): number {
  const head = label.split(/[\s-]/)[0].toUpperCase();
  const i = ORDER.indexOf(head);
  if (i >= 0) return i;
  const n = parseFloat(head);
  return Number.isFinite(n) ? 100 + n : 1000;
}

/**
 * One option per size, in size order. A size is available when any of its variants is.
 * Empty when the product has no sizes (for example a one-size item).
 */
export function sizeOptions(variants: VariantLike[]): SizeOption[] {
  const bySize = new Map<string, SizeOption>();
  for (const v of variants) {
    const label = sizeOf(v);
    if (!label || !v.id) continue;
    const key = norm(label);
    const existing = bySize.get(key);
    if (!existing) {
      bySize.set(key, { label, variantId: v.id, available: isAvailable(v) });
    } else if (!existing.available && isAvailable(v)) {
      bySize.set(key, { label: existing.label, variantId: v.id, available: true });
    }
  }
  return [...bySize.values()].sort((a, b) => rank(a.label) - rank(b.label));
}

/**
 * The variant to add to the bag for the chosen size: an exact size match that is in stock.
 * For a product without sizes, its first in-stock variant. Null when there is none.
 */
export function variantForSize(variants: VariantLike[], size: string | null): VariantLike | null {
  if (sizeOptions(variants).length === 0) {
    return variants.find((v) => v.id && isAvailable(v)) ?? null;
  }
  if (!size) return null;
  const want = norm(size);
  return variants.find((v) => v.id && isAvailable(v) && norm(sizeOf(v) ?? '') === want) ?? null;
}
