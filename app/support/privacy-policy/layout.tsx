import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Privacy Policy | Nomadica",
  description: "How Nomadica collects, uses and protects your personal information, including cookies and analytics.",
  path: "/support/privacy-policy",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
