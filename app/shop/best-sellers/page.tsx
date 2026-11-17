import { Suspense } from "react";
import CollectionClient from "@/components/shop/CollectionClient";
import { PageLoader } from "@/components/ui/PageLoader";

/**
 * Best sellers: the store's "best-sellers" collection when it exists, otherwise Shopify's
 * own best-selling sort of the catalogue (see fetchProductPage).
 */
export default function BestSellersPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CollectionClient source="best" title="Best Sellers" eyebrow="Most loved" />
    </Suspense>
  );
}
