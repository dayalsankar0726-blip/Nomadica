// components/ui/PageLoader.tsx
"use client";

/**
 * Inline loading indicator. Announces itself to screen readers (role="status").
 * Prefer a layout-matching <Skeleton /> (components/ui/Skeleton.tsx) for whole pages so
 * content doesn't jump when it arrives.
 */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        width: "100%",
        fontFamily: "var(--font-body), sans-serif",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "24px",
          height: "24px",
          border: "2px solid rgba(107, 78, 55, 0.2)",
          borderTop: "2px solid #6B4E37",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginRight: "0.75rem",
        }}
      />
      <span style={{ fontSize: "0.8125rem", color: "rgba(30, 30, 30, 0.72)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}
