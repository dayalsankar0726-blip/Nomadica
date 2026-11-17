"use client";
import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/shop/ProductCard";
import { api } from "@/components/api/api";
import { PageLoader } from "@/components/ui/PageLoader";
import { groupProducts } from "@/utils/productGroup";
import { ShopFilterBar } from "@/components/shop/ShopFilterBar";
import { matchesCategoryFilter, sortProducts } from "@/utils/productFilters";
import {
  buildFilterOptions,
  groupHasColor,
  groupHasSize,
  listingQueryString,
  mapProductNode,
  parseListingState,
  shopifySort,
  sortLabel,
  type ListingSort,
  type ListingState,
} from "@/lib/products/listing";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ListingSource = "all" | "collection" | "new" | "best";

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface CollectionClientProps {
  source: ListingSource;
  /** Collection handle (source "collection"). */
  collectionHandle?: string;
  /** Heading; for "all" it follows the Collection filter. */
  title: string;
  eyebrow?: string;
  /** First page from the server (Storefront product nodes), so the page doesn't refetch it. */
  initialNodes?: any[];
  initialPageInfo?: PageInfo;
}

const PAGE_SIZE = 24;

/** One page of products from /api/products. */
async function fetchListingPage(opts: {
  source: ListingSource;
  collectionHandle?: string;
  sort: ListingSort;
  after?: string | null;
}): Promise<{ nodes: any[]; pageInfo: PageInfo }> {
  const params = new URLSearchParams({ first: String(PAGE_SIZE) });
  if (opts.after) params.set("after", opts.after);
  if (opts.source === "collection" && opts.collectionHandle) params.set("collection", opts.collectionHandle);
  if (opts.source === "new" || opts.source === "best") params.set("list", opts.source);
  const isCollection = opts.source !== "all";
  // New arrivals / best sellers keep their own order unless the shopper picks a sort.
  if (!(isCollection && opts.source !== "collection" && opts.sort === "featured")) {
    const { sortKey, reverse } = shopifySort(opts.sort, isCollection);
    if (sortKey) params.set("sort", sortKey);
    if (reverse !== undefined) params.set("reverse", String(reverse));
  }
  const res = await fetch(`/api/products?${params}`);
  if (!res.ok) throw new Error(`Products request failed (${res.status})`);
  const data = await res.json();
  return {
    nodes: (data?.products?.edges ?? []).map((e: any) => e.node).filter(Boolean),
    pageInfo: data?.products?.pageInfo ?? { hasNextPage: false, endCursor: null },
  };
}

export default function CollectionClient({
  source,
  collectionHandle,
  title,
  eyebrow,
  initialNodes,
  initialPageInfo,
}: CollectionClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultSort: ListingSort = source === "new" ? "newest" : "featured";
  const state = useMemo(() => parseListingState(searchParams, defaultSort), [searchParams, defaultSort]);

  const [nodes, setNodes] = useState<any[]>(initialNodes ?? []);
  const [pageInfo, setPageInfo] = useState<PageInfo>(initialPageInfo ?? { hasNextPage: false, endCursor: null });
  const [status, setStatus] = useState<"loading" | "ready" | "error">(initialNodes ? "ready" : "loading");
  const [moreStatus, setMoreStatus] = useState<"idle" | "loading" | "error">("idle");
  const [mockups, setMockups] = useState<Record<string, any>>({});
  const [collectionsList, setCollectionsList] = useState<{ title: string; handle: string }[]>([]);
  const [collectionEdges, setCollectionEdges] = useState<any[]>([]);
  const loadedSort = useRef<ListingSort | null>(initialNodes ? defaultSort : null);
  const requestId = useRef(0);

  /** Writes the listing state to the URL (shareable, survives Back). */
  const updateState = useCallback(
    (patch: Partial<ListingState>) => {
      const next = { ...state, ...patch };
      const qs = listingQueryString(next, searchParams?.toString() ?? "", defaultSort);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [state, searchParams, pathname, router, defaultSort],
  );

  const loadFirstPage = useCallback(async (sort: ListingSort) => {
    const id = ++requestId.current;
    setStatus("loading");
    try {
      const page = await fetchListingPage({ source, collectionHandle, sort });
      if (id !== requestId.current) return;
      setNodes(page.nodes);
      setPageInfo(page.pageInfo);
      loadedSort.current = sort;
      setStatus("ready");
    } catch (err) {
      console.error("Failed to load products:", err);
      if (id === requestId.current) setStatus("error");
    }
  }, [source, collectionHandle]);

  // Load (or reload) when the sort changes; the server sends the first page in default order.
  useEffect(() => {
    if (loadedSort.current === state.sort && status !== "error") return;
    void loadFirstPage(state.sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sort, loadFirstPage]);

  const loadMore = async () => {
    if (!pageInfo.hasNextPage || moreStatus === "loading") return;
    setMoreStatus("loading");
    const id = requestId.current;
    try {
      const page = await fetchListingPage({ source, collectionHandle, sort: state.sort, after: pageInfo.endCursor });
      if (id !== requestId.current) return;
      setNodes((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...page.nodes.filter((n) => !seen.has(n.id))];
      });
      setPageInfo(page.pageInfo);
      setMoreStatus("idle");
    } catch (err) {
      console.error("Failed to load more products:", err);
      setMoreStatus("error");
    }
  };

  // Product-type configuration (groups colours into one card) and, on /shop, the collections.
  useEffect(() => {
    api.mockups
      .get()
      .then((res: any) => setMockups(res?.mockups || {}))
      .catch((err: unknown) => console.error("Failed to load product types:", err));
    if (source !== "all") return;
    api.collections
      .list()
      .then((res: any) => {
        const edges = res?.collections?.edges || [];
        setCollectionEdges(edges);
        setCollectionsList(edges.map((e: any) => ({ title: e.node.title, handle: e.node.handle })));
      })
      .catch((err: unknown) => console.error("Failed to load collections:", err));
  }, [source]);

  const products = useMemo(
    () => nodes.map((n) => mapProductNode(n, source === "collection" && collectionHandle ? [title, collectionHandle] : [])),
    [nodes, source, collectionHandle, title],
  );

  // Collection membership from the collections list (for the Collection filter on /shop).
  const enriched = useMemo(() => {
    if (collectionEdges.length === 0) return products;
    return products.map((p) => {
      const extra = [...p.collections];
      for (const { node } of collectionEdges) {
        if (node.products?.edges?.some((pe: any) => pe.node?.id === p.id || pe.node?.handle === p.handle)) {
          if (!extra.includes(node.title)) extra.push(node.title);
          if (!extra.includes(node.handle)) extra.push(node.handle);
        }
      }
      return { ...p, collections: extra };
    });
  }, [products, collectionEdges]);

  const selectedCollections = useMemo(() => (source === "all" ? state.collections : []), [source, state.collections]);
  const collectionFiltered = useMemo(
    () => (selectedCollections.length === 0 ? enriched : enriched.filter((p) => matchesCategoryFilter(p, selectedCollections))),
    [enriched, selectedCollections],
  );
  const grouped = useMemo(() => groupProducts(collectionFiltered, mockups), [collectionFiltered, mockups]);
  const filterOptions = useMemo(() => buildFilterOptions(grouped), [grouped]);

  const finalProducts = useMemo(() => {
    const filtered = grouped.filter((g) => groupHasSize(g, state.sizes) && groupHasColor(g, state.colors));
    // "Featured" keeps the store's order for new arrivals / best sellers.
    if (state.sort === "featured" && (source === "new" || source === "best")) return filtered;
    return sortProducts(filtered, sortLabel(state.sort));
  }, [grouped, state.sizes, state.colors, state.sort, source]);

  const pageTitle =
    source === "all" && selectedCollections.length === 1
      ? selectedCollections[0]
      : source === "all" && selectedCollections.length > 1
        ? "Selected Collections"
        : title;

  const clearAll = () => updateState({ sort: defaultSort, sizes: [], colors: [], collections: [] });
  const hasFilters = state.sizes.length > 0 || state.colors.length > 0 || selectedCollections.length > 0;

  const button = (label: string, onClick: () => void, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shop-focus"
      style={{
        padding: "0.75rem 1.75rem",
        backgroundColor: COLORS.brown,
        color: "#FFFFFF",
        border: "none",
        borderRadius: RADIUS.control,
        cursor: disabled ? "wait" : "pointer",
        fontFamily: FONTS.sans,
        fontSize: "0.875rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </button>
  );

  const message = (heading: string, body: string, action?: ReactNode, role?: "alert") => (
    <div role={role} style={{ textAlign: "center", padding: "3rem 0", fontFamily: FONTS.sans }}>
      <p style={{ fontSize: "1.125rem", color: COLORS.charcoal, fontWeight: 600, marginBottom: "0.5rem" }}>{heading}</p>
      <p style={{ fontSize: "0.9rem", color: COLORS.muted, marginBottom: "1.5rem" }}>{body}</p>
      {action}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: COLORS.page }}>
      {/* Header: shorter on phones so products show above the fold */}
      <div
        className="h-[18vh] min-h-[120px] md:h-[35vh]"
        style={{
          borderBottom: "1px solid rgba(30,30,30,0.1)",
          padding: "1.5rem 1rem",
          backgroundImage: "url('/shop-header.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontFamily: FONTS.serif, fontSize: "clamp(1.9rem, 3vw, 4rem)", color: COLORS.charcoal, letterSpacing: "-0.02em", margin: 0 }}>
            {pageTitle}
          </h1>
          {eyebrow && (
            <p style={{ fontFamily: FONTS.sans, fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.charcoal, margin: "0.5rem 0 0" }}>
              {eyebrow}
            </p>
          )}
        </div>
      </div>

      <ShopFilterBar
        categories={source === "all" ? collectionsList.map((c) => c.title) : undefined}
        selectedCategory={selectedCollections}
        setSelectedCategory={source === "all" ? (collections) => updateState({ collections }) : undefined}
        sizeOptions={filterOptions.sizes}
        colorOptions={filterOptions.colors}
        selectedSize={state.sizes}
        setSelectedSize={(sizes) => updateState({ sizes })}
        selectedColor={state.colors}
        setSelectedColor={(colors) => updateState({ colors })}
        sortBy={state.sort}
        setSortBy={(sort) => updateState({ sort })}
        onClearAll={clearAll}
        productCount={status === "ready" ? finalProducts.length : -1}
        hasMore={pageInfo.hasNextPage}
        pageFilterLabel={source === "all" ? undefined : title}
        onClearPageFilter={source === "all" ? undefined : () => router.push("/shop")}
      />

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem 0.75rem 4rem" }} className="sm:px-6 sm:pt-10">
        {status === "loading" ? (
          <PageLoader />
        ) : status === "error" ? (
          message(
            "We couldn't load products",
            "Please check your connection and try again.",
            button("Retry", () => void loadFirstPage(state.sort)),
            "alert",
          )
        ) : finalProducts.length === 0 ? (
          hasFilters
            ? message("No products match these filters", pageInfo.hasNextPage ? "Try other filters, or load more products." : "Try other filters or clear them.", (
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                  {button("Clear all filters", clearAll)}
                  {pageInfo.hasNextPage && button(moreStatus === "loading" ? "Loading…" : "Load more products", () => void loadMore(), moreStatus === "loading")}
                </div>
              ))
            : message("No products here yet", "Please check back soon, or browse the whole shop.", (
                <Link href="/shop" className="shop-focus" style={{ color: COLORS.brown, fontFamily: FONTS.sans, fontWeight: 600 }}>Browse all products</Link>
              ))
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {finalProducts.map((p: any) => (
                <ProductCard key={p.groupKey || p.id} {...p} selectedColors={state.colors} />
              ))}
            </div>
            {pageInfo.hasNextPage && (
              <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
                {moreStatus === "error" && (
                  <p role="alert" style={{ fontFamily: FONTS.sans, fontSize: "0.875rem", color: COLORS.error, marginBottom: "0.75rem" }}>
                    We couldn&apos;t load more products. Please try again.
                  </p>
                )}
                {button(moreStatus === "loading" ? "Loading…" : moreStatus === "error" ? "Try again" : "Load more", () => void loadMore(), moreStatus === "loading")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
