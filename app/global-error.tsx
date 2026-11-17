"use client"; // Error boundaries must be Client Components

// Replaces the root layout when the layout itself crashes, so it must render its own
// <html>/<body> and can't rely on the Navbar, Footer or layout fonts.
import "./globals.css";
import { useEffect } from "react";
import { SITE } from "@/lib/site";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en-IN">
      <head>
        <title>{`Something went wrong | ${SITE.name}`}</title>
        <meta name="robots" content="noindex" />
      </head>
      <body style={{ margin: 0, backgroundColor: "#FAF9F7", color: "#111111" }}>
        <main
          role="alert"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1rem",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "520px" }}>
            <p style={{ fontFamily: "Georgia, 'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, margin: "0 0 2rem", letterSpacing: "0.04em" }}>
              {SITE.name}
            </p>
            <h1 style={{ fontFamily: "Georgia, 'Playfair Display', serif", fontSize: "2rem", fontWeight: 500, margin: "0 0 1rem" }}>
              Something went wrong
            </h1>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "1rem", lineHeight: 1.7, color: "rgba(30, 30, 30, 0.75)", margin: "0 0 2rem" }}>
              We hit a problem loading the store. Please try again in a moment.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
              <button type="button" className="btn-primary" onClick={() => retry()}>
                Try again
              </button>
              {/* Plain <a>: a full page load is the safest way out of a crashed root layout. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="btn-outline" style={{ textDecoration: "none" }}>
                Back to home
              </a>
            </div>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.875rem", color: "rgba(30, 30, 30, 0.72)", marginTop: "2rem" }}>
              Need help? <a href={`mailto:${SITE.supportEmail}`} style={{ color: "#6B4E37" }}>{SITE.supportEmail}</a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
