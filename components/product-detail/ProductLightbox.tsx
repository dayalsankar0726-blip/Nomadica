"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import { useDialog } from "./useDialog";

interface ProductLightboxProps {
  images: string[];
  index: number;
  setIndex: (index: number) => void;
  productName: string;
  onClose: () => void;
}

/**
 * Full-screen photo viewer: a modal dialog with keyboard arrows, swipe, tap-to-zoom and
 * pinch-zoom (the browser's own), focus trap, Escape and focus return.
 */
export function ProductLightbox({ images, index, setIndex, productName, onClose }: ProductLightboxProps) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  const titleId = useId();
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;
  const go = (delta: number) => {
    if (count < 2) return;
    setZoom(null);
    setIndex((index + delta + count) % count);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const roundButton = (side: "left" | "right") => ({
    position: "absolute" as const,
    [side]: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    width: 52,
    height: 52,
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 2,
  });

  if (typeof document === "undefined") return null;
  const src = images[index];

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 10000, backgroundColor: "rgba(0, 0, 0, 0.9)", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}
    >
      <h2 id={titleId} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {productName}: photo {index + 1} of {count}
      </h2>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close photos"
        data-autofocus
        className="lightbox-focus"
        style={{ position: "absolute", top: 16, right: 16, width: 48, height: 48, borderRadius: "50%", backgroundColor: "rgba(255, 255, 255, 0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 3 }}
      >
        <X size={26} color="#1E1E1E" aria-hidden="true" />
      </button>

      {count > 1 && (
        <>
          <button type="button" className="lightbox-focus" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo" style={roundButton("left")}>
            <ChevronLeft size={30} color="#1E1E1E" aria-hidden="true" />
          </button>
          <button type="button" className="lightbox-focus" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo" style={roundButton("right")}>
            <ChevronRight size={30} color="#1E1E1E" aria-hidden="true" />
          </button>
          <p aria-hidden="true" style={{ position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center", color: "#FFFFFF", fontFamily: "'Montserrat', sans-serif", fontSize: "0.875rem", margin: 0 }}>
            {index + 1} / {count}
          </p>
        </>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = e.touches.length === 1 && !zoom ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - start.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - start.y)) go(dx < 0 ? 1 : -1);
        }}
        style={{ maxWidth: "94vw", maxHeight: "88vh", overflow: zoom ? "auto" : "hidden", touchAction: "pinch-zoom", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={getShopifyImageUrl(src, 1600)}
            alt={`${productName}, photo ${index + 1} of ${count}`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setZoom(zoom ? null : { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
            }}
            style={{
              maxHeight: "88vh",
              maxWidth: "94vw",
              objectFit: "contain",
              borderRadius: 8,
              display: "block",
              cursor: zoom ? "zoom-out" : "zoom-in",
              transform: zoom ? "scale(2)" : "none",
              transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center",
              transition: "transform 0.25s ease",
            }}
          />
        )}
      </div>
      <style>{`.lightbox-focus:focus-visible{outline:3px solid #FFFFFF;outline-offset:2px;}`}</style>
    </div>,
    document.body,
  );
}
