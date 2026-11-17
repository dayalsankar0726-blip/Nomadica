// app/cart/layout.tsx
// Server layout so the (client) cart page gets its own title. Not indexed.
import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Your Bag | Nomadica",
  description: "Review the items in your Nomadica bag and check out securely.",
  path: "/cart",
  noIndex: true,
});

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
