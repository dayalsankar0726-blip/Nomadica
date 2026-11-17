"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  const digest =
    error && typeof error === "object" && "digest" in error && typeof (error as { digest?: unknown }).digest === "string"
      ? (error as { digest: string }).digest
      : null;

  return (
    <section
      role="alert"
      aria-labelledby="error-title"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 1rem",
        backgroundColor: "var(--sand)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "560px" }}>
        <h1 id="error-title" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 500, color: "#1E1E1E", margin: "0 0 1rem" }}>
          Something went wrong
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
          We couldn&apos;t load this page. Your bag is safe. Please try again, or head back to the home page.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
          <button type="button" className="btn-primary" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/" className="btn-outline" style={{ textDecoration: "none" }}>
            Back to home
          </Link>
        </div>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "0.8125rem",
            color: "rgba(30, 30, 30, 0.72)",
            margin: "2rem 0 0",
          }}
        >
          Still stuck? Email{" "}
          <a href={`mailto:${SITE.supportEmail}`} style={{ color: "#6B4E37" }}>
            {SITE.supportEmail}
          </a>
          {digest ? ` and quote reference ${digest}.` : "."}
        </p>
      </div>
    </section>
  );
}
