import type { Metadata } from "next";

export const metadata: Metadata = { title: { absolute: "Choose a new password | Nomadica" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
