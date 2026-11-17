import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for has moved or no longer exists.",
};

const helpfulLinks = [
  { label: "New Arrivals", href: "/shop/new-arrivals" },
  { label: "Search the store", href: "/shop/search" },
  { label: "Contact us", href: "/support/contact" },
];

export default function NotFound() {
  return (
    <section
      aria-labelledby="not-found-title"
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 1rem",
        backgroundColor: "var(--sand)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "560px" }}>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#6B4E37",
            margin: "0 0 1rem",
          }}
        >
          Error 404
        </p>
        <h1
          id="not-found-title"
          style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 500, color: "#1E1E1E", margin: "0 0 1rem", lineHeight: 1.2 }}
        >
          This trail doesn&apos;t lead anywhere
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "rgba(30, 30, 30, 0.75)",
            margin: "0 0 2rem",
          }}
        >
          The page you were looking for has moved or no longer exists. Let&apos;s get you back on track.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", marginBottom: "2rem" }}>
          <Link href="/shop" className="btn-primary" style={{ textDecoration: "none" }}>
            Shop all
          </Link>
          <Link href="/" className="btn-outline" style={{ textDecoration: "none" }}>
            Back to home
          </Link>
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem 1.5rem",
            justifyContent: "center",
          }}
        >
          {helpfulLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: "44px",
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "#6B4E37",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
