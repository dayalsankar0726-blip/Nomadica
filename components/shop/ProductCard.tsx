"use client";
import { useState, useMemo, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart } from "lucide-react";
import { api } from "@/components/api/api";
import Image from "next/image";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import { parseProduct } from "@/utils/productGroup";
import { compareAtPrice, discountPercent, formatINR } from "@/lib/pricing";
import { sizeOptions, variantForSize, type VariantLike } from "@/lib/products/sizes";
import { useWishlist, savePendingWishlist } from "@/components/shop/useWishlist";
import { LoginPromptModal } from "@/components/product-detail/LoginPromptModal";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

/* eslint-disable @typescript-eslint/no-explicit-any */

const isWhiteColor = (colorHex: string) => {
  if (!colorHex) return false;
  const normalized = colorHex.trim().toLowerCase();
  return normalized === "#ffffff" || normalized === "white" || normalized === "#fff";
};

interface ColorVariant {
  id: string;
  name?: string;
  colorName: string;
  colorHex: string;
  image: string;
  hoverImage?: string;
  price: number;
  originalPrice?: number;
  handle: string;
  badge?: string;
  category?: string;
  createdAt?: string;
  allVariants?: any[];
}

interface ProductCardProps {
  id?: string;
  name: string;
  displayName?: string;
  groupKey?: string;
  metaobjectId?: string;
  metaobjectName?: string;
  price: number;
  originalPrice?: number;
  image: string;
  hoverImage?: string;
  /** Only a badge set in the store is shown. */
  badge?: string;
  category?: string;
  href?: string;
  colorVariants?: ColorVariant[];
  handle?: string;
  mockupImage?: string;
  showAddToCart?: boolean;
  onAddToCart?: (variant?: any) => void;
  allVariants?: any[];
  selectedColors?: string[];
  products?: any[];
  representativeProduct?: any;
}

const variantNodes = (list?: any[]): VariantLike[] => (list ?? []).map((v) => (v && "node" in v ? v.node : v)).filter(Boolean);

export default function ProductCard({
  id = "",
  name,
  displayName,
  price,
  originalPrice,
  image,
  badge,
  href,
  colorVariants,
  handle,
  mockupImage,
  showAddToCart = false,
  onAddToCart,
  allVariants,
  selectedColors,
  representativeProduct,
}: ProductCardProps) {
  const router = useRouter();
  const wishlist = useWishlist();
  const statusId = useId();
  const [hovered, setHovered] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);

  // Strictly deduplicate colorVariants so no duplicate colors or duplicate IDs can ever exist
  const uniqueVariants = useMemo(() => {
    return (colorVariants || []).filter(
      (v, idx, arr) =>
        arr.findIndex(
          (other) =>
            other.id === v.id ||
            (other.colorHex && v.colorHex && other.colorHex.toLowerCase() === v.colorHex.toLowerCase())
        ) === idx
    );
  }, [colorVariants]);

  // Fallback: If colorVariants was empty, but product has a detectable color, provide a single variant
  const effectiveVariants = useMemo<ColorVariant[]>(() => {
    if (uniqueVariants.length > 0) return uniqueVariants;
    const parsed = parseProduct({ name: displayName || name });
    if (parsed.isClothVariation && parsed.colorHex) {
      return [{
        id: id || handle || "single-var",
        name: displayName || name,
        colorName: parsed.colorName,
        colorHex: parsed.colorHex,
        image: image || "",
        price,
        originalPrice,
        handle: handle || "",
        allVariants,
      }];
    }
    return [];
  }, [uniqueVariants, displayName, name, id, handle, image, price, originalPrice, allVariants]);

  // The colour the shopper picked on this card; otherwise the colour they filtered by.
  const [chosenId, setChosenId] = useState<string | null>(null);
  const filterMatch = useMemo(() => {
    const wanted = (selectedColors || []).map((c) => c.toLowerCase()).filter((c) => c !== "all");
    return wanted.length > 0 ? effectiveVariants.find((v) => wanted.includes((v.colorName || "").toLowerCase())) : undefined;
  }, [effectiveVariants, selectedColors]);
  const activeVariant: ColorVariant | null =
    effectiveVariants.find((v) => v.id === chosenId) ?? filterMatch ?? effectiveVariants.find((v) => v.id === id) ?? effectiveVariants[0] ?? null;
  const hasInteracted = chosenId !== null || !!filterMatch;
  const pick = (v: ColorVariant) => setChosenId(v.id);

  const baseDisplayName = displayName || name;
  const representativeId = representativeProduct?.id || id;
  const representativeHandle = representativeProduct?.handle || handle;
  const currentId = activeVariant ? activeVariant.id : representativeId;
  const currentName = activeVariant && hasInteracted && activeVariant.colorName !== "Original" && !baseDisplayName.toLowerCase().includes(activeVariant.colorName.toLowerCase())
    ? `${activeVariant.colorName} ${baseDisplayName}`
    : baseDisplayName;
  const currentPrice = activeVariant ? activeVariant.price : price;
  const wasPrice = compareAtPrice(currentPrice, activeVariant ? activeVariant.originalPrice : originalPrice);
  const percentOff = discountPercent(currentPrice, wasPrice);
  const currentImage = (mockupImage && !hasInteracted) ? mockupImage : (activeVariant ? activeVariant.image : image);
  const currentBadge = (activeVariant ? (activeVariant.badge || badge) : badge)?.trim();
  const currentHandle = activeVariant ? activeVariant.handle : representativeHandle;
  const productHref = href || (currentHandle ? `/products/${currentHandle}` : "/shop");
  const sizedImage = currentImage ? getShopifyImageUrl(currentImage, 600) : "";
  const wishlisted = !!currentId && wishlist.has(currentId);

  // The shopper's real variants for this colour: add directly only when no size choice is needed.
  const colourVariants = variantNodes(activeVariant?.allVariants ?? allVariants);
  const needsSize = sizeOptions(colourVariants).length > 0 || colourVariants.length === 0;

  const flash = (text: string, error = false) => {
    setStatus({ text, error });
    window.setTimeout(() => setStatus((s) => (s?.text === text ? null : s)), 4000);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentId) return;
    if (!wishlist.isSignedIn()) {
      setShowLoginPrompt(true);
      return;
    }
    try {
      await wishlist.toggle(currentId);
      flash(wishlisted ? "Removed from wishlist" : "Saved to wishlist");
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
      flash("We couldn't update your wishlist. Please try again.", true);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(activeVariant || { id: currentId, name: currentName, price: currentPrice, image: currentImage, allVariants });
      return;
    }
    // A size has to be chosen on the product page; never guess one.
    const variant = needsSize ? null : variantForSize(colourVariants, null);
    if (!variant?.id) {
      router.push(productHref);
      return;
    }
    setAddingToCart(true);
    try {
      const line = { merchandiseId: variant.id, quantity: 1, title: variant.title || "", price: currentPrice, productTitle: currentName, image: currentImage };
      const cartId = localStorage.getItem("nomadica_cart_id");
      let cart;
      if (!cartId) {
        const res = await api.cart.create([line]);
        cart = res?.cartCreate?.cart || res?.cart;
        if (cart?.id) localStorage.setItem("nomadica_cart_id", cart.id);
      } else {
        const res = await api.cart.update(cartId, { lines: [line] });
        cart = res?.cartLinesAdd?.cart || res?.cartLinesUpdate?.cart || res?.cart;
      }
      if (!cart) throw new Error("No cart returned");
      window.dispatchEvent(new CustomEvent("cart-updated", { detail: { openDrawer: true } }));
      flash("Added to cart");
    } catch (err) {
      console.error("Failed to add to cart:", err);
      flash("We couldn't add this to your cart. Please try again.", true);
    } finally {
      setAddingToCart(false);
    }
  };

  const returnTo = currentHandle ? `/products/${currentHandle}` : (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/shop");

  return (
    <div
      className="shop-card"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.surface,
        border: "1px solid rgba(30, 30, 30, 0.06)",
        borderRadius: RADIUS.card,
        overflow: "hidden",
        boxShadow: hovered ? "0 8px 25px rgba(0,0,0,0.06)" : "0 4px 15px rgba(0,0,0,0.02)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "750 / 978", overflow: "hidden", backgroundColor: "#F3EFE9" }}>
        {sizedImage ? (
          <Image
            src={sizedImage}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            style={{
              objectFit: "cover",
              transform: hovered ? "scale(1.05)" : "scale(1)",
              transition: "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          />
        ) : (
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.serif, color: COLORS.muted, fontSize: "1.1rem" }}>
            Nomadica
          </div>
        )}

        {/* Badges: the store's own badge, and a distinct sale badge for a real discount */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", zIndex: 2, pointerEvents: "none" }}>
          {currentBadge && (
            <span style={{ backgroundColor: currentBadge.toLowerCase() === "new" ? "var(--forest-green)" : COLORS.charcoal, color: "#FFFFFF", padding: "0.25rem 0.625rem", fontFamily: FONTS.sans, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: RADIUS.control }}>
              {currentBadge}
            </span>
          )}
          {percentOff && (
            <span style={{ backgroundColor: COLORS.sale, color: "#FFFFFF", padding: "0.25rem 0.625rem", fontFamily: FONTS.sans, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em", borderRadius: RADIUS.control }}>
              {percentOff}% OFF
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          onClick={handleWishlist}
          className="shop-focus"
          aria-pressed={wishlisted}
          aria-label={wishlisted ? `Remove ${currentName} from wishlist` : `Save ${currentName} to wishlist`}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: COLORS.surface,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            zIndex: 3,
          }}
        >
          <Heart size={18} aria-hidden="true" fill={wishlisted ? COLORS.wishlist : "none"} color={wishlisted ? COLORS.wishlist : COLORS.charcoal} />
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: "0.75rem 0.625rem 0.875rem", textAlign: "center", display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <h3 style={{ fontFamily: FONTS.serif, fontSize: "clamp(0.95rem, 2.6vw, 1.125rem)", fontWeight: 600, margin: "0 0 0.4rem 0", lineHeight: 1.3 }}>
          {/* The whole card opens the product: this link stretches over it (see .shop-card-link). */}
          <Link
            href={productHref}
            className="shop-card-link"
            style={{ color: hovered ? COLORS.brown : COLORS.charcoal, textDecoration: "none", transition: "color 0.2s ease" }}
          >
            {currentName}
          </Link>
        </h3>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.625rem" }}>
          <span style={{ fontFamily: FONTS.sans, fontWeight: 700, color: COLORS.charcoal, fontSize: "1rem" }}>
            {formatINR(currentPrice)}
          </span>
          {wasPrice !== undefined && (
            <span style={{ fontFamily: FONTS.sans, textDecoration: "line-through", color: COLORS.muted, fontSize: "0.875rem" }}>
              <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Was </span>
              {formatINR(wasPrice)}
            </span>
          )}
        </div>

        {/* Colour swatches: 32px tap targets */}
        {effectiveVariants.length > 0 && (
          <div role="group" aria-label="Colours" style={{ display: "flex", justifyContent: "center", gap: "2px", flexWrap: "wrap", marginBottom: "0.25rem", position: "relative", zIndex: 2 }}>
            {effectiveVariants.map((v) => {
              const isSelected = activeVariant ? activeVariant.id === v.id : effectiveVariants.length === 1;
              return (
                <button
                  key={v.id}
                  type="button"
                  className="shop-focus"
                  onMouseEnter={() => pick(v)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    pick(v);
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${v.colorName}`}
                  title={v.colorName}
                  style={{ width: 32, height: 32, padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      backgroundColor: v.colorHex,
                      border: isWhiteColor(v.colorHex) ? "1px solid rgba(30, 30, 30, 0.3)" : "1px solid rgba(0,0,0,0.08)",
                      boxShadow: isSelected ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${COLORS.charcoal}` : "none",
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}

        {showAddToCart && (
          <div style={{ marginTop: "auto", paddingTop: "0.5rem", position: "relative", zIndex: 2 }}>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="shop-focus"
              style={{
                width: "100%",
                minHeight: 40,
                backgroundColor: COLORS.brown,
                color: "#FFFFFF",
                border: "none",
                padding: "0.6rem 1rem",
                fontFamily: FONTS.sans,
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderRadius: RADIUS.control,
                cursor: addingToCart ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <ShoppingCart size={14} aria-hidden="true" />
              {addingToCart ? "Adding…" : !onAddToCart && needsSize ? "Choose size" : "Add to cart"}
            </button>
          </div>
        )}

        <p id={statusId} role="status" aria-live="polite" style={{ margin: status ? "0.4rem 0 0" : 0, minHeight: 0, fontFamily: FONTS.sans, fontSize: "0.75rem", color: status?.error ? COLORS.error : COLORS.muted, position: "relative", zIndex: 2 }}>
          {status?.text}
        </p>
      </div>

      {showLoginPrompt && (
        <LoginPromptModal
          productName={currentName}
          returnTo={returnTo}
          onClose={() => setShowLoginPrompt(false)}
          onBeforeLeave={() => savePendingWishlist(currentId)}
        />
      )}
      <style>{`
        .shop-card-link::after { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: ${RADIUS.card}; }
        .shop-card-link:focus-visible { outline: none; }
        .shop-card:has(.shop-card-link:focus-visible) { outline: 2px solid ${COLORS.focus}; outline-offset: 2px; }
        .shop-focus:focus-visible { outline: 2px solid ${COLORS.focus}; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
