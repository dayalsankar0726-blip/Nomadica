import { Suspense } from "react";
import CollectionClient from "@/components/shop/CollectionClient";
import { PageLoader } from "@/components/ui/PageLoader";

export default function ShopPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CollectionClient source="all" title="All Products" eyebrow="Explore" />
    </Suspense>
  );
}
