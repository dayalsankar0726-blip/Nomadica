// app/account/_lib/clientSession.ts
//
// Browser-side steps after signing in or signing up: remember the session for the
// rest of the site, finish a pending wishlist save, and work out where to go next.
"use client";
import { safeRedirect } from "./redirect";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rememberSession(data: { token?: string | null; user?: any }) {
  localStorage.removeItem("nomadica_logged_out");
  if (data.token) localStorage.setItem("nomadica_customer_token", data.token);
  else localStorage.removeItem("nomadica_customer_token");
  if (data.user) localStorage.setItem("nomadica_auth_user", JSON.stringify(data.user));
  localStorage.setItem("nomadica_is_authenticated", "true");
  document.cookie = "nomadica_auth=true; path=/; max-age=2592000; SameSite=Lax";
  window.dispatchEvent(
    new CustomEvent("auth-state-changed", { detail: { isAuthenticated: true, user: data.user, token: data.token } })
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Saves the product the customer tried to wishlist before signing in. */
export async function finishPendingWishlist() {
  try {
    const id = sessionStorage.getItem("pending_wishlist_product_id") || localStorage.getItem("pending_wishlist_product_id");
    if (!id) return;
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id }),
    });
    sessionStorage.removeItem("pending_wishlist_product_id");
    localStorage.removeItem("pending_wishlist_product_id");
  } catch {
    // Not critical: the customer can save it again.
  }
}

/** Primes checkout autofill with the customer's default address. */
export async function primeSavedAddress() {
  try {
    const res = await fetch("/api/customers/addresses");
    if (!res.ok) return;
    const data = await res.json();
    const primary = data.addresses?.find((a: { default?: boolean }) => a.default) || data.addresses?.[0];
    if (primary) localStorage.setItem("nomadica_saved_address", JSON.stringify(primary));
  } catch {}
}

/**
 * Where to go after signing in: the ?redirect= (or ?returnUrl=) path, then a product
 * page remembered by the product page, then the profile. Same-site paths only.
 */
export function destinationAfterSignIn(params: URLSearchParams): string {
  const fromQuery = safeRedirect(params.get("redirect")) || safeRedirect(params.get("returnUrl"));
  if (fromQuery) return fromQuery;
  try {
    const stored = safeRedirect(sessionStorage.getItem("nomadica_product_redirect"));
    if (stored) return stored;
  } catch {}
  return "/account/profile";
}

export function clearStoredRedirect() {
  try {
    sessionStorage.removeItem("nomadica_product_redirect");
  } catch {}
}
