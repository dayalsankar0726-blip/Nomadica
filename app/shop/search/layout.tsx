import type { Metadata } from "next";
import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Search",
  description: "Search Nomadica's travel-inspired apparel.",
  path: "/shop/search",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
