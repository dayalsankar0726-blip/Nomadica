import { Suspense } from "react";
import SearchClient from "./SearchClient";
import { PageLoader } from "@/components/ui/PageLoader";

/** Search: /shop/search?q=linen (the query lives in the URL so it survives Back and refresh). */
export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SearchClient />
    </Suspense>
  );
}
