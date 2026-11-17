import Link from "next/link";
import { formatINR } from "@/lib/pricing";
import type { ProductDetails } from "./productDetailUtils";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

interface ProductInfoHeaderProps {
  product: ProductDetails;
  /** Price of the selected size (or the first variant until a size is chosen). */
  price: number;
  /** Shopify compare-at price, only when it is higher than the price. */
  markupPrice?: number;
  markupDiscount?: number;
}

export function ProductInfoHeader({ product, price, markupPrice, markupDiscount }: ProductInfoHeaderProps) {
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    ...(product.collection ? [{ label: product.collection.title, href: `/collections/${encodeURIComponent(product.collection.handle)}` }] : []),
    { label: product.name },
  ];

  return (
    <>
      <nav aria-label="Breadcrumb" style={{ marginBottom: "1.25rem" }}>
        <ol style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", listStyle: "none", padding: 0, margin: 0 }}>
          {crumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: FONTS.sans, fontSize: "0.8125rem" }}>
              {crumb.href ? (
                <Link href={crumb.href} className="pd-focus" style={{ color: COLORS.muted, textDecoration: "none" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" style={{ color: COLORS.charcoal, fontWeight: 500 }}>
                  {crumb.label}
                </span>
              )}
              {i < crumbs.length - 1 && (
                <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: "0.75rem" }}>
                  /
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <h1 style={{ fontFamily: FONTS.serif, fontSize: "clamp(1.75rem, 3.2vw, 2.75rem)", fontWeight: 600, color: COLORS.charcoal, letterSpacing: "-0.01em", marginBottom: "0.75rem", lineHeight: 1.15 }}>
        {product.name}
      </h1>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONTS.sans, fontSize: "1.75rem", fontWeight: 700, color: COLORS.charcoal }}>
          {formatINR(price)}
        </span>
        {markupPrice && (
          <>
            <span style={{ fontFamily: FONTS.sans, fontSize: "1.125rem", color: COLORS.muted, textDecoration: "line-through" }}>
              <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Was </span>
              {formatINR(markupPrice)}
            </span>
            <span style={{ backgroundColor: COLORS.sale, color: "#FFFFFF", padding: "0.25rem 0.625rem", fontFamily: FONTS.sans, fontSize: "0.75rem", fontWeight: 700, borderRadius: RADIUS.control }}>
              {markupDiscount ? `${markupDiscount}% OFF` : "SALE"}
            </span>
          </>
        )}
      </div>
      <p style={{ fontFamily: FONTS.sans, fontSize: "0.75rem", color: COLORS.muted, margin: "0 0 2rem 0" }}>
        Taxes included
      </p>
    </>
  );
}
