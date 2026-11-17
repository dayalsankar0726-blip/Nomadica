// components/ui/Skeleton.tsx
//
// Shared shimmer placeholders. Use these instead of a full-page spinner so the layout
// stays put while data loads. The shimmer animation stops for "reduce motion" users
// (see globals.css).
import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  /** e.g. "3/4" for product images */
  aspectRatio?: CSSProperties["aspectRatio"];
  radius?: CSSProperties["borderRadius"];
  style?: CSSProperties;
  className?: string;
}

/** A single grey shimmer block. Decorative: hidden from screen readers. */
export function Skeleton({ width = "100%", height, aspectRatio, radius = 2, style, className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={{ width, height: height ?? (aspectRatio ? undefined : "1rem"), aspectRatio, borderRadius: radius, ...style }}
    />
  );
}

/** Lines of text, last one shorter. */
export function SkeletonText({ lines = 3, lineHeight = 14, gap = 8 }: { lines?: number; lineHeight?: number; gap?: number }) {
  return (
    <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 && lines > 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

/** Product card placeholder: 3:4 image, then category, title and price lines. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton aspectRatio="3/4" />
      <div style={{ paddingTop: "0.875rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Skeleton height={12} width="40%" />
        <Skeleton height={16} width="75%" />
        <Skeleton height={14} width="30%" />
      </div>
    </div>
  );
}

/** A grid of product card placeholders with a screen-reader "Loading" status. */
export function ProductGridSkeleton({ count = 8, label = "Loading products" }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only-text">{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.5rem" }}>
        {Array.from({ length: count }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Page-level placeholder: a heading bar and a few rows. Good default for loading.tsx. */
export function PageSkeleton({ label = "Loading page" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 1rem" }}>
      <span className="sr-only-text">{label}</span>
      <Skeleton height={36} width="40%" style={{ marginBottom: "1rem" }} />
      <Skeleton height={14} width="60%" style={{ marginBottom: "2.5rem" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.5rem" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
