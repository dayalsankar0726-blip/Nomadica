import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

// TODO(store owner): these are stock Unsplash photos. Replace them with Nomadica's own
// photography when available.
const tiles = [
  {
    title: "About Nomadica",
    subtitle: "Who we are and how our designs come together.",
    image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=900&q=80",
    href: "/brand/about",
  },
  {
    title: "Travel inspiration",
    subtitle: "Short travel films to spark your next trip.",
    image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=900&q=80",
    href: "/brand/story",
  },
  {
    title: "The Journal",
    subtitle: "Travel stories and destination guides.",
    image: "https://images.unsplash.com/photo-1464802686167-b939a6910659?w=900&q=80",
    href: "/journal",
  },
  {
    title: "Sustainability",
    subtitle: "Where we are today and what we will report.",
    image: "https://images.unsplash.com/photo-1495121605193-b116b5b9c5d0?w=900&q=80",
    href: "/brand/sustainability",
  },
];

export default function StoryGallery() {
  return (
    <section className="px-4 sm:px-6" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          <div>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#1E1E1E", marginBottom: "0.5rem" }}>
              Explore
            </p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3rem)", margin: 0, color: "#1E1E1E" }}>
              Moments worth slowing down for.
            </h2>
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0 m-0">
          {tiles.map((tile) => (
            <li key={tile.title}>
              <Link
                href={tile.href}
                className="img-hover-zoom relative block overflow-hidden rounded-[18px] bg-white no-underline min-h-[260px] md:min-h-[320px]"
              >
                {/* Decorative: the tile's text says where the link goes */}
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.75))",
                  }}
                />
                <div style={{ position: "absolute", bottom: "1.5rem", left: "1.5rem", right: "1.5rem", color: "#FFFFFF" }}>
                  <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.4rem, 2.5vw, 2rem)", lineHeight: 1.1 }}>
                    {tile.title}
                  </h3>
                  <p style={{ margin: "0.75rem 0 0", fontFamily: "'Montserrat', sans-serif", fontSize: "0.95rem", color: "#FFFFFF", lineHeight: 1.6 }}>
                    {tile.subtitle}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "3rem" }}>
          <Link
            href="/shop"
            className="flex items-center gap-2.5 px-8 py-3.5 bg-[#6B4E37] text-white font-sans text-xs font-bold tracking-wider uppercase rounded-full shadow-sm hover:bg-[#5A412E] transition-all duration-300"
          >
            Shop the collection
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
