// app/page.tsx
//
// Home page. A server component so it can set its own title and canonical URL;
// the interactive page itself is a client component.
import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";
import HomeClient from "@/components/home/HomeClient";

export const metadata: Metadata = constructMetadata({
  title: "Nomadica | Premium Travel Lifestyle Apparel & Adventure Wear",
  description:
    "Discover premium travel-inspired apparel, adventure wear, and lifestyle essentials crafted for explorers, creators, and modern nomads.",
  path: "/",
});

export default function HomePage() {
  return <HomeClient />;
}
