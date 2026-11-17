import Link from "next/link";
import Image from "next/image";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import { SectionError } from "@/components/home/SectionError";

interface CollectionsSectionProps {
  collections: any[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

/** Display order for the main collections; any others follow in Shopify's order. */
export const COLLECTION_ORDER = [
  "destination-collection",
  "wildlife-and-safari",
  "adventure-and-trekking-collections",
  "travel-quotes",
  "beach-vibes",
];

/**
 * Fallback copy, used only when the collection has no title/description in Shopify.
 * Edit collection descriptions in Shopify admin to change what shows here.
 */
const FALLBACK_META: Record<string, { title: string; description: string }> = {
  "destination-collection": {
    title: "Destination Collection",
    description: "Iconic cities and landmarks from around the world",
  },
  "wildlife-and-safari": {
    title: "Wildlife & Safari Collection",
    description: "Majestic animals and nature-inspired designs",
  },
  "adventure-and-trekking-collections": {
    title: "Adventure & Trekking Collection",
    description: "Mountain peaks and outdoor expedition themes",
  },
  "travel-quotes": {
    title: "Travel Quotes Collection",
    description: "Inspiring words for the wandering soul",
  },
  "beach-vibes": {
    title: "Beach Vibes Collection",
    description: "Coastal living and ocean-inspired designs",
  },
};

export function sortCollections<T extends { handle?: string }>(collections: T[]): T[] {
  return [...collections].sort((a, b) => {
    const ia = COLLECTION_ORDER.indexOf(a.handle ?? "");
    const ib = COLLECTION_ORDER.indexOf(b.handle ?? "");
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

/** Plain-text description from Shopify, trimmed to a short line. */
function shortDescription(raw?: string): string {
  const text = (raw ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= 90) return text;
  return text.slice(0, 87).replace(/\s+\S*$/, "") + "…";
}

export function CollectionsSection({ collections, loading, error, onRetry }: CollectionsSectionProps) {
  const isLoading = loading && collections.length === 0;
  const isError = !loading && collections.length === 0 && !!error;
  if (!isLoading && !isError && collections.length === 0) return null;

  return (
    <section
      aria-labelledby="home-collections-title"
      style={{
        position: "relative",
        backgroundImage: "linear-gradient(#faf9f7a6, #faf9f7a6), url('/Map.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "2.5rem 1.5rem",
        borderBottom: "1px solid rgba(30,30,30,0.05)",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ textAlign: "left", marginBottom: "2rem" }}>
          <h2 id="home-collections-title" style={{ fontFamily: "'Playfair Display', sans-serif", fontSize: "clamp(2rem, 2.5vw, 3.5rem)", fontWeight: 700, color: "#1E1E1E", letterSpacing: "-0.04em", textAlign: "left" }}>
            Discover by <br className="md:hidden" /> Collections
          </h2>
        </div>

        {isError ? (
          <SectionError message="Couldn't load collections." onRetry={onRetry} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6" aria-busy={isLoading || undefined}>
            {isLoading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} aria-hidden="true" className="skeleton" style={{ aspectRatio: "1/1", borderRadius: "8px" }} />
                ))
              : sortCollections(collections).map((col: any) => {
                  const fallback = FALLBACK_META[col.handle];
                  const title = col.title || fallback?.title || col.handle;
                  const description = shortDescription(col.description) || fallback?.description || "";
                  const imageUrl = getShopifyImageUrl(col.image?.url, 600);

                  return (
                    <Link key={col.id} href={`/collections/${encodeURIComponent(col.handle)}`} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", borderRadius: "8px", backgroundColor: "#EFE9E1" }} className="img-hover-zoom">
                        {imageUrl && (
                          <Image
                            src={imageUrl}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            style={{ objectFit: "cover" }}
                          />
                        )}
                      </div>
                      <div style={{ textAlign: "center", marginTop: "0.75rem", padding: "0 0.5rem" }}>
                        <h3 style={{ fontFamily: "'Playfair Display', sans-serif", fontSize: "clamp(0.95rem, 1.2vw, 1.125rem)", fontWeight: 600, color: "#1E1E1E", marginBottom: "0.25rem" }}>
                          {title}
                        </h3>
                        {description && (
                          <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "clamp(0.75rem, 1vw, 0.8125rem)", color: "rgba(30,30,30,0.75)", lineHeight: "1.4" }}>
                            {description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
          </div>
        )}
      </div>
    </section>
  );
}
