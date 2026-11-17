"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { compareAtPrice, discountPercent, formatINR } from "@/lib/pricing";
import { sizeOptions, variantForSize } from "@/lib/products/sizes";
import { sizeChartFor } from "@/lib/products/sizeChart";
import { mapProductNode } from "@/lib/products/listing";
import { POLICY } from "@/lib/site";
import { api } from "@/components/api/api";
import { ProductCarouselSection } from "@/components/shop/ProductCarouselSection";
import { groupProducts } from "@/utils/productGroup";
import { useWishlist, savePendingWishlist } from "@/components/shop/useWishlist";
import {
  type ProductDetails,
  mapRawProduct,
  getInitialMockup,
  computeVariations,
  groupNameFor,
} from "@/components/product-detail/productDetailUtils";
import { ProductGallery } from "@/components/product-detail/ProductGallery";
import { ProductInfoHeader } from "@/components/product-detail/ProductInfoHeader";
import { SizeColorSelector } from "@/components/product-detail/SizeColorSelector";
import { PurchaseActions, MAX_QUANTITY } from "@/components/product-detail/PurchaseActions";
import { ProductAccordions } from "@/components/product-detail/ProductAccordions";
import { ProductLightbox } from "@/components/product-detail/ProductLightbox";
import { LoginPromptModal } from "@/components/product-detail/LoginPromptModal";
import { DeliveryCheck } from "@/components/product-detail/DeliveryCheck";
import { ShareProduct } from "@/components/product-detail/ShareProduct";
import { TrustBadges } from "@/components/product-detail/TrustIcons";
import styles from "@/components/product-detail/ProductDetail.module.css";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ProductDetailClientProps {
  /** The product, fetched on the server. */
  initialProduct: any;
  /** Catalogue products from the server, used for the colour swatches (no refetch). */
  initialAllEdges?: any[];
  initialMockupLookup?: Record<string, any>;
  /** Shopify's related products for "You may also like". */
  initialRelated?: any[];
}

/** Product photos with the store's lifestyle mockup (if any) first. */
function photosOf(raw: any, mapped: ProductDetails, lookup: Record<string, any>): { images: string[]; hasMockup: boolean } {
  const mock = getInitialMockup(raw, lookup);
  const own = mapped.images.filter((img) => img && img !== mock);
  if (mock && own.length > 0) return { images: [mock, ...own], hasMockup: true };
  if (mock) return { images: [mock], hasMockup: false };
  return { images: own, hasMockup: false };
}

const sameId = (a?: string, b?: string) =>
  !!a && !!b && (a === b || (String(a).replace(/\D/g, "") !== "" && String(a).replace(/\D/g, "") === String(b).replace(/\D/g, "")));

export default function ProductDetailClient({ initialProduct, initialAllEdges = [], initialMockupLookup = {}, initialRelated = [] }: ProductDetailClientProps) {
  const router = useRouter();
  const wishlist = useWishlist();
  const lookup = initialMockupLookup;

  const groupName = useMemo(() => groupNameFor(initialProduct, initialAllEdges, lookup), [initialProduct, initialAllEdges, lookup]);
  const initial = useMemo(() => {
    const mapped = mapRawProduct(initialProduct);
    const photos = photosOf(initialProduct, mapped, lookup);
    return { product: { ...mapped, name: groupName || mapped.name, images: photos.images }, hasMockup: photos.hasMockup };
  }, [initialProduct, lookup, groupName]);

  const [product, setProduct] = useState<ProductDetails>(initial.product);
  const [variants, setVariants] = useState<any[]>(() => initialProduct?.variants?.edges?.map((e: any) => e.node) || []);
  const [selectedImage, setSelectedImage] = useState(initial.hasMockup ? 1 : 0);
  const [knownNodes, setKnownNodes] = useState<any[]>(() => initialAllEdges.map((e: any) => e.node || e));
  const colorVariations = useMemo(() => computeVariations(initialProduct, initialAllEdges, lookup), [initialProduct, initialAllEdges, lookup]);

  // No size is preselected: the shopper must choose one (sizes come from the real variants).
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState("");
  const [addError, setAddError] = useState("");
  const [addedMessage, setAddedMessage] = useState("");
  const [wishlistError, setWishlistError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartAdding, setCartAdding] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [hoveredColorImage, setHoveredColorImage] = useState<string | null>(null);
  const [hoveredSwatchId, setHoveredSwatchId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const sizes = useMemo(() => sizeOptions(variants), [variants]);
  const soldOut = variants.length > 0 && !variants.some((v: any) => v?.id && (v.available ?? v.availableForSale) !== false);
  // Switching colour loads that colour's variants: a chosen size it doesn't have in stock no longer counts.
  const chosenSize = selectedSize && sizes.some((o) => o.available && o.label.toLowerCase() === selectedSize.toLowerCase()) ? selectedSize : null;
  const chooseSize = (size: string) => {
    setSelectedSize(size);
    setSizeError("");
    setAddError("");
  };

  const uniqueColorVariations = useMemo(
    () =>
      colorVariations.filter(
        (v: any, idx: number, arr: any[]) =>
          arr.findIndex((o: any) => o.id === v.id || (o.colorHex && v.colorHex && o.colorHex.toLowerCase() === v.colorHex.toLowerCase())) === idx,
      ),
    [colorVariations],
  );

  const isVariantActive = useCallback(
    (v: any) => !!v && (sameId(v.id, product.id) || (!!v.handle && !!product.handle && v.handle.toLowerCase() === product.handle.toLowerCase())),
    [product.id, product.handle],
  );
  const activeVariant = uniqueColorVariations.find(isVariantActive) || uniqueColorVariations[0];

  // Price of the chosen size; the first variant's until a size is chosen.
  const selectedVariant = chosenSize ? (variantForSize(variants, chosenSize) as any) : null;
  const price = parseFloat(selectedVariant?.price?.amount ?? "") || product.price;
  const wasPrice = compareAtPrice(price, selectedVariant ? selectedVariant.compareAtPrice?.amount : product.originalPrice);
  const percentOff = discountPercent(price, wasPrice);
  const sizeChart = sizeChartFor(product);

  /** Shows another colour (another Shopify product in the same group) without a page load. */
  const showColour = useCallback(
    (raw: any) => {
      const mapped = mapRawProduct(raw);
      const photos = photosOf(raw, mapped, lookup);
      setProduct((prev) => ({ ...mapped, name: prev.name, images: photos.images }));
      setVariants(raw.variants?.edges?.map((e: any) => e.node) || []);
      setSelectedImage(photos.hasMockup ? 1 : 0);
      setAddError("");
      setAddedMessage("");
    },
    [lookup],
  );

  const handleColorSelect = (v: any) => {
    setHoveredColorImage(null);
    setHoveredSwatchId(null);
    if (isVariantActive(v)) return;
    if (v.handle) window.history.replaceState(null, "", `/products/${v.handle}`);
    const node = knownNodes.find((p: any) => sameId(p.id, v.id) || (v.handle && p.handle?.toLowerCase() === v.handle.toLowerCase()));
    if (node) {
      showColour(node);
      return;
    }
    if (!v.handle) return;
    api.products
      .getByHandle(v.handle)
      .then((res: any) => {
        const raw = res?.productByHandle || res?.product;
        if (!raw) return;
        setKnownNodes((prev) => [...prev, raw]);
        showColour(raw);
      })
      .catch((err: unknown) => console.error("Failed to load colour:", err));
  };

  // Back/Forward between colours.
  useEffect(() => {
    const onPop = () => {
      const handle = window.location.pathname.match(/\/products\/([^/?#]+)/)?.[1];
      const v = handle ? uniqueColorVariations.find((c: any) => c.handle === handle) : undefined;
      if (v) handleColorSelect(v);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  // Sticky Add to Cart on phones once the main button has scrolled out of view.
  useEffect(() => {
    const el = addButtonRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleWishlistToggle = async () => {
    setWishlistError("");
    if (!wishlist.isSignedIn()) {
      setShowLoginPrompt(true);
      return;
    }
    try {
      await wishlist.toggle(product.id);
    } catch (err) {
      console.error("Failed to toggle wishlist:", err);
      setWishlistError("We couldn't update your wishlist. Please try again.");
    }
  };

  /** Adds the chosen size to the cart (no account needed). Returns true when it was added. */
  const handleAddToBag = async (): Promise<boolean> => {
    if (cartAdding) return false;
    setAddError("");
    setAddedMessage("");
    if (sizes.length > 0 && !chosenSize) {
      setSizeError("Please select a size");
      document.getElementById("product-sizes")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    // Exact size match on the real variant; never a "contains" match or a made-up ID.
    const variant = variantForSize(variants, chosenSize);
    if (!variant?.id) {
      setAddError(sizes.length > 0 ? "This size is sold out. Please choose another size." : "This product is sold out.");
      return false;
    }
    const qty = Math.min(Math.max(quantity, 1), MAX_QUANTITY);
    setCartAdding(true);
    const line = {
      merchandiseId: variant.id,
      quantity: qty,
      title: chosenSize || variant.title || "",
      price,
      productTitle: product.name,
      image: activeVariant?.image || product.images[initial.hasMockup ? 1 : 0] || product.images[0] || "",
    };
    try {
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
      setAddedMessage(`Added to your cart${qty > 1 ? ` (${qty})` : ""}.`);
      return true;
    } catch (err) {
      console.error("Failed to add to cart:", err);
      setAddError("We couldn't add this to your cart. Please try again.");
      return false;
    } finally {
      setCartAdding(false);
    }
  };

  const handleBuyNow = async () => {
    // Only go to checkout when the item was really added.
    if (!(await handleAddToBag())) return;
    const cartId = localStorage.getItem("nomadica_cart_id");
    router.push(cartId ? `/checkout?cartId=${encodeURIComponent(cartId)}` : "/checkout");
  };

  const related = useMemo(() => {
    const grouped = groupProducts(initialRelated.map((n: any) => mapProductNode(n)), lookup);
    return grouped
      .filter((g) => !g.colorVariants.some((v) => sameId(v.id, initialProduct.id)) && g.name.toLowerCase() !== (groupName || "").toLowerCase())
      .slice(0, 8);
  }, [initialRelated, lookup, initialProduct.id, groupName]);

  const productPath = `/products/${product.handle ?? ""}`;
  const galleryImages = product.images;

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        <div className={styles.gallery}>
          <ProductGallery
            product={product}
            images={galleryImages}
            selectedIndex={Math.min(selectedImage, Math.max(galleryImages.length - 1, 0))}
            onSelect={(i) => {
              setSelectedImage(i);
              setHoveredColorImage(null);
            }}
            previewImage={hoveredColorImage}
            wishlisted={wishlist.has(product.id)}
            onOpenLightbox={() => setLightboxIndex(Math.min(selectedImage, galleryImages.length - 1))}
            handleWishlistToggle={() => void handleWishlistToggle()}
          />
          {wishlistError && (
            <p role="alert" style={{ fontFamily: FONTS.sans, fontSize: "0.8125rem", color: COLORS.error, margin: "0.5rem 0 0" }}>
              {wishlistError}
            </p>
          )}
        </div>

        <div className={styles.details}>
          <ProductInfoHeader product={product} price={price} markupPrice={wasPrice} markupDiscount={percentOff} />

          <SizeColorSelector
            product={product}
            sizes={sizes}
            selectedSize={chosenSize}
            setSelectedSize={chooseSize}
            sizeError={sizeError}
            sizeChart={sizeChart}
            uniqueColorVariations={uniqueColorVariations}
            activeVariant={activeVariant}
            hoveredSwatchId={hoveredSwatchId}
            isVariantActive={isVariantActive}
            handleColorSelect={(v) => handleColorSelect(v)}
            setHoveredColorImage={setHoveredColorImage}
            setHoveredSwatchId={setHoveredSwatchId}
          />

          <PurchaseActions
            ref={addButtonRef}
            quantity={quantity}
            setQuantity={setQuantity}
            cartAdding={cartAdding}
            soldOut={soldOut}
            addError={addError}
            addedMessage={addedMessage}
            handleAddToBag={() => void handleAddToBag()}
            handleBuyNow={() => void handleBuyNow()}
          />

          <DeliveryCheck />

          <ShareProduct title={product.name} path={productPath} />

          <TrustBadges freeShippingFrom={formatINR(POLICY.freeShippingThreshold)} />

          <ProductAccordions product={product} isTee={!!sizeChart} />
        </div>
      </div>

      {/* Sticky Add to Cart (phones only, see .stickyBar) */}
      {showStickyBar && !soldOut && (
        <div className={styles.stickyBar} role="region" aria-label="Add to cart">
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: FONTS.sans, fontSize: "0.8125rem", color: COLORS.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</p>
            <p style={{ margin: 0, fontFamily: FONTS.sans, fontSize: "1rem", fontWeight: 700, color: COLORS.charcoal }}>
              {formatINR(price)}
              {chosenSize && <span style={{ fontWeight: 400, fontSize: "0.8125rem", color: COLORS.muted }}> · Size {chosenSize}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleAddToBag()}
            disabled={cartAdding}
            className="pd-focus"
            style={{ flex: "0 0 auto", minHeight: 44, padding: "0 1.25rem", backgroundColor: COLORS.brown, color: "#FFFFFF", border: "none", borderRadius: RADIUS.control, fontFamily: FONTS.sans, fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}
          >
            {cartAdding ? "Adding…" : sizes.length > 0 && !chosenSize ? "Select size" : "Add to cart"}
          </button>
        </div>
      )}

      {lightboxIndex !== null && galleryImages.length > 0 && (
        <ProductLightbox
          images={galleryImages}
          index={lightboxIndex}
          setIndex={setLightboxIndex}
          productName={product.name}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {showLoginPrompt && (
        <LoginPromptModal
          productName={product.name}
          returnTo={productPath}
          onClose={() => setShowLoginPrompt(false)}
          onBeforeLeave={() => savePendingWishlist(product.id)}
        />
      )}

      {/* Shopify's related products. Reviews are not shown: the store has no reviews app yet. */}
      {related.length > 0 && <ProductCarouselSection title="You May Also Like" products={related} loading={false} backgroundColor="#F5F3F0" />}

      <style>{`.pd-focus:focus-visible{outline:2px solid ${COLORS.focus};outline-offset:2px;}`}</style>
    </div>
  );
}
