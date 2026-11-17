import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Our Brand | Nomadica",
  description: "Discover Nomadica: who we are, our journal, travel inspiration and more.",
  path: "/brand",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
