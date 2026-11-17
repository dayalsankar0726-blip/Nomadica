import { permanentRedirect, redirect } from "next/navigation";
import { getProductHandleById } from "@/lib/shopify/products";

/**
 * Retired route. Old links (/shop/product-details?handle=x or ?id=123) go to the
 * product's page at /products/x; anything else goes to the shop.
 */
export default async function ProductDetailsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || "";
  const handle = first(params.handle);
  if (handle) permanentRedirect(`/products/${encodeURIComponent(handle)}`);

  const id = first(params.id);
  const found = id ? await getProductHandleById(id) : null;
  if (found) permanentRedirect(`/products/${encodeURIComponent(found)}`);

  redirect("/shop");
}
