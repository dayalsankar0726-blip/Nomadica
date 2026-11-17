// app/account/_lib/buyAgain.ts
"use client";
import { api } from "@/components/api/api";

/**
 * Adds the given variants to the shopper's bag (creating a bag if needed) and opens
 * the bag drawer. Throws a customer-facing message on failure.
 */
export async function addLinesToBag(lines: Array<{ merchandiseId: string; quantity: number }>) {
  if (lines.length === 0) throw new Error("These items are no longer available.");
  const create = async () => {
    const res = await api.cart.create(lines);
    const cart = res?.cartCreate?.cart || res?.cart;
    if (!cart?.id) throw new Error("no cart");
    localStorage.setItem("nomadica_cart_id", cart.id);
  };
  try {
    const cartId = localStorage.getItem("nomadica_cart_id");
    if (cartId) {
      try {
        const res = await api.cart.update(cartId, { lines });
        const cart = res?.cartLinesAdd?.cart || res?.cartLinesUpdate?.cart || res?.cart;
        if (!cart) throw new Error("no cart");
      } catch {
        // The saved bag may have expired: start a new one.
        await create();
      }
    } else {
      await create();
    }
  } catch {
    throw new Error("We couldn't add these items to your bag. Some may be sold out. Please try again.");
  }
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: { openDrawer: true } }));
}
