"use client";
import { useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { SizeChart } from "@/lib/products/sizeChart";
import { useDialog } from "./useDialog";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

interface SizeGuideDialogProps {
  chart: SizeChart;
  onClose: () => void;
}

/** The size chart as a real table (plus the original chart image), in an accessible dialog. */
export function SizeGuideDialog({ chart, onClose }: SizeGuideDialogProps) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  const titleId = useId();
  if (typeof document === "undefined") return null;

  const cell = { padding: "0.5rem 0.625rem", borderBottom: `1px solid ${COLORS.border}`, textAlign: "center" as const, whiteSpace: "nowrap" as const };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.card, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", padding: "1.75rem 1.25rem 1.5rem", position: "relative", outline: "none", fontFamily: FONTS.sans }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close size guide"
          className="pd-focus"
          style={{ position: "absolute", top: 8, right: 8, width: 44, height: 44, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.charcoal }}
        >
          <X size={20} aria-hidden="true" />
        </button>
        <h2 id={titleId} style={{ fontFamily: FONTS.serif, fontSize: "1.5rem", color: COLORS.charcoal, margin: "0 2.5rem 0.25rem 0" }}>
          Size guide
        </h2>
        <p style={{ fontSize: "0.875rem", color: COLORS.muted, margin: "0 0 1.25rem" }}>
          {chart.title}. Measurements in {chart.unit}.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.875rem", color: COLORS.charcoal }}>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              {chart.title} size chart in {chart.unit}
            </caption>
            <thead>
              <tr style={{ backgroundColor: "#F5F1EB" }}>
                <th scope="col" style={{ ...cell, textAlign: "left" }}>Size</th>
                {chart.sizes.map((s) => (
                  <th key={s} scope="col" style={cell}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 600 }}>{row.label}</th>
                  {row.values.map((v, i) => (
                    <td key={chart.sizes[i]} style={cell}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.8125rem", color: COLORS.muted, margin: "0.75rem 0 1.25rem" }}>
          {chart.note} Chest is measured around the chest; length from the top of the shoulder to the hem.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={chart.image} alt="" style={{ width: "100%", height: "auto", borderRadius: RADIUS.control }} />
      </div>
    </div>,
    document.body,
  );
}
