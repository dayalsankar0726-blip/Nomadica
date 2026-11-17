"use client";
import { useState } from "react";
import { SITE } from "@/lib/site";
import { Link2, Share2 } from "lucide-react";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

/** Share the product: the phone's share sheet when available, WhatsApp, or copy the link. */
export function ShareProduct({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const shareUrl = `https://${SITE.domain}${path}`;
  const pageUrl = () => `${window.location.origin}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    window.setTimeout(() => setCopied(null), 3000);
  };

  const pill = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    minHeight: 36,
    padding: "0 0.875rem",
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.pill,
    background: COLORS.surface,
    color: COLORS.charcoal,
    fontFamily: FONTS.sans,
    fontSize: "0.8125rem",
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
  } as const;

  const text = `${title} on Nomadica`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
      <span style={{ fontFamily: FONTS.sans, fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.charcoal, marginRight: "0.25rem" }}>
        Share
      </span>
      <button
        type="button"
        className="pd-focus"
        style={pill}
        onClick={() => {
          // The phone's share sheet when there is one; otherwise copy the link.
          if (typeof navigator.share === "function") navigator.share({ title: text, url: pageUrl() }).catch(() => {});
          else void copy();
        }}
      >
        <Share2 size={15} aria-hidden="true" /> Share
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="pd-focus"
        style={pill}
        aria-label="Share on WhatsApp (opens in a new tab)"
      >
        WhatsApp
      </a>
      <button
        type="button"
        className="pd-focus"
        style={pill}
        onClick={() => void copy()}
      >
        <Link2 size={15} aria-hidden="true" /> Copy link
      </button>
      <span role="status" aria-live="polite" style={{ fontFamily: FONTS.sans, fontSize: "0.75rem", color: copied === "fail" ? COLORS.error : COLORS.muted }}>
        {copied === "ok" ? "Link copied" : copied === "fail" ? "Couldn't copy the link" : ""}
      </span>
    </div>
  );
}
