// app/account/wishlist/page.tsx
"use client";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import ProductCard from "@/components/shop/ProductCard";
import QuickViewModal from "@/components/shop/QuickViewModal";
import { api } from "@/components/api/api";
import { AccountShell } from "../_components/AccountShell";
import { BusyButton } from "../_components/BusyButton";
import { Dialog } from "../_components/Dialog";
import { useRequireAuth } from "../_components/useRequireAuth";

/* eslint-disable @typescript-eslint/no-explicit-any */
type WishItem = Record<string, any> & { id: string; name: string; price: number; image: string };

const SOURCE = "wishlist-page";
const announce = () => window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { source: SOURCE } }));

/** True when the item has variant data and none of it can be bought. */
function soldOut(item: WishItem): boolean {
  const variants: any[] = item.allVariants || [];
  if (variants.length === 0) return false;
  return variants.every((v) => (v.node ?? v).available === false || (v.node ?? v).availableForSale === false);
}

/** Adds colour options to wishlist items from the full catalogue. Runs after the list is on screen. */
async function withColourOptions(items: WishItem[]): Promise<WishItem[]> {
  const [allRes, mockupRes, { groupProducts }] = await Promise.all([
    api.products.list(250),
    api.mockups.get().catch(() => ({})),
    import("@/utils/productGroup"),
  ]);
  const all = (allRes?.products?.edges || []).map(({ node }: any) => ({
    id: node.id,
    name: node.title,
    price: parseFloat(node.variants?.edges?.[0]?.node?.price?.amount || "0"),
    originalPrice: parseFloat(node.variants?.edges?.[0]?.node?.compareAtPrice?.amount || "0") || undefined,
    image: node.images?.edges?.[0]?.node?.url || "",
    hoverImage: node.images?.edges?.[1]?.node?.url || node.images?.edges?.[0]?.node?.url || "",
    badge: node.badge,
    category: node.productType || node.category || "Tops",
    productType: node.productType || node.category || "Tops",
    handle: node.handle,
    collections: node.collections?.edges?.map((e: any) => e.node.title) || [],
    variants: node.variants,
  }));
  if (all.length === 0) return items;
  const grouped = groupProducts(all, mockupRes?.mockups || {});
  return items.map((item) => {
    const targetId = item.productId || item.id;
    const group = grouped.find((g: any) => g.colorVariants.some((cv: any) => cv.id === targetId));
    if (!group) return item;
    return {
      ...item,
      colorVariants: group.colorVariants,
      mockupImage: group.mockupImage || item.mockupImage,
      allVariants: item.allVariants?.length ? item.allVariants : group.allVariants,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function WishlistContent() {
  const { isAuthenticated, verified } = useRequireAuth();
  const [items, setItems] = useState<WishItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [quickView, setQuickView] = useState<WishItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ text: string; restore: WishItem[] } | null>(null);
  const [error, setError] = useState("");
  const loadId = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    try {
      const res = await api.wishlist.list();
      if (id !== loadId.current) return;
      const list: WishItem[] = (res?.wishlist || []).map((w: WishItem) => ({ ...w, id: w.id || w.productId }));
      setItems(list);
      setState("ready");
      // Colour options are a nice extra: fetch them without holding up the list.
      if (list.length > 0) {
        withColourOptions(list)
          .then((enriched) => {
            if (id === loadId.current) setItems(enriched);
          })
          .catch(() => {});
      }
    } catch {
      if (id === loadId.current) setState("error");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Loading data from the server once signed in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // A heart on this page (or anywhere else) changed the wishlist.
    const onUpdate = (e: Event) => {
      if ((e as CustomEvent).detail?.source !== SOURCE) load();
    };
    window.addEventListener("wishlist-updated", onUpdate);
    return () => window.removeEventListener("wishlist-updated", onUpdate);
  }, [isAuthenticated, load]);

  const remove = async (item: WishItem) => {
    setRemoving(item.id);
    setError("");
    try {
      await api.wishlist.remove(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setUndo({ text: `${item.name} removed from your wishlist.`, restore: [item] });
      announce();
    } catch {
      setError(`We couldn't remove ${item.name}. Please try again.`);
    } finally {
      setRemoving(null);
    }
  };

  const clearAll = async () => {
    setClearing(true);
    setError("");
    const before = items;
    const results = await Promise.allSettled(before.map((item) => api.wishlist.remove(item.id)));
    const failed = before.filter((_, i) => results[i].status === "rejected");
    const removed = before.filter((_, i) => results[i].status === "fulfilled");
    setItems(failed);
    setClearing(false);
    setConfirmClear(false);
    if (removed.length) setUndo({ text: `${removed.length} ${removed.length === 1 ? "item" : "items"} removed from your wishlist.`, restore: removed });
    if (failed.length) setError(`We couldn't remove ${failed.length} ${failed.length === 1 ? "item" : "items"}. Please try again.`);
    announce();
  };

  const restore = async () => {
    if (!undo) return;
    const { restore: back } = undo;
    setUndo(null);
    try {
      for (const item of back) await api.wishlist.add(item.id);
      announce();
      await load();
    } catch {
      setError("We couldn't put those items back. Please add them again from the shop.");
      load();
    }
  };

  if (!isAuthenticated) return <PageLoader label={verified ? "Taking you to sign in" : "Loading your wishlist"} />;

  return (
    <AccountShell
      title="Wishlist"
      actions={
        state === "ready" && items.length > 0 ? (
          <button type="button" className="acct-btn-outline acct-btn-small" onClick={() => setConfirmClear(true)}>
            <Trash2 size={14} aria-hidden="true" />
            Clear all
          </button>
        ) : null
      }
    >
      <div aria-live="polite">
        {undo && (
          <div className="acct-alert acct-alert-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <span>{undo.text}</span>
            <span style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="acct-text-btn" onClick={restore}>
                Undo
              </button>
              <button type="button" className="acct-text-btn" onClick={() => setUndo(null)}>
                Dismiss
              </button>
            </span>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="acct-alert acct-alert-error" style={{ marginBottom: "1.5rem" }}>
          {error}
        </p>
      )}

      {state === "loading" ? (
        <PageLoader label="Loading your wishlist" />
      ) : state === "error" ? (
        <div role="alert" className="acct-card" style={{ textAlign: "center" }}>
          <p className="acct-muted" style={{ color: "#7F1D1D", marginBottom: "1rem" }}>
            We couldn&apos;t load your wishlist. Please check your connection and try again.
          </p>
          <button
            type="button"
            className="acct-btn"
            onClick={() => {
              setState("loading");
              load();
            }}
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="acct-card" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
          <Heart size={36} aria-hidden="true" style={{ color: "rgba(30,30,30,0.35)", marginBottom: "1rem" }} />
          <h2 className="acct-card-title" style={{ marginBottom: "0.5rem" }}>
            Your wishlist is empty
          </h2>
          <p className="acct-muted" style={{ marginBottom: "1.5rem" }}>
            Tap the heart on any product to save it here.
          </p>
          <Link href="/shop" className="acct-btn">
            Continue shopping
          </Link>
        </div>
      ) : (
        <>
          <p className="acct-muted" style={{ marginBottom: "1.25rem" }}>
            {items.length === 1 ? "1 item saved" : `${items.length} items saved`}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((product) => {
              const out = soldOut(product);
              return (
                <li key={product.id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <ProductCard
                    {...(product as React.ComponentProps<typeof ProductCard>)}
                    showAddToCart={!out}
                    onAddToCart={() => setQuickView(product)}
                  />
                  {out && (
                    <p className="acct-muted" style={{ fontWeight: 600, color: "#92400E" }}>
                      Sold out
                    </p>
                  )}
                  <BusyButton variant="outline" small busy={removing === product.id} busyLabel="Removing…" onClick={() => remove(product)} aria-label={`Remove ${product.name} from wishlist`}>
                    Remove
                  </BusyButton>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {confirmClear && (
        <Dialog title="Clear your wishlist?" onClose={() => setConfirmClear(false)} canClose={!clearing} maxWidth={460}>
          <p className="acct-muted" style={{ color: "#1E1E1E" }}>
            This removes all {items.length} saved {items.length === 1 ? "item" : "items"}. You can undo straight after.
          </p>
          <div className="acct-dialog-actions">
            <button type="button" className="acct-btn-outline" onClick={() => setConfirmClear(false)} disabled={clearing}>
              Keep them
            </button>
            <BusyButton variant="danger" busy={clearing} busyLabel="Clearing…" onClick={clearAll}>
              Clear all
            </BusyButton>
          </div>
        </Dialog>
      )}

      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </AccountShell>
  );
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <WishlistContent />
    </Suspense>
  );
}
