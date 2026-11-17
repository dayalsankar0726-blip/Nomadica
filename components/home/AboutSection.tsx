import Link from "next/link";
import Image from "next/image";

export function AboutSection() {
  return (
    <section aria-labelledby="home-about-title" style={{ backgroundColor: "#F5F3F0", padding: "clamp(2rem, 5vw, 5rem) 1.5rem" }}>
      <style>{`
        .about-feature { display: flex; flex-direction: column; gap: 0.25rem; }
        .about-feature > span:first-child { flex: none; }
        @media (min-width: 640px) {
          .about-feature { flex-direction: row; align-items: flex-start; gap: 1.5rem; }
          .about-feature > span:first-child { flex: 0 0 160px; }
        }
        .about-cta { background-color: #6B4E37; transition: background-color 0.3s ease; }
        .about-cta:hover { background-color: #553D2B; }
      `}</style>
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Left Column: Image */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "clamp(250px, 34vw, 570px)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <Image
            src="/About-us.jpg"
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 45vw"
            style={{ objectFit: "cover" }}
          />
        </div>

        {/* Right Column: Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2
            id="home-about-title"
            style={{
              fontFamily: "'Playfair Display', sans-serif",
              fontSize: "clamp(2rem, 3.5vw, 2.5rem)",
              fontWeight: 600,
              color: "#1E1E1E",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            About Nomadica
          </h2>

          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "0.95rem",
              color: "rgba(30, 30, 30, 0.7)",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            Born from a passion for travel and timeless design, Nomadica celebrates the spirit of exploration through premium apparel. Each piece is thoughtfully crafted to reflect the beauty of destinations, wildlife, and adventures that inspire us to wander.
          </p>

          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "0.95rem",
              color: "rgba(30, 30, 30, 0.7)",
              lineHeight: 1.8,
              margin: 0,
              marginBottom: "0.5rem",
            }}
          >
            We believe in quality over quantity,{" "}
            <Link href="/brand/sustainability" style={{ color: "#6B4E37", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              sustainability over fast fashion
            </Link>
            , and designs that tell stories.
          </p>

          {/* List Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1rem" }}>
            {/* Item 1 */}
            <div
              className="about-feature"
              style={{
                paddingLeft: "1rem",
                borderLeft: "2px solid #c4a77d",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  color: "#1E1E1E",
                  lineHeight: 1.2,
                }}
              >
                Premium Quality
              </span>
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.9rem",
                  color: "rgba(30, 30, 30, 0.75)",
                  lineHeight: 1.4,
                }}
              >
                Soft, durable fabrics that feel as good as they look
              </span>
            </div>

            {/* Item 2 */}
            <div
              className="about-feature"
              style={{
                paddingLeft: "1rem",
                borderLeft: "2px solid #c4a77d",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  color: "#1E1E1E",
                  lineHeight: 1.2,
                }}
              >
                Unique Designs
              </span>
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.9rem",
                  color: "rgba(30, 30, 30, 0.75)",
                  lineHeight: 1.4,
                }}
              >
                Original artwork celebrating travel and adventure
              </span>
            </div>
          </div>

          <div>
            <Link
              href="/brand/about"
              className="about-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "44px",
                color: "#FFFFFF",
                textDecoration: "none",
                borderRadius: "4px",
                padding: "0.85rem 2rem",
                fontFamily: "'Montserrat', sans-serif",
                fontSize: "0.8125rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}
            >
              LEARN MORE ABOUT US
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
