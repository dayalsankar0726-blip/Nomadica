import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "About Us | Nomadica",
  description: "Nomadica makes travel-inspired apparel with original designs drawn from destinations, wildlife and adventures.",
  path: "/brand/about",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
