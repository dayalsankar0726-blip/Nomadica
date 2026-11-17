"use client";
// components/shop/useWishlist.ts
//
// One shared wishlist for every product card on a page: the list is fetched once (not
// once per card), cards read from it, and toggles report errors to the caller.
// Guests never fetch: the wishlist needs an account.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "@/components/api/api";
import { useAuth, getStoredAuth } from "@/utils/hooks/useAuth";

type Snapshot = { ids: ReadonlySet<string>; loaded: boolean };

let snapshot: Snapshot = { ids: new Set(), loaded: false };
let inFlight: Promise<void> | null = null;
let loadedFor: boolean | null = null;
const listeners = new Set<() => void>();

const emit = (next: Snapshot) => {
  snapshot = next;
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const EMPTY: Snapshot = { ids: new Set(), loaded: false };

const PENDING_KEY = "pending_wishlist_product_id";

function readPending(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY) || localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Remembers a product to add to the wishlist once the shopper has signed in. */
export function savePendingWishlist(productId: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, productId);
    localStorage.setItem(PENDING_KEY, productId);
  } catch {
    /* storage unavailable */
  }
}

async function load(force = false) {
  if (inFlight && !force) return inFlight;
  inFlight = (async () => {
    try {
      // Finish an "add to wishlist" that was interrupted by sign-in.
      const pending = readPending();
      if (pending) {
        clearPending();
        try {
          await api.wishlist.add(pending);
        } catch (err) {
          console.error("Could not add the saved wishlist item:", err);
        }
      }
      const res = await api.wishlist.list();
      const ids = new Set<string>((res?.wishlist ?? []).map((item: { id?: string }) => item?.id).filter(Boolean) as string[]);
      emit({ ids, loaded: true });
    } catch (err) {
      console.error("Failed to load wishlist:", err);
      emit({ ids: snapshot.ids, loaded: true });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const state = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);

  useEffect(() => {
    const authed = isAuthenticated || getStoredAuth().isAuthenticated;
    if (!authed) {
      if (loadedFor !== false) {
        loadedFor = false;
        emit({ ids: new Set(), loaded: true });
      }
      return;
    }
    if (loadedFor !== true) {
      loadedFor = true;
      void load();
    }
  }, [isAuthenticated]);

  // Another page part (product page, wishlist page, header) changed the wishlist.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      if ((e as CustomEvent).detail?.source === "useWishlist") return;
      if (loadedFor) void load(true);
    };
    window.addEventListener("wishlist-updated", onUpdate);
    return () => window.removeEventListener("wishlist-updated", onUpdate);
  }, []);

  const isSignedIn = useCallback(() => isAuthenticated || getStoredAuth().isAuthenticated, [isAuthenticated]);

  /** Adds or removes a product. Throws when the server call fails (state is rolled back). */
  const toggle = useCallback(async (productId: string) => {
    const before = snapshot.ids;
    const adding = !before.has(productId);
    const next = new Set(before);
    if (adding) next.add(productId);
    else next.delete(productId);
    emit({ ids: next, loaded: true });
    try {
      if (adding) await api.wishlist.add(productId);
      else await api.wishlist.remove(productId);
      window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { source: "useWishlist" } }));
    } catch (err) {
      emit({ ids: before, loaded: true });
      throw err;
    }
  }, []);

  return { ids: state.ids, loaded: state.loaded, has: (id: string) => state.ids.has(id), toggle, isSignedIn };
}
