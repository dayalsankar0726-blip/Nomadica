import type { Metadata } from "next";
import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "New Arrivals",
  description: "The newest travel-inspired designs from Nomadica.",
  path: "/shop/new-arrivals",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
