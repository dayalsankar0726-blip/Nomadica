"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import { SectionError } from "@/components/home/SectionError";

/**
 * Badge text from the article's own first tag in Shopify (no guessing). Articles
 * without tags show no badge.
 */
const getCategoryLabel = (tags?: string[]): string | null => {
  const tag = tags?.find((t) => t && t.trim());
  if (!tag) return null;
  return tag.trim().replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

interface JournalSectionProps {
  journalArticles: any[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function JournalSection({ journalArticles, loading, error, onRetry }: JournalSectionProps) {
  const isLoading = loading && journalArticles.length === 0;
  const isError = !loading && journalArticles.length === 0 && !!error;
  if (!isLoading && !isError && journalArticles.length === 0) return null;

  return (
    <section aria-labelledby="home-journal-title" style={{ backgroundColor: "var(--sand)", padding: "6rem 1.5rem", borderBottom: "1px solid rgba(30,30,30,0.05)" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "3rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h2 id="home-journal-title" style={{ fontFamily: "'Playfair Display', sans-serif", fontSize: "clamp(2rem, 3.5vw, 2.5rem)", fontWeight: 600, color: "#1E1E1E", letterSpacing: "-0.01em" }}>
              Travel Articles & Inspiration
            </h2>
          </div>
          <Link
            href="/journal"
            aria-label="View all travel articles"
            className="home-journal-viewall"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: "44px",
              color: "#FFFFFF",
              textDecoration: "none",
              borderRadius: "4px",
              padding: "0.65rem 1.25rem",
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            VIEW ALL
          </Link>
          <style>{`
            .home-journal-viewall { background-color: #6B4E37; transition: background-color 0.3s ease; }
            .home-journal-viewall:hover { background-color: #553D2B; }
          `}</style>
        </div>

        {isError ? (
          <SectionError message="Couldn't load travel articles." onRetry={onRetry} />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" aria-busy={isLoading || undefined}>
          {isLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} aria-hidden="true" className="skeleton" style={{ aspectRatio: "16/10", borderRadius: "8px" }} />
              ))
            : journalArticles.map((art: any) => {
                const label = getCategoryLabel(art.tags);
                const imageUrl = getShopifyImageUrl(art.image?.url, 600);
                return (
                <Link key={art.id} href={`/journal/${art.handle}`} style={{ textDecoration: "none", display: "block" }}>
                  <div className="journal-card">
                    <div className="journal-card-image-wrap" style={{ aspectRatio: "16/10", position: "relative", width: "100%", overflow: "hidden" }}>
                      {imageUrl && <Image
                        src={imageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        style={{ objectFit: "cover" }}
                      />}
                      {label && <div
                        style={{
                          position: "absolute",
                          top: "1.25rem",
                          left: "1.25rem",
                          backgroundColor: "#6B4E37",
                          color: "#FFFFFF",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "3px",
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                          zIndex: 10,
                        }}
                      >
                        {label}
                      </div>}
                    </div>
                    <div className="journal-card-body">
                      <h3
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: "1.25rem",
                          fontWeight: 400,
                          color: "#111111",
                          marginBottom: "0.75rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {art.title}
                      </h3>
                      <p
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: "0.875rem",
                          color: "rgba(30,30,30,0.75)",
                          lineHeight: 1.6,
                          marginBottom: "1.25rem",
                        }}
                        className="line-clamp-2"
                      >
                        {art.excerpt}
                      </p>
                      <div
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#6B4E37",
                          letterSpacing: "0.05em",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          textTransform: "uppercase",
                        }}
                      >
                        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>READ MORE <ArrowRight size={12} style={{ color: "#6B4E37" }} /></span>
                      </div>
                    </div>
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
