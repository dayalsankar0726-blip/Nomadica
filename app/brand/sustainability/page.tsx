import Link from "next/link";
import { SITE } from "@/lib/site";

// The previous version of this page listed figures (72% recycled fabrics, 38% carbon
// reduction, 25M litres of water saved, 84% local production) and materials (recycled
// nylon, organic cotton, plant-based dyes) that had no source. They were removed: publishing
// unverified environmental claims is a greenwashing risk.
//
// TODO(store owner): add only facts you can back up (fabric composition, printing method,
// supplier or certification details, with links to certificates or reports). Until then the
// page is kept out of search results (see layout.tsx) and says plainly that details are coming.

export default function SustainabilityPage() {
  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100vh" }}>
      <section className="px-4 sm:px-6" style={{ paddingTop: "4.5rem", paddingBottom: "4.5rem" }}>
        <div style={{ maxWidth: "880px", margin: "0 auto" }}>
          <div style={{ display: "grid", gap: "1.5rem", textAlign: "center", marginBottom: "3rem" }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#1E1E1E", margin: 0 }}>
              Sustainability
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.25rem, 5vw, 4rem)", margin: 0, color: "#1E1E1E" }}>
              Facts, not slogans.
            </h1>
            <p style={{ margin: "0 auto", maxWidth: "680px", fontFamily: "'Montserrat', sans-serif", fontSize: "1rem", lineHeight: 1.8, color: "rgba(30,30,30,0.8)" }}>
              We would rather tell you nothing than tell you something we can&apos;t back up. When we have verified
              details about our fabrics, printing and production, we will publish them here.
            </p>
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2" style={{ marginBottom: "3rem" }}>
            <div style={{ padding: "2rem", borderRadius: "24px", backgroundColor: "#F7F3EE" }}>
              <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#1E1E1E" }}>Made to be worn often</h2>
              <p style={{ marginTop: "1rem", marginBottom: 0, fontFamily: "'Montserrat', sans-serif", fontSize: "1rem", lineHeight: 1.8, color: "rgba(30,30,30,0.8)" }}>
                The most sustainable piece is the one you keep wearing. We design for everyday travel and care about
                prints and fabrics that last wash after wash.
              </p>
            </div>
            <div style={{ padding: "2rem", borderRadius: "24px", backgroundColor: "#FFFFFF", border: "1px solid rgba(30,30,30,0.12)" }}>
              <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#1E1E1E" }}>Questions?</h2>
              <p style={{ marginTop: "1rem", marginBottom: 0, fontFamily: "'Montserrat', sans-serif", fontSize: "1rem", lineHeight: 1.8, color: "rgba(30,30,30,0.8)" }}>
                If you want to know something specific about a product, ask us at{" "}
                <a href={`mailto:${SITE.supportEmail}`} className="font-semibold text-[#6B4E37] underline">{SITE.supportEmail}</a>.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              href="/brand/about"
              className="inline-block border border-[#1E1E1E] text-[#1E1E1E] no-underline hover:bg-[#F3EDE6]"
              style={{ padding: "0.95rem 1.75rem", letterSpacing: "0.08em", fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem" }}
            >
              About Nomadica
            </Link>
            <Link
              href="/shop"
              className="inline-block bg-[#6B4E37] text-white no-underline hover:bg-[#5A412E]"
              style={{ padding: "0.95rem 1.75rem", letterSpacing: "0.08em", fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem" }}
            >
              Shop the collection
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
