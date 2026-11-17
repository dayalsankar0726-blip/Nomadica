"use client";
import { useId } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import { useDialog } from "./useDialog";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

interface LoginPromptModalProps {
  productName: string;
  onClose: () => void;
  /** Where to come back to after signing in or creating an account. */
  returnTo: string;
  /** Called just before going to sign-in / sign-up (e.g. to remember the wishlist item). */
  onBeforeLeave?: () => void;
}

/**
 * "Sign in to save to your wishlist" dialog. Rendered into document.body so it is never
 * clipped by a card, with dialog semantics, focus trap, Escape and focus return.
 * (Adding to the cart never needs an account.)
 */
export function LoginPromptModal({ productName, onClose, returnTo, onBeforeLeave }: LoginPromptModalProps) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  const titleId = useId();
  const descId = useId();
  const redirect = encodeURIComponent(returnTo);

  const remember = () => {
    try {
      sessionStorage.setItem("nomadica_product_redirect", returnTo);
    } catch {
      /* storage unavailable */
    }
    onBeforeLeave?.();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        cursor: "default",
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.card,
          maxWidth: "440px",
          width: "100%",
          padding: "2.5rem 2rem 2rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
          position: "relative",
          textAlign: "center",
          outline: "none",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shop-focus"
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: COLORS.charcoal,
            borderRadius: RADIUS.control,
          }}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "#FDF2F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <Heart size={26} fill="#DC2626" color="#DC2626" />
        </div>

        <h2 id={titleId} style={{ fontFamily: FONTS.serif, fontSize: "1.4rem", fontWeight: 600, color: COLORS.charcoal, margin: "0 0 0.5rem" }}>
          Sign in to save to your wishlist
        </h2>
        <p id={descId} style={{ fontFamily: FONTS.sans, fontSize: "0.875rem", color: COLORS.muted, lineHeight: 1.6, margin: "0 0 1.5rem" }}>
          Sign in or create an account to save <strong>{productName}</strong>. It will be added to your wishlist as soon as you&apos;re signed in.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link
            href={`/account/login?redirect=${redirect}`}
            onClick={remember}
            data-autofocus
            className="shop-focus"
            style={{
              display: "block",
              padding: "0.85rem",
              backgroundColor: COLORS.brown,
              color: "#FFFFFF",
              borderRadius: RADIUS.control,
              fontFamily: FONTS.sans,
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
          <Link
            href={`/account/signup?redirect=${redirect}`}
            onClick={remember}
            className="shop-focus"
            style={{
              display: "block",
              padding: "0.8rem",
              border: `1px solid ${COLORS.brown}`,
              color: COLORS.brown,
              borderRadius: RADIUS.control,
              fontFamily: FONTS.sans,
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Create account
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="shop-focus"
            style={{
              padding: "0.75rem",
              background: "none",
              border: "none",
              fontFamily: FONTS.sans,
              fontSize: "0.8125rem",
              color: COLORS.muted,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Continue browsing
          </button>
        </div>
      </div>
      <ShopFocusStyle />
    </div>,
    document.body,
  );
}

/** Visible keyboard focus ring for shop controls (class "shop-focus"). */
export function ShopFocusStyle() {
  return (
    <style>{`.shop-focus:focus-visible{outline:2px solid ${COLORS.focus};outline-offset:2px;}`}</style>
  );
}
