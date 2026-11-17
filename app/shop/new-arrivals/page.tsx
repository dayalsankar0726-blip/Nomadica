import { Suspense } from "react";
import CollectionClient from "@/components/shop/CollectionClient";
import { PageLoader } from "@/components/ui/PageLoader";

/**
 * Newest products: the store's "new-arrivals" collection when it exists, otherwise the
 * catalogue sorted newest first by Shopify (see fetchProductPage).
 */
export default function NewArrivalsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CollectionClient source="new" title="New Arrivals" eyebrow="Just in" />
    </Suspense>
  );
}
