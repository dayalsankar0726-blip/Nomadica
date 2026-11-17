import Link from "next/link";
import Image from "next/image";

// TODO(store owner): this is a stock Unsplash photo. Replace it with Nomadica's own
// photography (product or campaign shots) when available.
const HERO_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80";

export default function BrandHero() {
  return (
    <section
      className="px-4 sm:px-6"
      style={{
        position: "relative",
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        paddingTop: "3rem",
        paddingBottom: "3rem",
        overflow: "hidden",
      }}
    >
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
      {/* Dark overlay so the white text stays readable over any part of the photo */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(20, 16, 12, 0.55), rgba(20, 16, 12, 0.65))",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "880px",
          textAlign: "center",
          color: "#FFFFFF",
          display: "grid",
          gap: "1.5rem",
        }}
      >
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "0.8rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#FFFFFF",
          }}
        >
          The Nomadica brand
        </span>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2.5rem, 5vw, 5.5rem)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          The brand behind every path.
        </h1>
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "1rem",
            maxWidth: "680px",
            margin: "0 auto",
            color: "#FFFFFF",
            lineHeight: 1.8,
          }}
        >
          Travel-inspired apparel with original designs drawn from destinations, wildlife and the journeys between them.
        </p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1rem" }}>
          <Link
            href="/brand/about"
            className="inline-block border border-white text-white no-underline hover:bg-white/10"
            style={{ padding: "0.95rem 2rem", fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", letterSpacing: "0.08em" }}
          >
            About Us
          </Link>
          <Link
            href="/shop"
            className="inline-block bg-white text-[#1E1E1E] no-underline hover:bg-[#F3EDE6]"
            style={{ padding: "0.95rem 2rem", fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", letterSpacing: "0.08em" }}
          >
            Shop the collection
          </Link>
        </div>
      </div>
    </section>
  );
}
