"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { compareAtPrice } from "@/lib/pricing";
import { TrendingUp, Star } from "lucide-react";
import { api } from "@/components/api/api";
import { groupProducts } from "@/utils/productGroup";
import { ProductCarouselSection } from "@/components/shop/ProductCarouselSection";
import { HeroSection } from "@/components/home/HeroSection";
import { ImageBanner } from "@/components/home/ImageBanner";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CollectionsSection, sortCollections } from "@/components/home/CollectionsSection";
import { TickerStrip } from "@/components/home/TickerStrip";
import { JournalSection } from "@/components/home/JournalSection";
import { AboutSection } from "@/components/home/AboutSection";
import { JourneyBanner } from "@/components/home/JourneyBanner";

// The home page still loads its data in the browser (the API helpers call this app's
// own /api routes), but every request now runs in parallel and each section shows its
// own skeleton, error + Retry, or hides itself when it has nothing to show.

// Shopify payloads from the /api routes are untyped JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

/** How many collection carousels the home page shows. */
const COLLECTION_SLOTS = 5;

type CollectionSection = {
  handle: string;
  title: string;
  products: Json[];
  error: boolean;
};

/** Shopify product node -> the shape groupProducts / ProductCarouselSection expect. */
function mapProductNode(node: Json) {
  const firstVariant = node.variants?.edges?.[0]?.node;
  const price = parseFloat(firstVariant?.price?.amount || "0");
  return {
    id: node.id,
    name: node.title,
    price,
    originalPrice: compareAtPrice(price, firstVariant?.compareAtPrice?.amount),
    image: node.images?.edges?.[0]?.node?.url || "",
    badge: node.badge,
    category: node.productType || node.category || "Tops",
    productType: node.productType || node.category || "Tops",
    productTypeConfig: node.productTypeConfig,
    metafieldProductType: node.metafieldProductType,
    productTypeConfiguration: node.productTypeConfiguration,
    variants: node.variants,
    images: node.images,
    handle: node.handle,
    createdAt: node.createdAt || "",
  };
}

export default function HomeClient() {
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Json[]>([]);
  const [collectionsError, setCollectionsError] = useState(false);
  const [newArrivals, setNewArrivals] = useState<Json[]>([]);
  const [bestSellers, setBestSellers] = useState<Json[]>([]);
  const [productsError, setProductsError] = useState(false);
  const [collectionSections, setCollectionSections] = useState<CollectionSection[]>([]);
  const [journalArticles, setJournalArticles] = useState<Json[]>([]);
  const [journalError, setJournalError] = useState(false);
  const requestId = useRef(0);

  const loadHomeData = useCallback(async () => {
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current;
    setLoading(true);

    // Mockup images only improve the card image; failing to load them is not an error.
    const mockupsPromise = api.mockups
      .get()
      .then((res: Json) => (res?.mockups || {}) as Record<string, string>)
      .catch((err: unknown) => {
        console.error("Failed to load mockups:", err);
        return {} as Record<string, string>;
      });

    const productsPromise = api.products
      .list(100)
      .then((res: Json) => ({ ok: true as const, items: (res?.products?.edges || []).map((e: Json) => mapProductNode(e.node)) }))
      .catch((err: unknown) => {
        console.error("Failed to load products:", err);
        return { ok: false as const, items: [] as Json[] };
      });

    const journalPromise = fetch("/api/journal?limit=3")
      .then((res) => {
        if (!res.ok) throw new Error(`Journal request failed: ${res.status}`);
        return res.json();
      })
      .then((data: Json) => ({ ok: true as const, items: (data?.articles || []) as Json[] }))
      .catch((err: unknown) => {
        console.error("Failed to load journal articles:", err);
        return { ok: false as const, items: [] as Json[] };
      });

    // Collections list, then each collection's products (all in parallel).
    const collectionsPromise = api.collections
      .list()
      .then((res: Json) => ({ ok: true as const, items: (res?.collections?.edges || []).map((e: Json) => e.node) as Json[] }))
      .catch((err: unknown) => {
        console.error("Failed to load collections:", err);
        return { ok: false as const, items: [] as Json[] };
      });

    const collectionProductsPromise = collectionsPromise.then(({ items }) =>
      Promise.all(
        sortCollections(items)
          .slice(0, COLLECTION_SLOTS)
          .map(async (col: Json) => {
            try {
              const res = await api.collections.getByHandle(col.handle, 10);
              const edges = res?.collectionByHandle?.products?.edges || [];
              return {
                handle: col.handle as string,
                title: (res?.collectionByHandle?.title || col.title || col.handle) as string,
                raw: edges.map((e: Json) => mapProductNode(e.node)) as Json[],
                error: false,
              };
            } catch (err) {
              console.error(`Error loading collection products for ${col.handle}:`, err);
              return { handle: col.handle as string, title: (col.title || col.handle) as string, raw: [] as Json[], error: true };
            }
          })
      )
    );

    const [mockups, products, journal, cols, colProducts] = await Promise.all([
      mockupsPromise,
      productsPromise,
      journalPromise,
      collectionsPromise,
      collectionProductsPromise,
    ]);
    if (!isCurrent()) return;

    const groupedAll = groupProducts(products.items, mockups);
    const arrivals = [...groupedAll]
      .sort((a: Json, b: Json) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 8);
    const flaggedBestSellers = groupedAll.filter((p: Json) => p.badge?.toLowerCase() === "best seller");
    const sellers = flaggedBestSellers.length > 0 ? flaggedBestSellers.slice(0, 8) : groupedAll.slice(0, 8);

    setProductsError(!products.ok);
    setNewArrivals(arrivals);
    setBestSellers(sellers);
    setCollectionsError(!cols.ok);
    setCollections(cols.items);
    setCollectionSections(
      colProducts.map((c) => {
        // An empty collection falls back to products whose type matches its handle.
        const source = c.raw.length > 0 || c.error
          ? c.raw
          : products.items.filter((p: Json) => p.category?.toLowerCase() === c.handle.toLowerCase());
        return { handle: c.handle, title: c.title, error: c.error, products: groupProducts(source, mockups).slice(0, 5) };
      })
    );
    setJournalError(!journal.ok);
    setJournalArticles(journal.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Data fetching on mount; state is set after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHomeData();
  }, [loadHomeData]);

  const retry = useCallback(() => {
    void loadHomeData();
  }, [loadHomeData]);

  const renderCollection = (index: number, props: { backgroundColor?: string; backgroundImage?: string } = {}) => {
    const section = collectionSections[index];
    if (!section) return null;
    return (
      <ProductCarouselSection
        key={section.handle}
        title={section.title}
        products={section.products}
        loading={loading}
        error={section.error}
        onRetry={retry}
        viewAllLink={`/collections/${encodeURIComponent(section.handle)}`}
        viewAllText="VIEW ALL"
        {...props}
      />
    );
  };

  return (
    <div>
      <h1 className="sr-only">Nomadica: travel-inspired apparel</h1>

      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Collections */}
      <CollectionsSection collections={collections} loading={loading} error={collectionsError} onRetry={retry} />

      {/* 3. New Arrivals */}
      <ProductCarouselSection
        icon={Star}
        title="New Arrivals"
        products={newArrivals}
        loading={loading}
        error={productsError}
        onRetry={retry}
        viewAllLink="/shop/new-arrivals"
        viewAllText="VIEW ALL"
      />

      {/* 4. Best Sellers */}
      <ProductCarouselSection
        icon={TrendingUp}
        title="Bestsellers"
        products={bestSellers}
        loading={loading}
        error={productsError}
        onRetry={retry}
        viewAllLink="/shop/best-sellers"
        viewAllText="VIEW ALL"
        backgroundColor="#FFFFFF"
      />

      {/* 5. Banner 1 + ticker */}
      <ImageBanner
        image="/youtube shorts banner 1.jpg"
        href="/brand/story"
        label="Explore the world: every journey tells a story. Read the Nomadica story"
        aspect="2000/923"
        minHeightClass="min-h-[170px] sm:min-h-[290px] md:min-h-[350px] lg:min-h-[470px] xl:min-h-[590px] 2xl:min-h-[700px]"
      />
      <TickerStrip />

      {/* 6–7. Collections (Shopify titles, fixed order from CollectionsSection) */}
      {renderCollection(0, { backgroundColor: "#FFFFFF" })}
      {renderCollection(1)}

      {/* 8. Testimonials: hidden until real reviews are connected (see TestimonialsSection) */}
      <TestimonialsSection bgTint />

      {/* 9–10. Collections */}
      {renderCollection(2, { backgroundColor: "#FFFFFF" })}
      {renderCollection(3, { backgroundImage: "/beach-bg.jpg" })}

      {/* 11. Banner 2 */}
      <ImageBanner image="/Home-Banner2.jpg" href="/shop" label="Shop all Nomadica travel apparel" />

      {/* 12. Collection */}
      {renderCollection(4, { backgroundColor: "#FFFFFF" })}

      {/* 13. Journal */}
      <JournalSection journalArticles={journalArticles} loading={loading} error={journalError} onRetry={retry} />

      {/* 14. About */}
      <AboutSection />

      {/* 15. Journey banner */}
      <JourneyBanner />
    </div>
  );
}

