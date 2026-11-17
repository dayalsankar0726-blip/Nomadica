import Link from "next/link";
import Image from "next/image";

export function JourneyBanner() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        minHeight: "420px",
        height: "clamp(420px, 40vw, 500px)",
        overflow: "hidden",
      }}
    >
      <style>{`
        .journey-cta { background-color: #6B4E37; transition: background-color 0.3s ease, transform 0.2s ease; }
        .journey-cta:hover { background-color: #553D2B; transform: translateY(-2px); }
        .journey-cta:focus-visible { outline: 3px solid #FFFFFF; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .journey-cta, .journey-cta:hover { transition: none; transform: none; } }
      `}</style>
      <Image
        src="/paddy-img.jpg"
        alt=""
        fill
        sizes="100vw"
        style={{
          objectFit: "cover",
          objectPosition: "center 100%",
        }}
      />

      {/* Dark overlay so the white text stays readable over the photo */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.5))",
        }}
      />

      {/* Center Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "0 1.5rem",
          zIndex: 2,
          color: "#FFFFFF",
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2.5rem, 3vw, 3.5rem)",
            fontWeight: 500,
            marginBottom: "1rem",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            textShadow: "0 2px 6px rgba(0,0,0,0.35)",
          }}
        >
          Start Your Journey
        </h2>

        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            fontWeight: 400,
            marginBottom: "2rem",
            textShadow: "0 1px 4px rgba(0,0,0,0.35)",
          }}
        >
          Travel-inspired apparel for every journey
        </p>

        <Link
          href="/shop"
          className="journey-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "48px",
            color: "#FFFFFF",
            textDecoration: "none",
            borderRadius: "4px",
            padding: "0.875rem 2.5rem",
            maxWidth: "100%",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "0.85rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
          }}
        >
          SHOP THE COLLECTION
        </Link>
      </div>
    </section>
  );
}
