// components/layout/Footer.tsx
import Link from "next/link";
import Image from "next/image";
import { SITE, POLICY } from "@/lib/site";
import { formatINR } from "@/lib/pricing";

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const MailIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Shop All", href: "/shop" },
      { label: "New Arrivals", href: "/shop/new-arrivals" },
      { label: "Best Sellers", href: "/shop/best-sellers" },
      { label: "Destination", href: "/collections/destination-collection" },
      { label: "Wildlife & Safari", href: "/collections/wildlife-and-safari" },
      { label: "Adventure & Trekking", href: "/collections/adventure-and-trekking-collections" },
      { label: "Travel Quotes", href: "/collections/travel-quotes" },
      { label: "Beach Vibes", href: "/collections/beach-vibes" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Help Centre", href: "/support" },
      { label: "Contact Us", href: "/support/contact" },
      { label: "FAQ", href: "/support/faq" },
      { label: "Track Your Order", href: "/order-tracking" },
      { label: "Shipping Policy", href: "/support/shipping-policy" },
      { label: "Returns & Exchanges", href: "/support/return-policy" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Nomadica", href: "/brand/about" },
      { label: "Travel Inspiration", href: "/brand/story" },
      { label: "Journal", href: "/journal" },
      { label: "My Account", href: "/account/profile" },
    ],
  },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/support/privacy-policy" },
  { label: "Terms & Conditions", href: "/support/terms" },
];

// Only methods the checkout actually offers (Razorpay card/UPI, and Cash on Delivery).
const paymentMethods = ["UPI", "Cards", "Cash on Delivery"];

const headingStyle = {
  fontSize: "0.75rem",
  fontWeight: 700,
  fontFamily: "var(--font-body), sans-serif",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "#FFFFFF",
  margin: "0 0 1rem",
};

const mutedText = "rgba(255, 255, 255, 0.75)";

export default function Footer() {
  const socials = [
    { label: `${SITE.name} on Instagram`, href: SITE.social.instagram, Icon: InstagramIcon },
    { label: `${SITE.name} on Facebook`, href: SITE.social.facebook, Icon: FacebookIcon },
  ].filter((s): s is { label: string; href: string; Icon: typeof InstagramIcon } => Boolean(s.href));

  const whatsappHref = SITE.whatsappNumber ? `https://wa.me/${SITE.whatsappNumber.replace(/\D/g, "")}` : null;
  const companyFacts = [
    SITE.legalName,
    SITE.registeredAddress,
    SITE.gstin ? `GSTIN: ${SITE.gstin}` : null,
    SITE.cin ? `CIN: ${SITE.cin}` : null,
  ].filter(Boolean) as string[];

  return (
    <footer
      className="on-dark"
      style={{
        backgroundColor: "#040001",
        color: "#FFFFFF",
        paddingTop: "4rem",
        paddingBottom: "2rem",
        fontFamily: "var(--font-body), sans-serif",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 1rem" }}>
        {/* Main Grid Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "2.5rem",
            paddingBottom: "3rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {/* Brand Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Link href="/" aria-label={`${SITE.name} home`} style={{ display: "inline-block", width: "fit-content" }}>
              <Image
                src="/Dark-Nomadica-Log.jpg"
                alt={SITE.name}
                width={252}
                height={56}
                style={{ height: "56px", width: "auto", display: "block", objectFit: "contain" }}
              />
            </Link>

            <p style={{ fontSize: "0.875rem", color: mutedText, lineHeight: "1.7", margin: 0, maxWidth: "320px" }}>
              Wear your wanderlust. Premium travel-inspired apparel for the modern explorer.
            </p>

            {/* Contact: only details that are confirmed in lib/site.ts */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <li>
                <a href={`mailto:${SITE.supportEmail}`} className="footer-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "44px" }}>
                  <MailIcon size={16} />
                  {SITE.supportEmail}
                </a>
              </li>
              {SITE.supportPhone && (
                <li>
                  <a href={`tel:${SITE.supportPhone.replace(/\s/g, "")}`} className="footer-link" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px" }}>
                    Call {SITE.supportPhone}
                  </a>
                </li>
              )}
              {whatsappHref && (
                <li>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px" }}>
                    Chat on WhatsApp
                  </a>
                </li>
              )}
            </ul>

            {socials.length > 0 && (
              <ul aria-label="Follow us" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", gap: "0.25rem" }}>
                {socials.map(({ label, href, Icon }) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="footer-link"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px" }}
                    >
                      <Icon size={20} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={`Footer: ${col.title}`}>
              <p style={headingStyle}>{col.title}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="footer-link"
                      style={{ display: "inline-flex", alignItems: "center", minHeight: "36px", fontSize: "0.875rem" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Trust row: payment methods + policies that come from lib/site.ts */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem 2rem",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.5rem 0",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: mutedText, marginRight: "0.25rem" }}>
              We accept
            </span>
            <ul aria-label="Payment methods" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {paymentMethods.map((m) => (
                <li
                  key={m}
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "4px",
                    padding: "0.3rem 0.6rem",
                  }}
                >
                  {m}
                </li>
              ))}
            </ul>
            <span style={{ fontSize: "0.75rem", color: mutedText, marginLeft: "0.25rem" }}>Secure checkout by Razorpay</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem", fontSize: "0.8125rem", color: mutedText }}>
            <li>Free shipping on orders of {formatINR(POLICY.freeShippingThreshold)}+</li>
            <li>{POLICY.returnDays}-day returns</li>
            {!POLICY.shipsInternationally && <li>Ships across India</li>}
          </ul>
        </div>

        {/* Bottom Section */}
        <div
          style={{
            paddingTop: "1.25rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem 1.5rem",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: mutedText, margin: 0 }}>
              © {new Date().getFullYear()} {SITE.legalName || SITE.name}. All rights reserved.
            </p>
            {companyFacts.length > 0 && (
              <p style={{ fontSize: "0.75rem", color: mutedText, margin: 0 }}>{companyFacts.join(" · ")}</p>
            )}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", gap: "1.25rem" }}>
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="footer-link" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", fontSize: "0.8125rem" }}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
