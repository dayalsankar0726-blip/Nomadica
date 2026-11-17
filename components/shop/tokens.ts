// components/shop/tokens.ts
//
// Colour and corner-radius tokens for the shop, search and product pages, so every
// card and button uses the same brand gold, brown and radius.

import type { CSSProperties } from "react";

export const COLORS = {
  /** Text-bearing buttons (white text). */
  brown: "#6B4E37",
  brownHover: "#563E2B",
  /** Brand gold: borders, selected states, accents (dark text on it). */
  gold: "#C4A77D",
  goldSoft: "#F3E2CA",
  charcoal: "#1E1E1E",
  /** Secondary text: never lighter than this. */
  muted: "rgba(30, 30, 30, 0.7)",
  border: "rgba(30, 30, 30, 0.15)",
  page: "#FAF9F7",
  surface: "#FFFFFF",
  /** Sale / discount badge, distinct from the neutral badges. */
  sale: "#9F2A1F",
  error: "#B91C1C",
  wishlist: "#E53935",
  /** Keyboard focus ring. */
  focus: "#6B4E37",
} as const;

export const RADIUS = {
  /** Buttons, inputs, chips' inner elements. */
  control: "4px",
  /** Product and collection cards. */
  card: "12px",
  pill: "999px",
} as const;

export const FONTS = {
  sans: "'Montserrat', sans-serif",
  serif: "'Playfair Display', serif",
} as const;

/** Visually hidden but read by screen readers. */
export const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
