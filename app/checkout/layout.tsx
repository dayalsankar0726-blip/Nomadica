// app/checkout/layout.tsx
// Server layout so the (client) checkout page gets its own title. Not indexed.
import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Checkout | Nomadica",
  description: "Enter your delivery details and pay securely.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
