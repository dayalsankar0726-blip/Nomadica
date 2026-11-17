import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Returns & Refunds | Nomadica",
  description: "Nomadica’s return window, exchanges, refunds and order cancellation policy.",
  path: "/support/return-policy",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
