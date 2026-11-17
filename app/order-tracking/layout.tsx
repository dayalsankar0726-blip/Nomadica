// app/order-tracking/layout.tsx
// Server layout so the (client) order tracking page gets its own title.
import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Track Your Order | Nomadica",
  description: "Check the status of your Nomadica order with your order number and email address.",
  path: "/order-tracking",
});

export default function OrderTrackingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
