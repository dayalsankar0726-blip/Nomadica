// lib/products/sizeChart.ts
//
// The size chart as text, transcribed from /public/Size_Chart.jpg (Nomadica unisex
// round-neck T-shirts, measurements in inches). Client-safe.

export interface SizeChart {
  title: string;
  unit: string;
  sizes: string[];
  rows: Array<{ label: string; values: number[] }>;
  note: string;
  image: string;
}

export const TEE_SIZE_CHART: SizeChart = {
  title: "Unisex round neck T-shirts",
  unit: "inches",
  sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"],
  rows: [
    { label: "Chest", values: [38, 40, 42, 44, 46, 48, 50, 52] },
    { label: "Length", values: [26, 27, 28, 29, 30, 31, 32, 33] },
  ],
  note: "Sizes may rarely vary in the range of +/- 0.5 inches.",
  image: "/Size_Chart.jpg",
};

/**
 * The size chart for a product, or null when there is no chart for its type. The only
 * chart the store has is for T-shirts, so other product types get none rather than a
 * wrong one.
 */
export function sizeChartFor(product: { productType?: string; category?: string; name?: string; rawName?: string }): SizeChart | null {
  const text = [product.productType, product.category, product.name, product.rawName].filter(Boolean).join(" ").toLowerCase();
  return /\b(tee|tees|t-shirt|t-shirts|tshirt|tshirts)\b/.test(text) ? TEE_SIZE_CHART : null;
}
