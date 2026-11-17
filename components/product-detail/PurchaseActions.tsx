"use client";
import { forwardRef } from "react";
import { ShoppingCart } from "lucide-react";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

/** Most of one item a shopper can add at once. */
export const MAX_QUANTITY = 10;

interface PurchaseActionsProps {
  quantity: number;
  setQuantity: (q: number) => void;
  cartAdding: boolean;
  /** Every size is sold out. */
  soldOut?: boolean;
  /** Shown under the buttons when adding fails. */
  addError?: string;
  /** Shown after a successful add. */
  addedMessage?: string;
  handleAddToBag: () => void;
  handleBuyNow: () => void;
}

const stepper = {
  width: "44px",
  height: "46px",
  border: "1px solid rgba(30, 30, 30, 0.3)",
  backgroundColor: "#FFFFFF",
  fontSize: "1.25rem",
  color: COLORS.charcoal,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: RADIUS.control,
};

/** Quantity, Add to Cart and Buy Now. The ref is on the Add to Cart button (for the sticky bar). */
export const PurchaseActions = forwardRef<HTMLButtonElement, PurchaseActionsProps>(function PurchaseActions(
  { quantity, setQuantity, cartAdding, soldOut = false, addError, addedMessage, handleAddToBag, handleBuyNow },
  addRef,
) {
  const busy = cartAdding || soldOut;
  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <p id="qty-label" style={{ fontFamily: FONTS.sans, fontSize: "0.8125rem", fontWeight: 700, color: COLORS.charcoal, textTransform: "uppercase", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
          Quantity
        </p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <div role="group" aria-labelledby="qty-label" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="pd-focus"
              style={{ ...stepper, cursor: quantity <= 1 ? "not-allowed" : "pointer", opacity: quantity <= 1 ? 0.5 : 1 }}
            >
              −
            </button>
            <span aria-live="polite" aria-label={`Quantity ${quantity}`} style={{ width: "36px", textAlign: "center", fontFamily: FONTS.sans, fontSize: "0.9375rem", fontWeight: 600, color: COLORS.charcoal }}>
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(MAX_QUANTITY, quantity + 1))}
              disabled={quantity >= MAX_QUANTITY}
              aria-label="Increase quantity"
              className="pd-focus"
              style={{ ...stepper, cursor: quantity >= MAX_QUANTITY ? "not-allowed" : "pointer", opacity: quantity >= MAX_QUANTITY ? 0.5 : 1 }}
            >
              +
            </button>
          </div>

          <button
            ref={addRef}
            type="button"
            onClick={handleAddToBag}
            disabled={busy}
            className="pd-focus pd-add"
            style={{
              flex: "1 1 180px",
              height: "46px",
              backgroundColor: COLORS.brown,
              color: "#FFFFFF",
              border: "none",
              borderRadius: RADIUS.control,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontFamily: FONTS.sans,
              fontSize: "0.875rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <ShoppingCart size={16} aria-hidden="true" />
            {soldOut ? "Sold out" : cartAdding ? "Adding…" : "Add to cart"}
          </button>
        </div>
        {quantity >= MAX_QUANTITY && (
          <p style={{ fontFamily: FONTS.sans, fontSize: "0.75rem", color: COLORS.muted, margin: "0.5rem 0 0" }}>
            You can add up to {MAX_QUANTITY} at a time.
          </p>
        )}
      </div>

      <div role="status" aria-live="polite">
        {addError && (
          <p role="alert" style={{ fontFamily: FONTS.sans, fontSize: "0.8125rem", color: COLORS.error, margin: "0 0 1rem" }}>
            {addError}
          </p>
        )}
        {!addError && addedMessage && (
          <p style={{ fontFamily: FONTS.sans, fontSize: "0.8125rem", color: "#1A5D3A", margin: "0 0 1rem", fontWeight: 600 }}>
            {addedMessage}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleBuyNow}
        disabled={busy}
        className="pd-focus"
        style={{
          width: "100%",
          height: "50px",
          backgroundColor: COLORS.charcoal,
          color: "#FFFFFF",
          border: "none",
          borderRadius: RADIUS.control,
          fontFamily: FONTS.sans,
          fontSize: "0.875rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.5 : 1,
          marginBottom: "1.5rem",
        }}
      >
        Buy now
      </button>
      <style>{`.pd-add:hover:not(:disabled){background-color:${COLORS.brownHover};}`}</style>
    </>
  );
});
