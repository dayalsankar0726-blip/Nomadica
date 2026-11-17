// app/brand/about/page.tsx
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Leaf, Check } from "lucide-react";
import { POLICY, SITE } from "@/lib/site";
import { formatINR } from "@/lib/pricing";

// TODO(store owner): the story below is general. Add the real origin story (who founded
// Nomadica, when and why) and fabric details (composition, GSM, printing method) when known.
// Do not add names, dates or specs that haven't been confirmed.

const standForItems = [
  {
    icon: <Sparkles size={36} aria-hidden="true" style={{ color: "#5E6B53" }} />,
    title: "Premium Quality",
    desc: "We use carefully selected cotton blends that are soft, breathable and long-lasting, made to feel good and hold up to everyday adventures.",
  },
  {
    icon: <Leaf size={36} aria-hidden="true" style={{ color: "#5E6B53" }} />,
    title: "Original Designs",
    desc: "Each design is created by our team of travel-loving artists, turning real destinations and experiences into story-driven artwork you won't find anywhere else.",
  },
];

const whyChooseItems = [
  {
    title: "Unisex Sizing",
    desc: "Designed for all body types with a comfortable fit for everyone.",
  },
  {
    title: "Durable Prints",
    desc: "High-quality printing that stays vibrant wash after wash.",
  },
  {
    title: "Shipping Across India",
    desc: `We deliver across India. Shipping is free on orders of ${formatINR(POLICY.freeShippingThreshold)} or more.`,
  },
  {
    title: "Soft Fabrics",
    desc: "Cotton blends that feel soft from day one and get better over time.",
  },
  {
    title: `${POLICY.returnDays}-Day Returns`,
    desc: `Not the right fit? Request a return within ${POLICY.returnDays} days of delivery.`,
  },
];

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: "#FBF9F7", fontFamily: "'Montserrat', sans-serif" }}>
      {/* Hero: image with the headline on it, so the first screen on phones has text */}
      <section className="relative w-full overflow-hidden h-[55vh] min-h-[320px] max-h-[640px] flex items-center justify-center px-4">
        {/* TODO(store owner): confirm /About-us.jpg is Nomadica's own photo (not stock). */}
        <Image src="/About-us.jpg" alt="" fill priority sizes="100vw" style={{ objectFit: "cover" }} />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: "rgba(20,16,12,0.5)" }} />
        <div className="relative z-10 text-center text-white">
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2.25rem, 6vw, 4rem)",
              fontWeight: 400,
              margin: "0 0 0.75rem",
            }}
          >
            About {SITE.name}
          </h1>
          <p style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", letterSpacing: "0.05em", margin: 0 }}>
            Where wanderlust meets timeless design
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="px-4 sm:px-6" style={{ maxWidth: "800px", margin: "0 auto", paddingTop: "4rem", paddingBottom: "4rem" }}>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem, 4vw, 2.625rem)",
            fontWeight: 400,
            color: "#1E1E1E",
            margin: "0 0 2rem",
            textAlign: "center",
          }}
        >
          Our Story
        </h2>
        <div style={{ fontSize: "1.063rem", color: "rgba(30,30,30,0.8)", lineHeight: 1.9, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <p style={{ margin: 0 }}>
            Born from a passion for travel and timeless design, Nomadica celebrates the spirit of exploration through apparel made for modern wanderers.
          </p>
          <p style={{ margin: 0 }}>
            Every piece we create reflects the destinations, wildlife and adventures that inspire us to move, explore and dream beyond borders.
          </p>
          <p style={{ margin: 0 }}>
            We believe in quality over quantity and in designs that tell meaningful stories, so that each piece lasts through many journeys.
          </p>
          <p style={{ margin: 0 }}>
            From the romantic streets of Paris to wild African safaris, from the mountains of Patagonia to golden coastal sunsets, we bring these moments to life as wearable art.
          </p>
        </div>
      </section>

      {/* What We Stand For */}
      <section className="px-4 sm:px-6" style={{ backgroundColor: "#F5F2EE", paddingTop: "4rem", paddingBottom: "4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.5rem" }}>
            What We Stand For
          </h2>
          <p style={{ fontSize: "0.95rem", color: "rgba(30,30,30,0.75)", margin: 0 }}>Our values guide everything we create.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ maxWidth: "800px", margin: "0 auto" }}>
          {standForItems.map((item) => (
            <div
              key={item.title}
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: "12px",
                padding: "2.5rem 2rem",
                textAlign: "center",
                boxShadow: "rgba(0, 0, 0, 0.08) 0px 4px 12px",
              }}
            >
              <div style={{ display: "inline-flex", marginBottom: "1.5rem" }}>{item.icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 1rem" }}>
                {item.title}
              </h3>
              <p style={{ fontSize: "0.938rem", color: "rgba(30,30,30,0.8)", lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Nomadica */}
      <section className="px-4 sm:px-6" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem, 4vw, 2.625rem)",
            fontWeight: 400,
            color: "#1E1E1E",
            textAlign: "center",
            margin: "0 0 3rem",
          }}
        >
          Why Choose Nomadica
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 list-none p-0" style={{ maxWidth: "1000px", margin: "0 auto" }}>
          {whyChooseItems.map((item) => (
            <li key={item.title} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <Check size={22} strokeWidth={3} aria-hidden="true" style={{ color: "#6B4E37", flexShrink: 0, marginTop: "0.2rem" }} />
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.4rem" }}>{item.title}</h3>
                <p style={{ fontSize: "0.938rem", color: "rgba(30,30,30,0.8)", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Calls to action */}
      <section className="px-4 sm:px-6 text-center" style={{ paddingBottom: "5rem" }}>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/shop"
            className="inline-block rounded bg-[#6B4E37] px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white no-underline hover:bg-[#5A412E]"
          >
            Shop the collection
          </Link>
          <Link
            href="/journal"
            className="inline-block rounded border border-[#1E1E1E] px-8 py-4 text-sm font-semibold uppercase tracking-wider text-[#1E1E1E] no-underline hover:bg-[#F3EDE6]"
          >
            Read the Journal
          </Link>
        </div>
      </section>
    </div>
  );
}
