import type { Metadata } from "next";
import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Collections",
  description: "Browse Nomadica collections: destinations, wildlife and safari, adventure and trekking, travel quotes and beach vibes.",
  path: "/shop/collections",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
