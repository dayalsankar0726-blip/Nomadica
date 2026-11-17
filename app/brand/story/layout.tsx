import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({
  title: "Travel Inspiration | Nomadica",
  description: "Short travel films from creators on YouTube to spark ideas for your next trip.",
  path: "/brand/story",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
