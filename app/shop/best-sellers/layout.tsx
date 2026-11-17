import type { Metadata } from "next";
import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Best Sellers",
  description: "Nomadica's best-selling travel-inspired T-shirts and apparel.",
  path: "/shop/best-sellers",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
