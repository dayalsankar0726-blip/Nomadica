"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useId, useRef } from "react";
import Image from "next/image";
import { X, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/components/api/api";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import { compareAtPrice, formatINR } from "@/lib/pricing";
import { useModalDialog } from "@/components/orders/useModalDialog";

export default function QuickViewModal({ product, onClose }: { product: any, onClose: () => void }) {
  // Strictly deduplicate colorVariants
  const uniqueColorVariants = (product.colorVariants || []).filter(
    (v: any, idx: number, arr: any[]) =>
      arr.findIndex(
        (other: any) =>
          other.id === v.id ||
          (other.colorHex && v.colorHex && other.colorHex.toLowerCase() === v.colorHex.toLowerCase())
      ) === idx
  );
  const colorVariants = uniqueColorVariants;
  
  // Set default selected color to the current product's mapped colorName
  const [selectedColor, setSelectedColor] = useState(
    colorVariants.find((cv: any) => cv.id === product.id)?.colorName || 
    (colorVariants.length > 0 ? colorVariants[0].colorName : "")
  );

  const isWhite = (c: string) => c.toLowerCase() === 'white' || c.toLowerCase() === '#ffffff';
  
  // Find the correct grouped product matching the selected color
  const matchingColorProduct = colorVariants.find((cv: any) => cv.colorName === selectedColor) || product;
  const currentVariants = matchingColorProduct.allVariants || product.allVariants || [];

  const [imageIndex, setImageIndex] = useState(0);
  const [hoveredColorOption, setHoveredColorOption] = useState<string | null>(null);

  // The images available for the selected color
  const availableImages = [
    product.mockupImage,
    matchingColorProduct.image || product.image
  ].filter(Boolean); // removes empty strings

  let displayImage = availableImages[imageIndex] || availableImages[0] || product.image;
  
  if (hoveredColorOption) {
    const hoveredProd = colorVariants.find((cv: any) => cv.colorName === hoveredColorOption);
    if (hoveredProd?.image) displayImage = hoveredProd.image;
  }

  const nextImage = () => setImageIndex((prev) => (prev + 1) % availableImages.length);
  const prevImage = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setImageIndex((prev) => (prev - 1 + availableImages.length) % availableImages.length);
  };
  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    nextImage();
  };

  // Reset index when color changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageIndex(0);
  }, [selectedColor]);

  const sizeOptions = currentVariants.length > 0
    ? Array.from(new Set(currentVariants.map((v: any) => v.node?.selectedOptions?.find((o: any) => o.name === 'Size')?.value).filter(Boolean))) as string[]
    : [];

  const sizeAvailable = (size: string) =>
    currentVariants.some((v: any) => {
      const node = v.node ?? v;
      const matches = node?.selectedOptions?.find((o: any) => o.name === 'Size')?.value === size;
      return matches && node.available !== false && node.availableForSale !== false;
    });
  // Sold out only when the data says every variant is unavailable.
  const allSoldOut = currentVariants.length > 0 && sizeOptions.length > 0 && sizeOptions.every((s) => !sizeAvailable(s));
  const wasPrice = compareAtPrice(Number(product.price), product.originalPrice);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const sizeLabelId = useId();
  useModalDialog(dialogRef, { onClose });

  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAddToCart = async () => {
    if (!selectedSize) {
      setError("Please choose a size.");
      return;
    }
    if (colorVariants.length > 0 && !selectedColor) {
      setError("Please choose a colour.");
      return;
    }
    setError("");
    setAdding(true);
    try {
      // Find the correct grouped product matching the selected color
      const matchingColorProduct = colorVariants.find((cv: any) => cv.colorName === selectedColor) || product;
      
      // If we are looking for a variant within the selected product (e.g. Size)
      const targetVariants = matchingColorProduct.id === product.id ? product.allVariants : 
        (product.colorVariants?.find((cv: any) => cv.id === matchingColorProduct.id)?.allVariants || product.allVariants);

      let variantId = matchingColorProduct.id;
      
      if (targetVariants && targetVariants.length > 0) {
        const variant = targetVariants.find((v: any) => {
          // If product colors are embedded in titles (the usual grouped case), 
          // the Shopify variant likely only has "Size" as an option.
          const hasSize = v.node?.selectedOptions?.find((o: any) => o.name === 'Size')?.value?.includes(selectedSize);
          return hasSize;
        });
        if (variant) variantId = variant.node.id;
      }

      let cartId = localStorage.getItem("nomadica_cart_id");
      if (!cartId) {
        const res = await api.cart.create([{ merchandiseId: variantId, quantity }]);
        const newCart = res?.cartCreate?.cart || res?.cart;
        if (newCart?.id) {
          cartId = newCart.id;
          localStorage.setItem("nomadica_cart_id", cartId as string);
        }
      } else {
        await api.cart.update(cartId, {
          lines: [{
            merchandiseId: variantId,
            quantity: quantity
          }]
        });
      }
      
      window.dispatchEvent(new CustomEvent("cart-updated", { detail: { openDrawer: true } }));
      onClose();
    } catch (err) {
      console.error(err);
      setError("We couldn't add this to your bag. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      // Clicking the dimmed area outside the panel closes the quick view.
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          outline: "none",
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          overflow: "hidden",
          position: "relative",
          maxHeight: "90vh",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="hover:bg-gray-200 transition-colors"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "#F5F5F5",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10
          }}
        >
          <X size={16} color="#1E1E1E" />
        </button>

        {/* Left Image */}
        <div className="hidden md:block group" style={{ flex: "1 1 50%", position: "relative", minHeight: "500px", backgroundColor: "#F9F9F9" }}>
           <Image
             src={getShopifyImageUrl(displayImage, 800)}
             alt={product.name}
             fill
             style={{ objectFit: "cover" }}
           />
           {availableImages.length > 1 && (
             <>
               <button 
                 type="button"
                 aria-label="Previous image"
                 onClick={prevImage}
                 className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white/90"
                 style={{
                   position: "absolute", top: "50%", left: "16px", transform: "translateY(-50%)",
                   width: "40px", height: "40px", borderRadius: "50%",
                   backgroundColor: "rgba(255,255,255,0.7)", border: "none",
                   display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5
                 }}
               >
                 <ChevronLeft size={24} color="#1E1E1E" />
               </button>
               <button 
                 type="button"
                 aria-label="Next image"
                 onClick={handleNextImage}
                 className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white/90"
                 style={{
                   position: "absolute", top: "50%", right: "16px", transform: "translateY(-50%)",
                   width: "40px", height: "40px", borderRadius: "50%",
                   backgroundColor: "rgba(255,255,255,0.7)", border: "none",
                   display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5
                 }}
               >
                 <ChevronRight size={24} color="#1E1E1E" />
               </button>
             </>
           )}
        </div>

        {/* Right Info */}
        <div style={{ flex: "1 1 50%", padding: "2.5rem 2rem", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          
          <div className="md:hidden group" style={{ position: "relative", width: "100%", aspectRatio: "4/5", marginBottom: "1.5rem" }}>
            <Image
              src={getShopifyImageUrl(displayImage, 600)}
              alt={product.name}
              fill
              style={{ objectFit: "cover", borderRadius: "8px" }}
            />
           {availableImages.length > 1 && (
             <>
               <button 
                 type="button"
                 aria-label="Previous image"
                 onClick={prevImage}
                 className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white/90"
                 style={{
                   position: "absolute", top: "50%", left: "8px", transform: "translateY(-50%)",
                   width: "40px", height: "40px", borderRadius: "50%",
                   backgroundColor: "rgba(255,255,255,0.7)", border: "none",
                   display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5
                 }}
               >
                 <ChevronLeft size={20} color="#1E1E1E" />
               </button>
               <button 
                 type="button"
                 aria-label="Next image"
                 onClick={handleNextImage}
                 className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white/90"
                 style={{
                   position: "absolute", top: "50%", right: "8px", transform: "translateY(-50%)",
                   width: "40px", height: "40px", borderRadius: "50%",
                   backgroundColor: "rgba(255,255,255,0.7)", border: "none",
                   display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5
                 }}
               >
                 <ChevronRight size={20} color="#1E1E1E" />
               </button>
             </>
           )}
          </div>

          <h2 id={titleId} style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.5rem", paddingRight: "2.5rem" }}>
            {product.name}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "1.125rem", fontWeight: 600, color: "#1E1E1E" }}>
              {formatINR(product.price)}
            </span>
            {wasPrice && (
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", color: "rgba(30,30,30,0.7)", textDecoration: "line-through" }}>
                <span className="sr-only">Was </span>
                {formatINR(wasPrice)}
              </span>
            )}
          </div>

          {colorVariants.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", color: "#1E1E1E", marginBottom: "0.75rem", textTransform: "uppercase" }}>
                Colour: <span style={{ fontWeight: 400, textTransform: "none", color: "rgba(30,30,30,0.75)" }}>{selectedColor}</span>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {colorVariants.map((v: any) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-label={v.colorName}
                    aria-pressed={selectedColor === v.colorName}
                    onClick={() => setSelectedColor(v.colorName)}
                    onMouseEnter={() => setHoveredColorOption(v.colorName)}
                    onMouseLeave={() => setHoveredColorOption(null)}
                    className="hover:scale-110 transition-transform"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: v.colorHex.toLowerCase(),
                      border: isWhite(v.colorHex) ? "1px solid rgba(0,0,0,0.2)" : "none",
                      outline: selectedColor === v.colorName ? "2px solid #1E1E1E" : "none",
                      outlineOffset: "2px",
                      cursor: "pointer",
                      padding: 0
                    }}
                    title={v.colorName}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: "2rem" }}>
            <div id={sizeLabelId} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", color: "#1E1E1E", marginBottom: "0.75rem", textTransform: "uppercase" }}>
              Size: <span style={{ fontWeight: 400, color: "rgba(30,30,30,0.75)", textTransform: "none" }}>{selectedSize ? selectedSize.split(" ")[0] : ""}</span>
            </div>
            <div role="group" aria-labelledby={sizeLabelId} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {sizeOptions.map((s) => {
                const available = sizeAvailable(s);
                return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selectedSize === s}
                  disabled={!available}
                  aria-label={available ? s : `${s}, sold out`}
                  onClick={() => { setSelectedSize(s); setError(""); }}
                  className="hover:bg-gray-100 transition-colors"
                  style={{
                    padding: "0.5rem 0.25rem",
                    minHeight: "40px",
                    textDecoration: available ? "none" : "line-through",
                    opacity: available ? 1 : 0.55,
                    border: selectedSize === s ? "1px solid #1E1E1E" : "1px solid rgba(0,0,0,0.2)",
                    backgroundColor: selectedSize === s ? "#f9f9f9" : "#FFFFFF",
                    color: selectedSize === s ? "#1E1E1E" : "rgba(30,30,30,0.7)",
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: available ? "pointer" : "not-allowed",
                    flex: "1 1 30%",
                    textAlign: "center",
                    borderRadius: "2px"
                  }}
                >
                  {s}
                </button>
                );
              })}
            </div>
          </div>
          
          
          <div style={{ marginTop: "auto" }}>
            {error && (
              <div role="alert" style={{ color: "#B91C1C", fontFamily: "'Montserrat', sans-serif", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(0,0,0,0.2)", borderRadius: "4px" }}>
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="hover:bg-gray-100 transition-colors"
                  style={{ padding: "0.5rem 0.75rem", background: "none", border: "none", cursor: "pointer", color: "#1E1E1E" }}
                >-</button>
                <span aria-live="polite" aria-label={`Quantity ${quantity}`} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.875rem", width: "24px", textAlign: "center" }}>{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  className="hover:bg-gray-100 transition-colors"
                  style={{ padding: "0.5rem 0.75rem", background: "none", border: "none", cursor: "pointer", color: "#1E1E1E" }}
                >+</button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={adding || allSoldOut}
                className="hover:opacity-80 transition-opacity"
                style={{
                  flex: 1,
                  backgroundColor: "#6B4E37",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderRadius: "4px",
                  minHeight: "44px",
                  cursor: adding || allSoldOut ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  opacity: adding || allSoldOut ? 0.6 : 1
                }}
              >
                <ShoppingCart size={16} aria-hidden="true" />
                {allSoldOut ? "Sold out" : adding ? "Adding…" : "Add to bag"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
