import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Contact Us | Nomadica",
  description: "Contact Nomadica customer support by email.",
  path: "/support/contact",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
