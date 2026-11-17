"use client";
import { useState, useEffect, useMemo, useRef, useId, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import ProductCard from "@/components/shop/ProductCard";
import { PageLoader } from "@/components/ui/PageLoader";
import { api } from "@/components/api/api";
import { groupProducts } from "@/utils/productGroup";
import { mapProductNode, pluralize, toShopifyQuery } from "@/lib/products/listing";
import { COLORS, FONTS, RADIUS, srOnly } from "@/components/shop/tokens";

/* eslint-disable @typescript-eslint/no-explicit-any */

const RECENT_KEY = "nomadica_recent_searches";
const MIN_CHARS = 2;

const recentListeners = new Set<() => void>();
function subscribeRecent(listener: () => void) {
  recentListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    recentListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRecentRaw(): string {
  try {
    return localStorage.getItem(RECENT_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function parseRecent(raw: string): string[] {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((s) => typeof s === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  try {
    const next = [term, ...parseRecent(readRecentRaw()).filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    recentListeners.forEach((l) => l());
  } catch {
    /* storage unavailable */
  }
}

async function fetchProducts(params: Record<string, string>) {
  const res = await fetch(`/api/products?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = await res.json();
  return {
    nodes: (data?.products?.edges ?? []).map((e: any) => e.node).filter(Boolean),
    pageInfo: data?.products?.pageInfo ?? { hasNextPage: false, endCursor: null },
  };
}

export default function SearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = (searchParams?.get("q") ?? "").trim();
  const inputId = useId();

  const [input, setInput] = useState(q);
  const [nodes, setNodes] = useState<any[]>([]);
  const [pageInfo, setPageInfo] = useState<{ hasNextPage: boolean; endCursor: string | null }>({ hasNextPage: false, endCursor: null });
  // The search the shown results belong to; while it differs from q, a search is loading.
  const [done, setDone] = useState<{ q: string; ok: boolean } | null>(null);
  const status: "loading" | "ready" | "error" = done?.q !== q ? "loading" : done.ok ? "ready" : "error";
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [mockups, setMockups] = useState<Record<string, any>>({});
  const [collections, setCollections] = useState<{ title: string; handle: string }[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const recentRaw = useSyncExternalStore(subscribeRecent, readRecentRaw, () => "[]");
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);
  const requestId = useRef(0);

  // Keep the box in step with Back/Forward.
  const [shownQ, setShownQ] = useState(q);
  if (shownQ !== q) {
    setShownQ(q);
    setInput(q);
  }

  useEffect(() => {
    api.mockups.get().then((r: any) => setMockups(r?.mockups || {})).catch(() => {});
    api.collections
      .list()
      .then((r: any) => setCollections((r?.collections?.edges ?? []).map((e: any) => ({ title: e.node.title, handle: e.node.handle }))))
      .catch(() => {});
  }, []);

  // Type-ahead: the URL (?q=) follows the box after a short pause, so results survive Back and refresh.
  useEffect(() => {
    const term = input.trim();
    if (term === q) return;
    const t = window.setTimeout(() => {
      router.replace(term ? `${pathname}?q=${encodeURIComponent(term)}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(t);
  }, [input, q, pathname, router]);

  const runSearch = useCallback(async (term: string) => {
    const id = ++requestId.current;
    try {
      const page = await fetchProducts({ query: toShopifyQuery(term), first: "24" });
      if (id !== requestId.current) return;
      setNodes(page.nodes);
      setPageInfo(page.pageInfo);
      setMoreError(false);
      setDone({ q: term, ok: true });
    } catch (err) {
      console.error("Search failed:", err);
      if (id === requestId.current) setDone({ q: term, ok: false });
    }
  }, []);

  useEffect(() => {
    if (q.length < MIN_CHARS) {
      requestId.current++;
      return;
    }
    const id = ++requestId.current;
    fetchProducts({ query: toShopifyQuery(q), first: "24" })
      .then((page) => {
        if (id !== requestId.current) return;
        setNodes(page.nodes);
        setPageInfo(page.pageInfo);
        setMoreError(false);
        setDone({ q, ok: true });
      })
      .catch((err) => {
        console.error("Search failed:", err);
        if (id === requestId.current) setDone({ q, ok: false });
      });
  }, [q]);

  // Suggestions for an empty result: Shopify's best sellers.
  useEffect(() => {
    if (status !== "ready" || nodes.length > 0 || bestSellers.length > 0) return;
    fetchProducts({ list: "best", first: "8" })
      .then((page) => setBestSellers(page.nodes))
      .catch(() => {});
  }, [status, nodes.length, bestSellers.length]);

  const loadMore = async () => {
    if (!pageInfo.hasNextPage || moreLoading) return;
    setMoreLoading(true);
    setMoreError(false);
    const id = requestId.current;
    try {
      const page = await fetchProducts({ query: toShopifyQuery(q), first: "24", after: pageInfo.endCursor ?? "" });
      if (id !== requestId.current) return;
      setNodes((prev) => [...prev, ...page.nodes.filter((n: any) => !prev.some((p) => p.id === n.id))]);
      setPageInfo(page.pageInfo);
    } catch {
      setMoreError(true);
    } finally {
      setMoreLoading(false);
    }
  };

  const results = useMemo(() => groupProducts(nodes.map((n) => mapProductNode(n)), mockups), [nodes, mockups]);
  const suggestions = useMemo(() => groupProducts(bestSellers.map((n) => mapProductNode(n)), mockups).slice(0, 4), [bestSellers, mockups]);

  const choose = (term: string) => {
    setInput(term);
    saveRecent(term);
    router.replace(`${pathname}?q=${encodeURIComponent(term)}`, { scroll: false });
  };

  const chipStyle = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 36,
    padding: "0.4rem 1.1rem",
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    color: COLORS.charcoal,
    fontFamily: FONTS.sans,
    fontSize: "0.8125rem",
    cursor: "pointer",
    textDecoration: "none",
  } as const;

  const collectionChips = collections.length > 0 && (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
      {collections.map((c) => (
        <Link key={c.handle} href={`/collections/${encodeURIComponent(c.handle)}`} className="shop-focus" style={chipStyle}>
          {c.title}
        </Link>
      ))}
    </div>
  );

  return (
    <div style={{ backgroundColor: COLORS.page, minHeight: "100vh" }}>
      <div
        style={{
          minHeight: "30vh",
          borderBottom: "1px solid rgba(30,30,30,0.1)",
          padding: "2.5rem 1rem 2rem",
          backgroundImage: "url('/shop-header.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "700px", margin: "0 auto" }}>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 600, color: COLORS.charcoal, textAlign: "center", marginBottom: "1.25rem", letterSpacing: "-0.02em" }}>
            What are you looking for?
          </h1>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const term = input.trim();
              if (term.length >= MIN_CHARS) choose(term);
            }}
            style={{ position: "relative" }}
          >
            <label htmlFor={inputId} style={srOnly}>
              Search products
            </label>
            <Search size={20} aria-hidden="true" style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)", color: COLORS.muted }} />
            <input
              id={inputId}
              autoFocus
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search products, collections…"
              className="search-input"
              style={{
                width: "100%",
                padding: "1rem 3.25rem 1rem 3.5rem",
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "30px",
                color: COLORS.charcoal,
                fontFamily: FONTS.sans,
                fontSize: "1rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              }}
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput("")}
                aria-label="Clear search"
                className="shop-focus"
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: COLORS.charcoal, borderRadius: "50%" }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </form>

          {q.length < MIN_CHARS && (
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {recent.length > 0 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: FONTS.sans, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.charcoal, marginBottom: "0.5rem" }}>Recent searches</p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                    {recent.map((s) => (
                      <button key={s} type="button" className="shop-focus" style={chipStyle} onClick={() => choose(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {collectionChips}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 0.75rem 4rem" }} className="sm:px-6">
        {q.length >= MIN_CHARS && status === "loading" && <PageLoader />}

        {q.length >= MIN_CHARS && status === "error" && (
          <div role="alert" style={{ textAlign: "center", padding: "3rem 0", fontFamily: FONTS.sans }}>
            <p style={{ fontSize: "1.125rem", fontWeight: 600, color: COLORS.charcoal, marginBottom: "0.5rem" }}>Search isn&apos;t working right now</p>
            <p style={{ fontSize: "0.9rem", color: COLORS.muted, marginBottom: "1.5rem" }}>Please check your connection and try again.</p>
            <button type="button" className="shop-focus" onClick={() => {
              setDone(null);
              void runSearch(q);
            }} style={{ padding: "0.75rem 1.75rem", backgroundColor: COLORS.brown, color: "#FFFFFF", border: "none", borderRadius: RADIUS.control, fontFamily: FONTS.sans, fontWeight: 600, cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {q.length >= MIN_CHARS && status === "ready" && (
          <>
            <p role="status" style={{ fontFamily: FONTS.sans, fontSize: "0.875rem", color: COLORS.muted, marginBottom: "1.5rem" }}>
              {pluralize(results.length, "result")}{pageInfo.hasNextPage ? " so far" : ""} for &quot;{q}&quot;
            </p>
            {results.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {results.map((p: any) => <ProductCard key={p.groupKey || p.id} {...p} />)}
                </div>
                {pageInfo.hasNextPage && (
                  <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
                    {moreError && <p role="alert" style={{ fontFamily: FONTS.sans, color: COLORS.error, marginBottom: "0.75rem" }}>We couldn&apos;t load more results. Please try again.</p>}
                    <button type="button" className="shop-focus" disabled={moreLoading} onClick={() => void loadMore()} style={{ padding: "0.75rem 1.75rem", backgroundColor: COLORS.brown, color: "#FFFFFF", border: "none", borderRadius: RADIUS.control, fontFamily: FONTS.sans, fontWeight: 600, cursor: moreLoading ? "wait" : "pointer" }}>
                      {moreLoading ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <p style={{ fontFamily: FONTS.serif, fontSize: "1.5rem", color: COLORS.charcoal, marginBottom: "0.5rem" }}>No results for &quot;{q}&quot;</p>
                <p style={{ fontFamily: FONTS.sans, fontSize: "0.9375rem", color: COLORS.muted, marginBottom: "1.5rem" }}>Check the spelling, try a shorter word, or browse a collection.</p>
                {collectionChips}
                {suggestions.length > 0 && (
                  <div style={{ marginTop: "2.5rem", textAlign: "left" }}>
                    <h2 style={{ fontFamily: FONTS.serif, fontSize: "1.375rem", color: COLORS.charcoal, marginBottom: "1rem", textAlign: "center" }}>Best sellers</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                      {suggestions.map((p: any) => <ProductCard key={p.groupKey || p.id} {...p} />)}
                    </div>
                  </div>
                )}
                <p style={{ marginTop: "2rem" }}>
                  <Link href="/shop" className="shop-focus" style={{ color: COLORS.brown, fontFamily: FONTS.sans, fontWeight: 600 }}>Browse all products</Link>
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        .search-input:focus { outline: none; border-color: ${COLORS.brown}; box-shadow: 0 0 0 3px rgba(107, 78, 55, 0.25); }
        .shop-focus:focus-visible { outline: 2px solid ${COLORS.focus}; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
