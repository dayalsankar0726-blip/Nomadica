// app/account/layout.tsx
import type { Metadata } from "next";
import "./_components/account.css";

// Account pages are private to each customer, so search engines shouldn't list them.
export const metadata: Metadata = {
  title: { absolute: "Your account | Nomadica" },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
