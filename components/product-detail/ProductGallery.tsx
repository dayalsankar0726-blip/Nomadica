"use client";
import { useRef } from "react";
import Image from "next/image";
import { Heart, Maximize2 } from "lucide-react";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import type { ProductDetails } from "./productDetailUtils";
import styles from "./ProductDetail.module.css";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

interface ProductGalleryProps {
  product: ProductDetails;
  /** Every photo of the product (lifestyle mockup first when there is one). */
  images: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Image shown while a colour swatch is hovered. */
  previewImage: string | null;
  wishlisted: boolean;
  onOpenLightbox: () => void;
  handleWishlistToggle: () => void;
}

export function ProductGallery({
  product,
  images,
  selectedIndex,
  onSelect,
  previewImage,
  wishlisted,
  onOpenLightbox,
  handleWishlistToggle,
}: ProductGalleryProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const current = previewImage || images[selectedIndex] || "";
  const count = images.length;

  const go = (delta: number) => {
    if (count > 1) onSelect((selectedIndex + delta + count) % count);
  };

  return (
    <div className={styles.galleryInner}>
      {count > 1 && (
        <div className={styles.thumbs} role="group" aria-label="Product photos">
          {images.map((img, idx) => {
            const selected = idx === selectedIndex && !previewImage;
            return (
              <button
                key={`${img}-${idx}`}
                type="button"
                onClick={() => onSelect(idx)}
                className={`${styles.thumb} ${styles.focusable}`}
                aria-label={`Photo ${idx + 1} of ${count}`}
                aria-pressed={selected}
                style={{ border: selected ? `2px solid ${COLORS.brown}` : "1px solid rgba(30, 30, 30, 0.2)" }}
              >
                <Image src={getShopifyImageUrl(img, 160)} alt="" fill sizes="68px" style={{ objectFit: "cover" }} />
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.mainWrap}>
        <div
          className={styles.mainImage}
          onTouchStart={(e) => {
            const t = e.touches[0];
            touchStart.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
          }}
          onTouchEnd={(e) => {
            const start = touchStart.current;
            touchStart.current = null;
            if (!start) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - start.x;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(t.clientY - start.y)) go(dx < 0 ? 1 : -1);
          }}
        >
          {current ? (
            <Image
              src={getShopifyImageUrl(current, 1000)}
              alt={`${product.name}${count > 1 ? `, photo ${selectedIndex + 1} of ${count}` : ""}`}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 640px"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.serif, fontSize: "1.5rem", color: COLORS.muted }}>
              Nomadica
            </div>
          )}

          {/* Open the full-screen view (a real button, so it works with a keyboard) */}
          {current && (
            <button
              type="button"
              onClick={onOpenLightbox}
              aria-label="Open full-screen photos"
              className={styles.focusable}
              style={{ position: "absolute", inset: 0, background: "transparent", border: "none", cursor: "zoom-in", zIndex: 1 }}
            />
          )}

          {product.badge && (
            <span style={{ position: "absolute", top: 16, left: 16, backgroundColor: COLORS.charcoal, color: "#FFFFFF", fontFamily: FONTS.sans, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.35rem 0.75rem", borderRadius: RADIUS.control, zIndex: 2, pointerEvents: "none" }}>
              {product.badge}
            </span>
          )}

          <button
            type="button"
            onClick={handleWishlistToggle}
            aria-pressed={wishlisted}
            aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
            className={styles.focusable}
            style={{ position: "absolute", top: 12, right: 12, width: 44, height: 44, borderRadius: "50%", backgroundColor: "#FFFFFF", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", zIndex: 2 }}
          >
            <Heart size={20} aria-hidden="true" fill={wishlisted ? COLORS.wishlist : "none"} color={wishlisted ? COLORS.wishlist : COLORS.charcoal} />
          </button>

          {current && (
            <span aria-hidden="true" style={{ position: "absolute", bottom: 12, right: 12, width: 36, height: 36, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, pointerEvents: "none" }}>
              <Maximize2 size={16} color={COLORS.charcoal} />
            </span>
          )}

          {count > 1 && (
            <span aria-hidden="true" style={{ position: "absolute", bottom: 12, left: 12, padding: "0.2rem 0.6rem", borderRadius: RADIUS.pill, backgroundColor: "rgba(255,255,255,0.9)", fontFamily: FONTS.sans, fontSize: "0.75rem", color: COLORS.charcoal, zIndex: 2, pointerEvents: "none" }}>
              {selectedIndex + 1} / {count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
