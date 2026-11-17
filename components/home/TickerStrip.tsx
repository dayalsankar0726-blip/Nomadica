import { Shirt, Truck, Compass, type LucideIcon } from "lucide-react";
import { POLICY } from "@/lib/site";
import { formatINR } from "@/lib/pricing";

/**
 * Brand highlights strip. Rendered as real text rather than the old Strip.jpg artwork:
 * the image said "Free Delivery Across India", but shipping is only free above
 * POLICY.freeShippingThreshold, and its text was invisible to screen readers.
 */
const ITEMS: { icon: LucideIcon; text: string }[] = [
  { icon: Shirt, text: "Premium Cotton Fabric" },
  { icon: Truck, text: `Free Shipping on Orders over ${formatINR(POLICY.freeShippingThreshold)}` },
  { icon: Compass, text: "Designed for Travellers" },
];

function Group({ hidden }: { hidden?: boolean }) {
  return (
    <ul
      aria-hidden={hidden || undefined}
      style={{ display: "flex", alignItems: "center", listStyle: "none", margin: 0, padding: 0, flexShrink: 0 }}
    >
      {ITEMS.map(({ icon: Icon, text }) => (
        <li
          key={text}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            padding: "0 2.5rem",
            whiteSpace: "nowrap",
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)",
            fontWeight: 600,
            color: "#1E1E1E",
          }}
        >
          <Icon aria-hidden="true" size={26} color="#C2410C" strokeWidth={2} />
          {text}
        </li>
      ))}
    </ul>
  );
}

export function TickerStrip() {
  return (
    <div
      className="ticker-strip"
      aria-label="Why Nomadica"
      role="region"
      style={{
        width: "100%",
        overflow: "hidden",
        backgroundColor: "#F8EFE2",
        borderTop: "1px solid rgba(0,0,0,0.04)",
        borderBottom: "1px solid rgba(0,0,0,0.04)",
        position: "relative",
        height: "60px",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Four copies so the loop never shows a gap; only the first is read aloud. */}
      <div className="ticker-track" style={{ display: "flex", width: "max-content" }}>
        <Group />
        <Group hidden />
        <Group hidden />
        <Group hidden />
      </div>

      <style>{`
        .ticker-track { animation: marquee-right-strip 40s linear infinite; }
        .ticker-strip:hover .ticker-track,
        .ticker-strip:focus-within .ticker-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; transform: none; }
        }
        @keyframes marquee-right-strip {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
}
