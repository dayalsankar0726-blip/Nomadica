// app/account/_components/OrderBits.tsx
"use client";
import { useState } from "react";
import { Shirt } from "lucide-react";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import type { OrderStage, OrderStatus } from "../_lib/orderStatus";

const STAGE_COLORS: Record<OrderStage, { color: string; backgroundColor: string }> = {
  PLACED: { color: "#92400E", backgroundColor: "#FFFBEB" },
  PACKED: { color: "#6B4E37", backgroundColor: "#F5EFE8" },
  SHIPPED: { color: "#1D4ED8", backgroundColor: "#EFF6FF" },
  DELIVERED: { color: "#166534", backgroundColor: "#F0FDF4" },
  RETURNED: { color: "#6D28D9", backgroundColor: "#F5F3FF" },
  CANCELLED: { color: "#B91C1C", backgroundColor: "#FEF2F2" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      style={{
        fontFamily: "'Montserrat', sans-serif",
        fontSize: "0.75rem",
        fontWeight: 600,
        padding: "0.2rem 0.6rem",
        borderRadius: "999px",
        whiteSpace: "nowrap",
        ...STAGE_COLORS[status.stage],
      }}
    >
      {status.label}
    </span>
  );
}

/** The item's own photo, or a neutral placeholder (never another product's photo). */
export function OrderItemImage({ src, size = 72 }: { src: string | null | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box: React.CSSProperties = {
    width: size,
    aspectRatio: "3 / 4",
    borderRadius: "4px",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#F3EFEA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  if (!src || failed) {
    return (
      <div style={box} aria-hidden="true">
        <Shirt size={24} color="rgba(30,30,30,0.35)" />
      </div>
    );
  }
  return (
    <div style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getShopifyImageUrl(src, size * 3)} alt="" loading="lazy" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}
