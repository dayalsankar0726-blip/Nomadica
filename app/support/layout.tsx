import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Help Centre | Nomadica",
  description: "Track an order, cancel or change an order, returns, shipping, FAQ and contact details for Nomadica.",
  path: "/support",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
