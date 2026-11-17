import Link from "next/link";
import BrandHero from "@/components/brand/BrandHero";
import StoryGallery from "@/components/brand/StoryGallery";
import JournalCard from "@/components/journal/JournalCard";
import { getBlogArticles } from "@/lib/shopify/journal";

export const dynamic = "force-dynamic";

const highlights = [
  {
    title: "About Us",
    description: "Who we are and what goes into every Nomadica piece.",
    href: "/brand/about",
  },
  {
    title: "Travel Inspiration",
    description: "Short travel films from around the world to spark your next trip.",
    href: "/brand/story",
  },
  {
    title: "Journal",
    description: "Travel stories, destination guides and notes from the road.",
    href: "/journal",
  },
  {
    title: "Sustainability",
    description: "Where we are today, and how we plan to report on it.",
    href: "/brand/sustainability",
  },
];

export default async function BrandLandingPage() {
  const { articles } = await getBlogArticles(4);

  return (
    <div style={{ backgroundColor: "#FFFFFF" }}>
      <BrandHero />

      <section className="px-4 sm:px-6" style={{ paddingTop: "4rem", paddingBottom: "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem", textAlign: "center" }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#1E1E1E", margin: 0 }}>
              Discover the brand
            </p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3.4rem)", margin: 0, color: "#1E1E1E" }}>
              Travel-inspired apparel, and the stories behind it.
            </h2>
            <p style={{ maxWidth: "760px", margin: "0 auto", fontFamily: "'Montserrat', sans-serif", fontSize: "1rem", lineHeight: 1.8, color: "rgba(30,30,30,0.75)" }}>
              Learn who we are, read the journal, and find inspiration for your next journey.
            </p>
          </div>

          <ul className="grid gap-5 list-none p-0 m-0" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {highlights.map((item) => (
              <li key={item.title} className="flex">
                <Link
                  href={item.href}
                  className="block w-full p-8 rounded-3xl bg-white border border-black/10 no-underline text-[#1E1E1E] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(30,30,30,0.08)]"
                >
                  <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", marginBottom: "0.75rem" }}>{item.title}</h3>
                  <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", fontSize: "0.95rem", lineHeight: 1.75, color: "rgba(30,30,30,0.75)" }}>{item.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {articles.length > 0 && (
        <section className="px-4 sm:px-6" style={{ paddingBottom: "4rem" }} aria-labelledby="brand-journal-heading">
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <h2 id="brand-journal-heading" style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", margin: 0, color: "#1E1E1E" }}>
                From the Journal
              </h2>
              <Link href="/journal" className="font-['Montserrat',_sans-serif] text-sm font-semibold text-[#6B4E37] underline underline-offset-4">
                See all articles
              </Link>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0 m-0">
              {articles.map((article) => (
                <li key={article.id} className="flex">
                  <JournalCard article={article} headingLevel="h3" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <StoryGallery />
    </div>
  );
}
