import type { Metadata } from "next";
import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Shop",
  description: "Shop Nomadica's travel-inspired T-shirts and apparel. Filter by collection, size and colour.",
  path: "/shop",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
