"use client";
import { useState } from "react";
import { Ruler } from "lucide-react";
import { parseProduct } from "@/utils/productGroup";
import type { ProductDetails } from "./productDetailUtils";
import type { SizeOption } from "@/lib/products/sizes";
import type { SizeChart } from "@/lib/products/sizeChart";
import { SizeGuideDialog } from "./SizeGuideDialog";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

/* eslint-disable @typescript-eslint/no-explicit-any */

const isWhiteColor = (colorHex: string) => {
  if (!colorHex) return false;
  const normalized = colorHex.trim().toLowerCase();
  return normalized === "#ffffff" || normalized === "white" || normalized === "#fff";
};

interface SizeColorSelectorProps {
  product: ProductDetails;
  /** Sizes from the product's real variants; empty for a one-size product. */
  sizes: SizeOption[];
  /** Null until the shopper picks a size: nothing is preselected. */
  selectedSize: string | null;
  setSelectedSize: (size: string) => void;
  /** Shown under the sizes, e.g. "Please select a size". */
  sizeError?: string;
  /** Size chart for this product type, or null when there is none. */
  sizeChart: SizeChart | null;
  uniqueColorVariations: any[];
  activeVariant: any;
  hoveredSwatchId: string | null;
  isVariantActive: (v: any) => boolean;
  handleColorSelect: (v: any, idx: number) => void;
  setHoveredColorImage: (img: string | null) => void;
  setHoveredSwatchId: (id: string | null) => void;
}

const labelStyle = {
  fontFamily: FONTS.sans,
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: COLORS.charcoal,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: 0,
};

export function SizeColorSelector({
  product,
  sizes,
  selectedSize,
  setSelectedSize,
  sizeError,
  sizeChart,
  uniqueColorVariations,
  activeVariant,
  hoveredSwatchId,
  isVariantActive,
  handleColorSelect,
  setHoveredColorImage,
  setHoveredSwatchId,
}: SizeColorSelectorProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const activeColorName = activeVariant?.colorName || parseProduct({ name: product.rawName }).colorName;
  const rawShown = hoveredSwatchId ? uniqueColorVariations.find((v) => v.id === hoveredSwatchId)?.colorName : activeColorName;
  // Some sample data names colours by hex code; don't show a code as a colour name.
  const shownColorName = rawShown && !/^#[0-9a-f]{3,8}$/i.test(rawShown) ? rawShown : "";

  return (
    <>
      {/* Size: only sizes this product really has; sold-out sizes can't be picked */}
      {sizes.length > 0 && (
        <div id="product-sizes" style={{ marginBottom: "2rem", scrollMarginTop: "110px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "1rem" }}>
            <p id="size-label" style={labelStyle}>
              Size{selectedSize ? <span style={{ fontWeight: 400, color: COLORS.muted, textTransform: "none" }}>: {selectedSize}</span> : null}
            </p>
            {sizeChart && (
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="pd-focus"
                aria-haspopup="dialog"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", minHeight: 36, padding: "0 0.25rem", background: "none", border: "none", color: COLORS.brown, fontFamily: FONTS.sans, fontSize: "0.8125rem", fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
              >
                <Ruler size={16} aria-hidden="true" />
                Size guide
              </button>
            )}
          </div>
          <div role="group" aria-labelledby="size-label" aria-describedby={sizeError ? "size-error" : undefined} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {sizes.map(({ label, available }) => {
              const isSelected = selectedSize === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => available && setSelectedSize(label)}
                  disabled={!available}
                  aria-pressed={isSelected}
                  aria-label={available ? `Size ${label}` : `Size ${label}, sold out`}
                  title={available ? undefined : "Sold out"}
                  className="pd-focus"
                  style={{
                    height: "44px",
                    minWidth: "44px",
                    padding: "0 1.1rem",
                    border: isSelected ? `1.5px solid ${COLORS.brown}` : sizeError ? `1px solid ${COLORS.error}` : "1px solid rgba(30, 30, 30, 0.4)",
                    backgroundColor: isSelected ? COLORS.brown : available ? "#FFFFFF" : "#F3F1EE",
                    color: isSelected ? "#FFFFFF" : available ? COLORS.charcoal : COLORS.muted,
                    textDecoration: available ? "none" : "line-through",
                    fontFamily: FONTS.sans,
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    borderRadius: RADIUS.control,
                    cursor: available ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {sizeError && (
            <p id="size-error" role="alert" style={{ fontFamily: FONTS.sans, fontSize: "0.8125rem", color: COLORS.error, margin: "0.625rem 0 0" }}>
              {sizeError}
            </p>
          )}
        </div>
      )}

      {/* Colour */}
      {uniqueColorVariations.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <p id="color-label" style={{ ...labelStyle, marginBottom: "0.75rem" }}>
            Colour{shownColorName ? ":" : ""} <span style={{ fontWeight: 400, color: COLORS.muted, textTransform: "none" }}>{shownColorName}</span>
          </p>
          <div role="group" aria-labelledby="color-label" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {uniqueColorVariations.map((v, idx) => {
              const isCurrent = isVariantActive(v);
              const isHovered = hoveredSwatchId === v.id;
              return (
                <button
                  key={v.id || idx}
                  type="button"
                  onClick={() => handleColorSelect(v, idx)}
                  aria-pressed={isCurrent}
                  aria-label={`Colour ${v.colorName}`}
                  title={v.colorName}
                  className="pd-focus"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: v.colorHex,
                    border: isWhiteColor(v.colorHex) ? "1px solid rgba(30,30,30,0.3)" : "1px solid rgba(0,0,0,0.08)",
                    boxShadow: isCurrent ? `0 0 0 3px #FFFFFF, 0 0 0 5px ${COLORS.charcoal}` : isHovered ? `0 0 0 3px #FFFFFF, 0 0 0 5px rgba(30,30,30,0.4)` : "0 1px 4px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    padding: 0,
                    transition: "box-shadow 0.2s ease",
                  }}
                  onMouseEnter={() => {
                    setHoveredSwatchId(v.id);
                    setHoveredColorImage(v.image);
                  }}
                  onMouseLeave={() => {
                    setHoveredSwatchId(null);
                    setHoveredColorImage(null);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {guideOpen && sizeChart && <SizeGuideDialog chart={sizeChart} onClose={() => setGuideOpen(false)} />}
    </>
  );
}
