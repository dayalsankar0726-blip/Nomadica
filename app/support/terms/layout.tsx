import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Terms and Conditions | Nomadica",
  description: "The terms and conditions for using the Nomadica website.",
  path: "/support/terms",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
