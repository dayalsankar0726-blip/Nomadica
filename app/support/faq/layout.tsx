import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "FAQ | Nomadica",
  description: "Answers about orders and cancellation, shipping, returns and refunds, payments, sizing and your Nomadica account.",
  path: "/support/faq",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
