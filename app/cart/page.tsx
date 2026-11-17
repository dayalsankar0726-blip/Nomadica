// app/cart/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { compareAtPrice, formatINR } from "@/lib/pricing";
import Link from "next/link";
import { Trash2, Heart, ArrowLeft, Shield, RotateCcw, Truck, ShoppingBag, X } from "lucide-react";
import { api } from "@/components/api/api";
import { PageLoader } from "@/components/ui/PageLoader";
import Image from "next/image";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import type { CartPricing } from "@/lib/checkout/serverCart";
import { POLICY } from "@/lib/site";

const BODY = "'Montserrat', sans-serif";
const HEADING = "'Playfair Display', serif";
const MUTED = "rgba(30,30,30,0.7)";
const BROWN = "#6B4E37";
const ERROR = "#B91C1C";

/**
 * Most a shopper can add of one item. The cart data has no stock count
 * (quantityAvailable isn't in the cart query), so lines are capped at this unless
 * the line carries `merchandise.quantityAvailable`.
 */
const MAX_QTY_PER_LINE = 10;

type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title?: string;
    quantityAvailable?: number | null;
    selectedOptions?: Array<{ name?: string; value?: string }>;
    price?: { amount?: string };
    compareAtPrice?: { amount?: string } | null;
    image?: string;
    product?: { id?: string; handle?: string; title?: string; images?: { edges?: Array<{ node?: { url?: string } }> } };
  };
};

type Notice =
  | { kind: "removed"; title: string; merchandiseId: string; quantity: number }
  | { kind: "wishlist"; title: string }
  | { kind: "error"; text: string };

const lineMax = (line: CartLine) => {
  const stock = line.merchandise?.quantityAvailable;
  return typeof stock === "number" && stock > 0 ? Math.min(stock, MAX_QTY_PER_LINE) : MAX_QTY_PER_LINE;
};

/** "Size: M · Colour: Black" from the variant's options; nothing for one-variant products. */
function variantLabel(line: CartLine): string {
  const options = line.merchandise?.selectedOptions?.filter((o) => o?.name && o?.value && o.value !== "Default Title");
  if (options && options.length > 0) return options.map((o) => `${o.name}: ${o.value}`).join(" · ");
  const title = line.merchandise?.title || "";
  return title && title !== "Default Title" ? title : "";
}

/** Link back to the product page, when the cart data identifies the product. */
function productHref(line: CartLine): string | null {
  const product = line.merchandise?.product;
  if (product?.handle) return `/products/${product.handle}`;
  if (product?.id?.startsWith("gid://")) return `/shop/product-details?id=${encodeURIComponent(product.id)}`;
  return null;
}

type CartData = { id: string; lines: { edges: Array<{ node: CartLine }> } };

function withQuantity(cart: CartData | null, lineId: string, quantity: number): CartData | null {
  if (!cart) return cart;
  const edges = cart.lines.edges
    .map((edge) => (edge.node.id === lineId ? { node: { ...edge.node, quantity } } : edge))
    .filter((edge) => edge.node.quantity > 0);
  return { ...cart, lines: { ...cart.lines, edges } };
}

const cartIdOf = () => (typeof window !== "undefined" ? localStorage.getItem("nomadica_cart_id") : null);

/** The saved cart and its server price summary, or null when there is no cart yet. */
async function readCart(): Promise<{ cart: CartData | null; pricing: CartPricing | null } | null> {
  const cartId = cartIdOf();
  if (!cartId) return null;
  const res = await api.cart.get(cartId);
  return { cart: res.cart ?? null, pricing: res.pricing || null };
}

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyLines, setBusyLines] = useState<Record<string, boolean>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState<"" | "apply" | "remove">("");
  // Price summary worked out by the server (subtotal, discount, shipping, total).
  const [pricing, setPricing] = useState<CartPricing | null>(null);

  const fetchCart = useCallback(
    () =>
      readCart()
        .then((data) => {
          setCart(data?.cart ?? null);
          setPricing(data?.pricing ?? null);
          setLoadError(false);
        })
        .catch((err) => {
          console.error("Failed to fetch cart:", err);
          setLoadError(true);
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const setLineBusy = (lineId: string, busy: boolean) =>
    setBusyLines((prev) => {
      const next = { ...prev };
      if (busy) next[lineId] = true;
      else delete next[lineId];
      return next;
    });

  const setLineError = (lineId: string, message: string) =>
    setLineErrors((prev) => {
      const next = { ...prev };
      if (message) next[lineId] = message;
      else delete next[lineId];
      return next;
    });

  /** Sends a quantity change. Shows it straight away and puts it back if the server refuses. */
  const changeQuantity = async (line: CartLine, quantity: number): Promise<boolean> => {
    const cartId = cartIdOf();
    if (!cartId || busyLines[line.id]) return false;
    const before = cart;
    setLineError(line.id, "");
    setLineBusy(line.id, true);
    setCart(withQuantity(before, line.id, quantity));
    try {
      const res = await api.cart.update(cartId, { lines: [{ id: line.id, quantity, merchandiseId: line.merchandise.id }] });
      const userError = res?.userErrors?.[0]?.message;
      if (userError) throw new Error(userError);
      await fetchCart();
      window.dispatchEvent(new Event("cart-updated"));
      return true;
    } catch (err) {
      console.error("Failed to update cart quantity:", err);
      setCart(before);
      setLineError(
        line.id,
        quantity === 0 ? "Couldn't remove this item. Please try again." : "Couldn't update the quantity. Please try again."
      );
      return false;
    } finally {
      setLineBusy(line.id, false);
    }
  };

  const handleRemove = async (line: CartLine) => {
    const title = line.merchandise?.product?.title || "Item";
    if (await changeQuantity(line, 0)) {
      setNotice({ kind: "removed", title, merchandiseId: line.merchandise.id, quantity: line.quantity });
    }
  };

  const handleUndoRemove = async () => {
    if (notice?.kind !== "removed") return;
    const cartId = cartIdOf();
    if (!cartId) return;
    setUndoBusy(true);
    try {
      await api.cart.update(cartId, { lines: [{ merchandiseId: notice.merchandiseId, quantity: notice.quantity }] });
      await fetchCart();
      window.dispatchEvent(new Event("cart-updated"));
      setNotice(null);
    } catch (err) {
      console.error("Failed to restore cart line:", err);
      setNotice({ kind: "error", text: `Couldn't put ${notice.title} back in your bag. Please add it again from the product page.` });
    } finally {
      setUndoBusy(false);
    }
  };

  const handleMoveToWishlist = async (line: CartLine) => {
    const productId = line.merchandise?.product?.id || "";
    const title = line.merchandise?.product?.title || "Item";
    if (!productId || busyLines[line.id]) return;
    setLineError(line.id, "");
    setLineBusy(line.id, true);
    try {
      await api.wishlist.add(productId);
      window.dispatchEvent(new CustomEvent("wishlist-updated"));
    } catch (err) {
      console.error("Failed to move item to wishlist:", err);
      setLineError(line.id, "Couldn't save this to your wishlist. Please sign in and try again.");
      setLineBusy(line.id, false);
      return;
    }
    setLineBusy(line.id, false);
    if (await changeQuantity(line, 0)) {
      setNotice({ kind: "wishlist", title });
    } else {
      setLineError(line.id, "Saved to your wishlist, but couldn't remove it from your bag. Please try again.");
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const code = couponCode.trim();
    const cartId = cartIdOf();
    if (!code) {
      setCouponError("Enter a discount code.");
      return;
    }
    if (!cartId) return;
    setCouponBusy("apply");
    try {
      const res = await api.cart.applyDiscount(cartId, code);
      if (res.pricing) setPricing(res.pricing);
      if (!res.applied) setCouponError(res.error || "That code isn't valid for this bag.");
    } catch {
      setCouponError("Couldn't apply the code. Please try again.");
    } finally {
      setCouponBusy("");
    }
  };

  const handleRemoveCoupon = async () => {
    const cartId = cartIdOf();
    if (!cartId) return;
    setCouponError("");
    setCouponBusy("remove");
    try {
      const res = await api.cart.removeDiscount(cartId);
      if (!res?.pricing) throw new Error(res?.error || "No pricing returned");
      setPricing(res.pricing);
      setCouponCode("");
    } catch (err) {
      console.error("Failed to remove discount:", err);
      setCouponError("Couldn't remove the code. Please try again.");
    } finally {
      setCouponBusy("");
    }
  };

  // The struck-through price for a line: Shopify's compare-at price, or the price itself
  // when there is no real discount. A "was" price is never invented.
  const getComparePrice = (line: CartLine, price: number) =>
    compareAtPrice(price, line?.merchandise?.compareAtPrice?.amount) ?? price;

  if (loading) {
    return <PageLoader />;
  }

  const items = cart?.lines?.edges || [];
  const totalItems = items.reduce((acc, edge) => acc + edge.node.quantity, 0) || 0;

  let subtotalMRP = 0;
  let currentSubtotal = 0;
  items.forEach(({ node: line }) => {
    const price = parseFloat(line.merchandise?.price?.amount || "0");
    subtotalMRP += getComparePrice(line, price) * line.quantity;
    currentSubtotal += price * line.quantity;
  });

  const totalSavings = subtotalMRP - currentSubtotal;
  // Discount, shipping and total come from the server, so they match what checkout charges.
  const couponSavings: number = pricing?.discount ?? 0;
  const appliedCodes: string[] = pricing?.discountCodes ?? [];
  const couponApplied = appliedCodes.length > 0;
  const shippingFee: number = pricing?.shipping ?? 0;
  const freeShippingThreshold: number = pricing?.freeShippingThreshold ?? POLICY.freeShippingThreshold;
  const finalSavings = totalSavings + couponSavings;
  const totalAmount: number = pricing?.total ?? currentSubtotal;
  const merchandiseTotal = (pricing?.subtotal ?? currentSubtotal) - couponSavings;
  const amountForFreeShipping = shippingFee > 0 ? Math.max(freeShippingThreshold - merchandiseTotal, 0) : 0;
  const checkoutHref = cart?.id ? `/checkout?cartId=${encodeURIComponent(cart.id)}` : "/checkout";
  const anyBusy = Object.keys(busyLines).length > 0;

  const primaryLink: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    minHeight: "48px",
    backgroundColor: BROWN,
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "0.9rem 1.5rem",
    fontFamily: BODY,
    fontSize: "0.85rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textDecoration: "none",
  };

  const linkButton: React.CSSProperties = {
    background: "none",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontFamily: BODY,
    fontSize: "0.85rem",
    fontWeight: 500,
    color: MUTED,
    cursor: "pointer",
    padding: "0.5rem 0",
    minHeight: "44px",
  };

  const qtyButton = (disabled: boolean): React.CSSProperties => ({
    width: "44px",
    height: "100%",
    border: "none",
    backgroundColor: "#FAFAFA",
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? "rgba(30,30,30,0.35)" : "#1E1E1E",
    fontSize: "1.1rem",
  });

  return (
    <div style={{ backgroundColor: "#F5F5F0", minHeight: "100vh" }} className={items.length > 0 ? "pb-28 lg:pb-0" : undefined}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 1rem" }} className="sm:px-6">
        <h1
          style={{
            fontFamily: HEADING,
            fontSize: "clamp(2rem, 3.5vw, 2.5rem)",
            fontWeight: 600,
            color: "#1E1E1E",
            marginBottom: "2rem",
          }}
        >
          Your Bag{" "}
          {items.length > 0 && (
            <span style={{ fontSize: "1.1rem", fontFamily: BODY, fontWeight: 400, color: MUTED, marginLeft: "0.5rem" }}>
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </span>
          )}
        </h1>

        {/* Remove / wishlist / undo messages */}
        <div role="status" aria-live="polite">
          {notice && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                backgroundColor: notice.kind === "error" ? "#FEF2F2" : "#FFFFFF",
                border: `1px solid ${notice.kind === "error" ? "rgba(185,28,28,0.25)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1.5rem",
                fontFamily: BODY,
                fontSize: "0.875rem",
                color: notice.kind === "error" ? ERROR : "#1E1E1E",
              }}
            >
              <span>
                {notice.kind === "removed" && <>Removed {notice.title} from your bag.</>}
                {notice.kind === "wishlist" && (
                  <>
                    Moved {notice.title} to your{" "}
                    <Link href="/account/wishlist" style={{ color: BROWN, fontWeight: 600 }}>wishlist</Link>.
                  </>
                )}
                {notice.kind === "error" && notice.text}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {notice.kind === "removed" && (
                  <button
                    type="button"
                    onClick={handleUndoRemove}
                    disabled={undoBusy}
                    style={{ ...linkButton, color: BROWN, fontWeight: 600, textDecoration: "underline", padding: "0 0.5rem" }}
                  >
                    {undoBusy ? "Restoring…" : "Undo"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  aria-label="Dismiss message"
                  style={{ ...linkButton, padding: 0, width: "44px", justifyContent: "center" }}
                >
                  <X size={16} />
                </button>
              </span>
            </div>
          )}
        </div>

        {loadError ? (
          <div
            role="alert"
            style={{ textAlign: "center", width: "100%", maxWidth: "480px", margin: "0 auto", padding: "3rem 1rem" }}
          >
            <p style={{ fontFamily: HEADING, fontSize: "1.6rem", fontWeight: 700, color: "#1E1E1E", marginBottom: "0.5rem" }}>
              We couldn&apos;t load your bag
            </p>
            <p style={{ fontFamily: BODY, fontSize: "0.9rem", color: MUTED, marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Your items are still saved. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchCart();
              }}
              style={{ ...primaryLink, width: "auto", display: "inline-flex", border: "none", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", width: "100%", maxWidth: "480px", margin: "0 auto", padding: "3rem 1rem" }}>
            <ShoppingBag size={60} aria-hidden="true" style={{ color: "rgba(0,0,0,0.2)", margin: "0 auto 0.75rem" }} />
            <p style={{ fontFamily: HEADING, fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 700, color: "#1E1E1E", marginBottom: "0.5rem" }}>
              Your bag is empty
            </p>
            <p style={{ fontFamily: BODY, fontSize: "0.9rem", color: MUTED, marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Start your adventure by adding some travel-inspired pieces to your bag.
            </p>
            <Link href="/shop" style={{ ...primaryLink, width: "auto", display: "inline-flex", letterSpacing: "normal" }}>
              Explore the collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-10 items-start">
            {/* Left Column: Items List */}
            <div style={{ minWidth: 0 }}>
              <ul style={{ display: "grid", gap: "1.25rem", listStyle: "none", padding: 0, margin: 0 }}>
                {items.map(({ node: line }) => {
                  const price = parseFloat(line.merchandise?.price?.amount || "0");
                  const originalPrice = getComparePrice(line, price);
                  const title = line.merchandise?.product?.title || "Product";
                  const image = line.merchandise?.product?.images?.edges?.[0]?.node?.url || line.merchandise?.image || "";
                  const href = productHref(line);
                  const options = variantLabel(line);
                  const busy = !!busyLines[line.id];
                  const max = lineMax(line);
                  const stock = line.merchandise?.quantityAvailable;
                  const errorId = `line-error-${line.id}`;

                  return (
                    <li
                      key={line.id}
                      aria-busy={busy}
                      style={{
                        display: "flex",
                        gap: "1rem",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: "8px",
                        padding: "1rem",
                        opacity: busy ? 0.7 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "96px",
                          aspectRatio: "3/4",
                          borderRadius: "8px",
                          overflow: "hidden",
                          flexShrink: 0,
                          backgroundColor: "#F2F0EB",
                        }}
                      >
                        {image ? (
                          <Image src={getShopifyImageUrl(image, 240)} alt={title} fill sizes="96px" style={{ objectFit: "cover" }} />
                        ) : (
                          <ShoppingBag size={28} aria-hidden="true" style={{ color: "rgba(0,0,0,0.2)", margin: "auto", position: "absolute", inset: 0 }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                          <h2 style={{ fontFamily: HEADING, fontSize: "1.1rem", fontWeight: 700, color: "#1E1E1E", margin: 0 }}>
                            {href ? (
                              <Link href={href} style={{ color: "inherit", textDecoration: "none" }} className="hover:underline">
                                {title}
                              </Link>
                            ) : (
                              title
                            )}
                          </h2>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                            {originalPrice > price && (
                              <span style={{ fontFamily: BODY, fontSize: "0.85rem", color: MUTED, textDecoration: "line-through" }}>
                                <span className="sr-only">Was </span>
                                {formatINR(originalPrice * line.quantity)}
                              </span>
                            )}
                            <span style={{ fontFamily: BODY, fontSize: "1.2rem", fontWeight: 700, color: "#1E1E1E" }}>
                              {formatINR(price * line.quantity)}
                            </span>
                          </div>
                        </div>

                        {options && (
                          <p style={{ fontFamily: BODY, fontSize: "0.85rem", color: MUTED, margin: "0.25rem 0 0" }}>{options}</p>
                        )}
                        {line.quantity > 1 && (
                          <p style={{ fontFamily: BODY, fontSize: "0.8rem", color: MUTED, margin: "0.25rem 0 0" }}>
                            {formatINR(price)} each
                          </p>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                          <div
                            role="group"
                            aria-label={`Quantity of ${title}`}
                            style={{ display: "flex", alignItems: "center", border: "1px solid rgba(0,0,0,0.2)", borderRadius: "8px", overflow: "hidden", height: "44px" }}
                          >
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${title}`}
                              onClick={() => changeQuantity(line, line.quantity - 1)}
                              disabled={busy || line.quantity <= 1}
                              style={{ ...qtyButton(busy || line.quantity <= 1), borderRight: "1px solid rgba(0,0,0,0.1)" }}
                            >
                              −
                            </button>
                            <span
                              aria-live="polite"
                              style={{ width: "44px", textAlign: "center", fontFamily: BODY, fontSize: "0.95rem", fontWeight: 600, color: "#1E1E1E" }}
                            >
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${title}`}
                              onClick={() => changeQuantity(line, line.quantity + 1)}
                              disabled={busy || line.quantity >= max}
                              style={{ ...qtyButton(busy || line.quantity >= max), borderLeft: "1px solid rgba(0,0,0,0.1)" }}
                            >
                              +
                            </button>
                          </div>
                          {busy && <span style={{ fontFamily: BODY, fontSize: "0.8rem", color: MUTED }}>Updating…</span>}
                          {!busy && typeof stock === "number" && stock > 0 && stock <= 5 && (
                            <span style={{ fontFamily: BODY, fontSize: "0.8rem", fontWeight: 600, color: "#9A3412" }}>Only {stock} left</span>
                          )}
                          {!busy && line.quantity >= max && !(typeof stock === "number" && stock <= 5) && (
                            <span style={{ fontFamily: BODY, fontSize: "0.8rem", color: MUTED }}>Maximum {max} per order</span>
                          )}
                        </div>

                        {lineErrors[line.id] && (
                          <p id={errorId} role="alert" style={{ fontFamily: BODY, fontSize: "0.8rem", color: ERROR, margin: "0.5rem 0 0" }}>
                            {lineErrors[line.id]}
                          </p>
                        )}

                        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap" }}>
                          {line.merchandise?.product?.id && (
                            <button type="button" onClick={() => handleMoveToWishlist(line)} disabled={busy} style={linkButton} className="hover:text-[#1E1E1E]">
                              <Heart size={15} aria-hidden="true" />
                              Move to wishlist
                            </button>
                          )}
                          <button type="button" onClick={() => handleRemove(line)} disabled={busy} style={linkButton} className="hover:text-[#B91C1C]">
                            <Trash2 size={15} aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div style={{ marginTop: "2rem" }}>
                <Link
                  href="/shop"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: BODY, fontSize: "0.9rem", color: "#1E1E1E", textDecoration: "none", fontWeight: 600, minHeight: "44px" }}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Continue shopping
                </Link>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <section aria-labelledby="cart-summary-heading" className="lg:sticky lg:top-[100px]">
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(30,30,30,0.08)",
                  borderRadius: "8px",
                  padding: "2rem 1.5rem",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.015)",
                }}
              >
                <h2 id="cart-summary-heading" style={{ fontFamily: HEADING, fontSize: "1.35rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 1.25rem" }}>
                  Order Summary
                </h2>

                {/* Discount code */}
                <form onSubmit={handleApplyCoupon} style={{ marginBottom: "1.5rem" }} noValidate>
                  <label htmlFor="cart-discount-code" style={{ display: "block", fontFamily: BODY, fontSize: "0.8rem", fontWeight: 600, color: "#1E1E1E", marginBottom: "0.4rem" }}>
                    Discount code
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      id="cart-discount-code"
                      type="text"
                      autoComplete="off"
                      value={couponApplied ? appliedCodes.join(", ") : couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={couponApplied || !!couponBusy}
                      aria-invalid={!!couponError}
                      aria-describedby="cart-discount-message"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: "44px",
                        padding: "0.65rem 1rem",
                        border: `1px solid ${couponError ? ERROR : "rgba(0,0,0,0.2)"}`,
                        borderRadius: "4px",
                        fontFamily: BODY,
                        fontSize: "0.85rem",
                        textTransform: "uppercase",
                      }}
                    />
                    {couponApplied ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        disabled={!!couponBusy}
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: ERROR,
                          border: "1px solid rgba(185,28,28,0.35)",
                          borderRadius: "4px",
                          padding: "0 1rem",
                          minHeight: "44px",
                          fontFamily: BODY,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: couponBusy ? "wait" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <X size={14} aria-hidden="true" />
                        {couponBusy === "remove" ? "Removing…" : "Remove"}
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!!couponBusy}
                        style={{
                          backgroundColor: BROWN,
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "4px",
                          padding: "0 1.25rem",
                          minHeight: "44px",
                          fontFamily: BODY,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: couponBusy ? "wait" : "pointer",
                          opacity: couponBusy ? 0.7 : 1,
                        }}
                      >
                        {couponBusy === "apply" ? "Applying…" : "Apply"}
                      </button>
                    )}
                  </div>
                  <div id="cart-discount-message" aria-live="polite" style={{ fontFamily: BODY, fontSize: "0.8rem", marginTop: "0.4rem" }}>
                    {couponError && <span style={{ color: ERROR }}>{couponError}</span>}
                    {!couponError && couponApplied && couponSavings > 0 && (
                      <span style={{ color: "#15803D", fontWeight: 500 }}>
                        Code {appliedCodes.join(", ")} applied: you save {formatINR(couponSavings)}.
                      </span>
                    )}
                  </div>
                </form>

                <dl style={{ display: "grid", gap: "0.9rem", margin: "0 0 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <dt style={{ fontFamily: BODY, fontSize: "0.85rem", color: MUTED }}>{totalSavings > 0 ? "Subtotal (MRP)" : "Subtotal"}</dt>
                    <dd style={{ fontFamily: BODY, fontSize: "0.875rem", fontWeight: 500, color: "#1E1E1E", margin: 0 }}>{formatINR(subtotalMRP)}</dd>
                  </div>

                  {totalSavings > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <dt style={{ fontFamily: BODY, fontSize: "0.85rem", color: MUTED }}>Discount on MRP</dt>
                      <dd style={{ fontFamily: BODY, fontSize: "0.875rem", fontWeight: 600, color: "#15803D", margin: 0 }}>−{formatINR(totalSavings)}</dd>
                    </div>
                  )}

                  {couponSavings > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <dt style={{ fontFamily: BODY, fontSize: "0.85rem", color: MUTED }}>Code {appliedCodes.join(", ")}</dt>
                      <dd style={{ fontFamily: BODY, fontSize: "0.875rem", fontWeight: 600, color: "#15803D", margin: 0 }}>−{formatINR(couponSavings)}</dd>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <dt>
                      <span style={{ fontFamily: BODY, fontSize: "0.85rem", color: MUTED, display: "block" }}>Shipping</span>
                      <span style={{ fontFamily: BODY, fontSize: "0.75rem", color: MUTED, display: "block", marginTop: "0.15rem" }}>
                        Free on orders over {formatINR(freeShippingThreshold)}
                      </span>
                    </dt>
                    <dd style={{ fontFamily: BODY, fontSize: "0.875rem", fontWeight: 600, color: shippingFee === 0 ? "#15803D" : "#1E1E1E", margin: 0 }}>
                      {shippingFee === 0 ? "Free" : formatINR(shippingFee)}
                    </dd>
                  </div>
                </dl>

                {amountForFreeShipping > 0 && (
                  <p style={{ fontFamily: BODY, fontSize: "0.8rem", color: "#1E1E1E", backgroundColor: "#F5F1EA", borderRadius: "6px", padding: "0.6rem 0.85rem", margin: "0 0 1.25rem" }}>
                    Add <strong>{formatINR(amountForFreeShipping)}</strong> more to get free shipping.
                  </p>
                )}

                <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.08)", marginBottom: "1.25rem" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: HEADING, fontSize: "1.2rem", fontWeight: 600, color: "#1E1E1E" }}>Total</span>
                  <span style={{ fontFamily: HEADING, fontSize: "1.6rem", fontWeight: 700, color: "#1E1E1E" }}>{formatINR(totalAmount)}</span>
                </div>
                <p style={{ fontFamily: BODY, fontSize: "0.75rem", color: MUTED, textAlign: "right", margin: "0.25rem 0 1rem" }}>Inclusive of all taxes</p>

                {finalSavings > 0 && (
                  <div style={{ backgroundColor: "#F0FDF4", borderRadius: "6px", padding: "0.6rem 1rem", textAlign: "center", marginBottom: "1.25rem" }}>
                    <span style={{ fontFamily: BODY, fontSize: "0.8rem", fontWeight: 600, color: "#15803D" }}>
                      You save {formatINR(finalSavings)} on this order
                    </span>
                  </div>
                )}

                <Link
                  href={checkoutHref}
                  aria-disabled={anyBusy}
                  onClick={(e) => anyBusy && e.preventDefault()}
                  style={{ ...primaryLink, opacity: anyBusy ? 0.7 : 1 }}
                >
                  Secure checkout →
                </Link>

                <ul style={{ display: "grid", gap: "0.75rem", marginTop: "1.75rem", listStyle: "none", padding: 0 }}>
                  {[
                    { icon: Shield, label: "Secure payments by Razorpay, or cash on delivery" },
                    { icon: RotateCcw, label: `Returns within ${POLICY.returnDays} days of delivery`, href: "/support/return-policy" },
                    { icon: Truck, label: `Free shipping on orders over ${formatINR(POLICY.freeShippingThreshold)}`, href: "/support/shipping-policy" },
                  ].map((badge) => (
                    <li key={badge.label} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <badge.icon size={16} aria-hidden="true" style={{ color: "#15803D", flexShrink: 0 }} />
                      {badge.href ? (
                        <Link href={badge.href} style={{ fontFamily: BODY, fontSize: "0.8rem", fontWeight: 500, color: MUTED }}>
                          {badge.label}
                        </Link>
                      ) : (
                        <span style={{ fontFamily: BODY, fontSize: "0.8rem", fontWeight: 500, color: MUTED }}>{badge.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Mobile: total and checkout always in reach */}
      {!loadError && items.length > 0 && (
        <div
          className="lg:hidden"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
            padding: "0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom))",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <span style={{ display: "block", fontFamily: BODY, fontSize: "0.75rem", color: MUTED }}>Total (incl. taxes)</span>
            <span style={{ display: "block", fontFamily: HEADING, fontSize: "1.25rem", fontWeight: 700, color: "#1E1E1E" }}>{formatINR(totalAmount)}</span>
          </div>
          <Link
            href={checkoutHref}
            aria-disabled={anyBusy}
            onClick={(e) => anyBusy && e.preventDefault()}
            style={{ ...primaryLink, flex: 1, letterSpacing: "0.04em", opacity: anyBusy ? 0.7 : 1 }}
          >
            Checkout →
          </Link>
        </div>
      )}
    </div>
  );
}
