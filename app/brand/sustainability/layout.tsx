import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Sustainability | Nomadica",
  description: "Our approach to sustainability at Nomadica.",
  path: "/brand/sustainability",
  // Kept out of search results until the page has verified content (see page.tsx).
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
