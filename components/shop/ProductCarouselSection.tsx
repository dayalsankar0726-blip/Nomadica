"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import { formatINR } from "@/lib/pricing";
import { api } from "@/components/api/api";
import { useAuth, getStoredAuth } from "@/utils/hooks/useAuth";
import { useRouter } from "next/navigation";

/** Same image shape as the shop grid's ProductCard, so cards look alike everywhere. */
const CARD_IMAGE_RATIO = "750 / 978";

export function ProductCarouselSection({
  icon,
  title,
  products,
  loading,
  error,
  onRetry,
  viewAllLink,
  viewAllText,
  backgroundColor,
  backgroundImage
}: {
  icon?: LucideIcon;
  title: string;
  products: any[];
  loading?: boolean;
  /** True when the products for this section failed to load. */
  error?: boolean;
  /** Shown as a "Retry" button when `error` is true. */
  onRetry?: () => void;
  viewAllLink?: string;
  viewAllText?: string;
  backgroundColor?: string;
  backgroundImage?: string;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [activeVariants, setActiveVariants] = useState<Record<string, any>>({});
  const [interactedCards, setInteractedCards] = useState<Record<string, boolean>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const Icon = icon;

  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [wishlistSet, setWishlistSet] = useState<Set<string>>(new Set());
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [promptWishlistProduct, setPromptWishlistProduct] = useState<{ id: string; name: string; handle?: string } | null>(null);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await api.wishlist.list();
        const ids = new Set<string>();
        res?.wishlist?.forEach((item: any) => ids.add(item.id));
        setWishlistSet(ids);
      } catch (err) {
        console.error("Failed to fetch wishlist in carousel:", err);
      }
    };
    fetchWishlist();

    const handleWishlistUpdate = () => fetchWishlist();
    window.addEventListener("wishlist-updated", handleWishlistUpdate);
    return () => window.removeEventListener("wishlist-updated", handleWishlistUpdate);
  }, []);

  useEffect(() => {
    if (!wishlistError) return;
    const t = setTimeout(() => setWishlistError(null), 5000);
    return () => clearTimeout(t);
  }, [wishlistError]);

  const handleWishlistLoginRedirect = () => {
    if (!promptWishlistProduct) return;
    const targetUrl = promptWishlistProduct.handle
      ? `/products/${promptWishlistProduct.handle}`
      : typeof window !== "undefined"
        ? (window.location.pathname + window.location.search)
        : `/products/${promptWishlistProduct.id}`;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("nomadica_product_redirect", targetUrl);
      sessionStorage.setItem("pending_wishlist_product_id", promptWishlistProduct.id);
      localStorage.setItem("pending_wishlist_product_id", promptWishlistProduct.id);
    }
    router.push(`/account/login?redirect=${encodeURIComponent(targetUrl)}`);
  };

  /** `id` is the product of the colour currently shown on the card. */
  const toggleWishlist = async (id: string, name: string, handle?: string) => {
    const isAuthed = isAuthenticated || (typeof window !== "undefined" && getStoredAuth().isAuthenticated);
    if (!isAuthed) {
      setPromptWishlistProduct({ id, name, handle });
      return;
    }
    const previous = wishlistSet;
    const wasSaved = previous.has(id);
    const next = new Set(previous);
    if (wasSaved) next.delete(id);
    else next.add(id);
    setWishlistSet(next);
    setWishlistError(null);
    try {
      if (wasSaved) await api.wishlist.remove(id);
      else await api.wishlist.add(id);
      window.dispatchEvent(new CustomEvent("wishlist-updated"));
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
      setWishlistSet(previous);
      setWishlistError(
        wasSaved
          ? `Couldn't remove ${name} from your wishlist. Please try again.`
          : `Couldn't save ${name} to your wishlist. Please try again.`
      );
    }
  };

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 5);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 5);
  }, []);

  const scrollByPage = (direction: 1 | -1) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: direction * container.clientWidth, behavior: "smooth" });
    setTimeout(updateScrollButtons, 350);
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateScrollButtons);
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      container.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [products, updateScrollButtons]);

  const showSkeleton = !!loading && products.length === 0;
  const showError = !loading && products.length === 0 && !!error;

  // Nothing to show and nothing went wrong: hide the whole section rather than
  // showing a heading over an empty row.
  if (!showSkeleton && !showError && products.length === 0) return null;

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(50% - 36px)",
    transform: "translateY(-50%)",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#FFFFFF",
    border: "none",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };

  return (
    <section
      aria-label={title}
      style={{
        backgroundColor: backgroundImage ? undefined : backgroundColor || "#FAF9F7",
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: backgroundImage ? "cover" : undefined,
        backgroundPosition: backgroundImage ? "center" : undefined,
        backgroundRepeat: backgroundImage ? "no-repeat" : undefined,
        padding: "2rem 1.5rem",
        borderBottom: "1px solid rgba(30,30,30,0.05)",
        position: "relative"
      }}
    >
      <style>{`
        .pcs-arrow { display: flex; transition: transform 0.2s ease; }
        .pcs-arrow:hover { transform: translateY(-50%) scale(1.1) !important; }
        .pcs-arrow:focus-visible, .pcs-wish:focus-visible, .pcs-viewall:focus-visible, .pcs-swatch:focus-visible {
          outline: 2px solid #6B4E37; outline-offset: 2px;
        }
        /* Touch screens scroll the row by swiping; arrows only get in the way. */
        @media (hover: none), (pointer: coarse) { .pcs-arrow { display: none !important; } }
        .pcs-viewall { background-color: #6B4E37; transition: background-color 0.2s ease; }
        .pcs-viewall:hover { background-color: #553D2B; }
        .pcs-wish { transition: transform 0.2s ease; }
        .pcs-wish:hover { transform: scale(1.1); }
        @media (prefers-reduced-motion: reduce) {
          .pcs-arrow, .pcs-wish, .pcs-card, .pcs-card img { transition: none !important; }
        }
      `}</style>
      <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative" }}>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem 1rem",
            marginBottom: "2rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            {Icon && (
              <Icon aria-hidden="true" style={{ marginTop: "8px", flexShrink: 0 }} size={26} strokeWidth={2} color="#C4B5A0" />
            )}
            <h2
              style={{
                fontFamily: "'Playfair Display', sans-serif",
                fontSize: "clamp(1.625rem, 5vw, 2.25rem)",
                fontWeight: 700,
                color: "#111111",
                letterSpacing: "-0.5px",
                lineHeight: 1.2,
                margin: 0,
                overflowWrap: "anywhere"
              }}
            >
              {title}
            </h2>
          </div>
          {viewAllLink && viewAllText && !showError && (
            <Link
              href={viewAllLink}
              className="pcs-viewall"
              aria-label={`${viewAllText.toLowerCase() === "view all" ? "View all" : viewAllText} ${title}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "44px",
                color: "#FFFFFF",
                textDecoration: "none",
                borderRadius: "4px",
                padding: "0.625rem 1.75rem",
                fontFamily: "'Montserrat', sans-serif",
                fontSize: "0.8125rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}
            >
              {viewAllText}
            </Link>
          )}
        </div>

        {wishlistError && (
          <p
            role="alert"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "0.8125rem",
              color: "#B3261E",
              backgroundColor: "#FDECEA",
              borderRadius: "4px",
              padding: "0.5rem 0.75rem",
              margin: "0 0 1rem"
            }}
          >
            {wishlistError}
          </p>
        )}

        {showError ? (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "0.875rem",
              color: "rgba(30,30,30,0.8)",
              padding: "1rem 0 1.5rem"
            }}
          >
            <span>Couldn&apos;t load these products.</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="pcs-viewall"
                style={{
                  minHeight: "44px",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.5rem 1.25rem",
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: "pointer"
                }}
              >
                Retry
              </button>
            )}
          </div>
        ) : (
        <div style={{ position: "relative" }}>

          {canScrollLeft && !showSkeleton && (
            <button
              type="button"
              className="pcs-arrow"
              onClick={() => scrollByPage(-1)}
              style={{ ...arrowStyle, left: "-1.25rem" }}
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft size={24} color="#1E1E1E" aria-hidden="true" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            aria-busy={showSkeleton || undefined}
            style={{
              display: "flex",
              gap: "1.5rem",
              overflowX: "auto",
              scrollBehavior: "smooth",
              paddingBottom: "1.5rem"
            }}
            className="horizontal-scroll hide-scrollbar"
          >
            {showSkeleton
              ? [1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    aria-hidden="true"
                    style={{
                      flex: "0 0 calc(25% - 1.125rem)",
                      minWidth: "280px",
                      backgroundColor: "#FFFFFF",
                      borderRadius: "15px",
                      border: "1px solid #EAEAEA",
                      overflow: "hidden"
                    }}
                  >
                    <div className="skeleton" style={{ aspectRatio: CARD_IMAGE_RATIO }} />
                    <div style={{ padding: "0.7rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <div className="skeleton" style={{ height: "18px", width: "70%", borderRadius: "4px" }} />
                      <div className="skeleton" style={{ height: "16px", width: "35%", borderRadius: "4px" }} />
                    </div>
                  </div>
                ))
              : products.map((product) => {
                  const isHovered = hoveredCardId === product.id;
                  const activeVar = activeVariants[product.id] || product.colorVariants?.[0] || null;
                  const hasInteracted = interactedCards[product.id] || false;

                  const price = (activeVar && activeVar.price)
                    ? (typeof activeVar.price === "number" ? activeVar.price : parseFloat(activeVar.price || "0"))
                    : (typeof product.price === "number" ? product.price : parseFloat(product.price || "0"));

                  const originalPrice = (activeVar && activeVar.originalPrice)
                    ? activeVar.originalPrice
                    : product.originalPrice;

                  const pTitle = activeVar ? (activeVar.name || product.name || product.title || "Product") : (product.name || product.title || "Product");
                  const pImage = (product.mockupImage && !hasInteracted)
                    ? product.mockupImage
                    : (activeVar ? activeVar.image : (product.image || product.images?.[0]?.node?.url));
                  const pHandle = activeVar ? (activeVar.handle || product.handle) : product.handle;
                  // Wishlist the colour the shopper is looking at, not the group's first colour.
                  const wishlistId: string = activeVar?.id || product.id;
                  const isSaved = wishlistSet.has(wishlistId);

                  return (
                    <div
                      key={product.id}
                      className="pcs-card"
                      style={{
                        flex: "0 0 calc(25% - 1.125rem)",
                        minWidth: "280px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid rgba(30, 30, 30, 0.05)",
                        borderRadius: "15px",
                        overflow: "hidden",
                        boxShadow: isHovered ? "0 8px 25px rgba(0,0,0,0.06)" : "0 4px 15px rgba(0,0,0,0.02)",
                        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                        transition: "transform 0.3s ease, box-shadow 0.3s ease"
                      }}
                      onMouseEnter={() => setHoveredCardId(product.id)}
                      onMouseLeave={() => setHoveredCardId(null)}
                    >
                      {/* Image + wishlist (siblings, so there's no button inside the link) */}
                      <div style={{ position: "relative" }}>
                        <Link
                          href={`/products/${pHandle}`}
                          tabIndex={-1}
                          aria-hidden="true"
                          style={{ textDecoration: "none", display: "block" }}
                        >
                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                              aspectRatio: CARD_IMAGE_RATIO,
                              overflow: "hidden",
                              backgroundColor: "#F9F9F9"
                            }}
                          >
                            {pImage && (
                              <Image
                                src={getShopifyImageUrl(pImage, 600)}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                style={{
                                  objectFit: "cover",
                                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                                  transition: "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)"
                                }}
                              />
                            )}
                          </div>
                        </Link>

                        <button
                          type="button"
                          className="pcs-wish"
                          onClick={() => toggleWishlist(wishlistId, pTitle, pHandle)}
                          style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            backgroundColor: "#FFFFFF",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            zIndex: 5
                          }}
                          aria-pressed={isSaved}
                          aria-label={isSaved ? `Remove ${pTitle} from wishlist` : `Add ${pTitle} to wishlist`}
                        >
                          <Heart aria-hidden="true" size={18} color={isSaved ? "#E53935" : "#1E1E1E"} fill={isSaved ? "#E53935" : "none"} />
                        </button>
                      </div>

                      {/* Info Container */}
                      <div style={{ padding: "0.7rem", textAlign: "center" }}>
                        <h3
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "1.125rem",
                            fontWeight: 600,
                            margin: "0 0 0.5rem 0"
                          }}
                        >
                          <Link
                            href={`/products/${pHandle}`}
                            style={{
                              textDecoration: "none",
                              color: isHovered ? "var(--primary-gold)" : "var(--charcoal)",
                              transition: "color 0.2s ease"
                            }}
                          >
                            {pTitle}
                          </Link>
                        </h3>

                        {/* Price */}
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                          <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "var(--charcoal)", fontSize: "1rem" }}>
                            {formatINR(price)}
                          </span>
                          {originalPrice !== undefined && originalPrice > price && (
                            <span style={{ fontFamily: "'Montserrat', sans-serif", color: "rgba(30,30,30,0.7)", fontSize: "0.875rem" }}>
                              <span className="sr-only">Was </span>
                              <s>{formatINR(originalPrice)}</s>
                            </span>
                          )}
                        </div>

                        {/* Swatches */}
                        {(() => {
                          const uniqueVars = (product.colorVariants || []).filter(
                            (v: any, idx: number, arr: any[]) =>
                              arr.findIndex(
                                (other: any) =>
                                  other.id === v.id ||
                                  (other.colorHex && v.colorHex && other.colorHex.toLowerCase() === v.colorHex.toLowerCase())
                              ) === idx
                          );
                          if (uniqueVars.length === 0) return null;
                          return (
                            <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap", minHeight: "22px" }}>
                              {uniqueVars.map((v: any) => {
                                const isSelected = activeVar ? activeVar.id === v.id : uniqueVars.length === 1;
                                const isWhite = v.colorHex?.toLowerCase() === "#ffffff" || v.colorHex?.toLowerCase() === "white";
                                return (
                                  <div
                                    key={v.id}
                                    className="dest-swatch-wrap"
                                    style={{
                                      width: "22px",
                                      height: "22px",
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: isSelected ? "2px solid rgba(0, 0, 0, 1)" : "2px solid #CCCCCC",
                                      background: "transparent",
                                      transition: "all 0.15s ease",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="pcs-swatch"
                                      onMouseEnter={() => {
                                        setActiveVariants(prev => ({ ...prev, [product.id]: v }));
                                        setInteractedCards(prev => ({ ...prev, [product.id]: true }));
                                      }}
                                      onClick={() => {
                                        setActiveVariants(prev => ({ ...prev, [product.id]: v }));
                                        setInteractedCards(prev => ({ ...prev, [product.id]: true }));
                                      }}
                                      style={{
                                        width: "16px",
                                        height: "16px",
                                        borderRadius: "50%",
                                        backgroundColor: v.colorHex,
                                        border: isWhite ? "1px solid rgba(30,30,30,0.25)" : "none",
                                        padding: 0,
                                        cursor: "pointer",
                                        boxShadow: isSelected ? "0 0 0 1.5px #FFFFFF inset" : "none",
                                        transform: isSelected ? "scale(1.25)" : "scale(1)",
                                        transition: "all 0.15s ease",
                                      }}
                                      aria-pressed={isSelected}
                                      aria-label={`Show ${v.colorName || "this colour"}`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  );
                })}
          </div>

          {canScrollRight && !showSkeleton && (
            <button
              type="button"
              className="pcs-arrow"
              onClick={() => scrollByPage(1)}
              style={{ ...arrowStyle, right: "-1.25rem" }}
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight size={24} color="#1E1E1E" aria-hidden="true" />
            </button>
          )}

        </div>
        )}

      </div>

      {/* Wishlist Login Prompt Modal */}
      {promptWishlistProduct !== null && (
        <div
          onClick={() => setPromptWishlistProduct(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            cursor: "default"
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pcs-wishlist-signin-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              maxWidth: "440px",
              width: "100%",
              padding: "2.5rem 2rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(0,0,0,0.06)",
              position: "relative",
              textAlign: "center"
            }}
          >
            <button
              type="button"
              onClick={() => setPromptWishlistProduct(null)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "0.75rem",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(30,30,30,0.7)"
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div
              aria-hidden="true"
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#FDF2F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
                color: "#DC2626"
              }}
            >
              <Heart size={26} fill="#DC2626" color="#DC2626" />
            </div>

            <h3
              id="pcs-wishlist-signin-title"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.4rem",
                fontWeight: 600,
                color: "#1E1E1E",
                margin: "0 0 0.5rem"
              }}
            >
              Sign In to Save to Wishlist
            </h3>

            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: "0.85rem",
                color: "rgba(30,30,30,0.75)",
                lineHeight: "1.6",
                margin: "0 0 1.5rem"
              }}
            >
              Please log in to your account to save <strong>{promptWishlistProduct.name}</strong> to your wishlist. Once you sign in, it will be added to your wishlist automatically.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={handleWishlistLoginRedirect}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  backgroundColor: "#6B4E37",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  padding: "0.85rem",
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase"
                }}
              >
                Sign In to Continue
              </button>

              <button
                type="button"
                onClick={() => setPromptWishlistProduct(null)}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0.75rem",
                  background: "none",
                  border: "none",
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.8125rem",
                  color: "rgba(30,30,30,0.75)",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
