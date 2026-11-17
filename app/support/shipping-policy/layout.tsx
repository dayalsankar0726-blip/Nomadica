import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Shipping Policy | Nomadica",
  description: "Nomadica ships within India. Shipping charges, processing and delivery times.",
  path: "/support/shipping-policy",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
