"use client";

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight } from 'lucide-react';
import type { ShopifyArticle } from '@/lib/shopify/journal';
import JournalCard from '@/components/journal/JournalCard';
import { loadMoreArticles } from './actions';

interface JournalGridClientProps {
  initialArticles: ShopifyArticle[];
  initialPageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  /** Shopify could not be reached on the server. */
  loadError?: boolean;
  /** Topic filters, taken from the tags actually used on articles. */
  tags: string[];
  activeTag?: string;
}

const chipBase =
  "inline-flex items-center rounded px-4 py-2 font-['Montserrat',_sans-serif] text-xs font-semibold uppercase tracking-wider no-underline transition-colors";
const chipIdle = "bg-white text-[#6B4E37] border border-[#6B4E37] hover:bg-[#F3EDE6]";
const chipActive = "bg-[#6B4E37] text-white border border-[#6B4E37]";

export default function JournalGridClient({
  initialArticles,
  initialPageInfo,
  loadError = false,
  tags,
  activeTag,
}: JournalGridClientProps) {
  const [articles, setArticles] = useState<ShopifyArticle[]>(initialArticles);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [moreError, setMoreError] = useState(false);
  const [isLoading, startTransition] = useTransition();

  const loadMore = () => {
    if (isLoading || !pageInfo.hasNextPage || !pageInfo.endCursor) return;
    const cursor = pageInfo.endCursor;
    setMoreError(false);
    startTransition(async () => {
      try {
        const data = await loadMoreArticles(cursor, activeTag);
        if (data.error) throw new Error('Failed to load more articles');
        setArticles((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...data.articles.filter((a) => !seen.has(a.id))];
        });
        setPageInfo(data.pageInfo);
      } catch (error) {
        console.error('Error loading more articles:', error);
        setMoreError(true);
      }
    });
  };

  // Always show the selected topic, even if it isn't one of the most-used tags.
  const filterTags =
    activeTag && !tags.some((t) => t.toLowerCase() === activeTag.toLowerCase()) ? [...tags, activeTag] : tags;
  const isActive = (t: string) => !!activeTag && t.toLowerCase() === activeTag.toLowerCase();

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <section
        style={{
          backgroundImage: "url('/journal-banner.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        className="w-full flex flex-col items-center justify-center text-center px-4 py-16 sm:px-6 sm:py-24 border-b border-black/5"
      >
        <div className="max-w-3xl mx-auto">
          <h1
            className="font-['Playfair_Display',_serif] font-medium text-[#1E1E1E] leading-tight"
            style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)", letterSpacing: "-0.01em" }}
          >
            Journal
          </h1>
          <p className="font-['Montserrat',_sans-serif] text-base text-[rgba(30,30,30,0.8)] mt-4">
            Travel stories, destination guides and notes from the road.
          </p>

          {filterTags.length > 0 && (
            <nav aria-label="Journal topics" className="mt-10">
              <ul className="flex flex-wrap justify-center gap-3 list-none p-0 m-0">
                <li>
                  <Link
                    href="/journal"
                    scroll={false}
                    aria-current={!activeTag ? "page" : undefined}
                    className={`${chipBase} ${!activeTag ? chipActive : chipIdle}`}
                  >
                    All
                  </Link>
                </li>
                {filterTags.map((t) => (
                  <li key={t}>
                    <Link
                      href={`/journal?tag=${encodeURIComponent(t)}`}
                      scroll={false}
                      aria-current={isActive(t) ? "page" : undefined}
                      className={`${chipBase} ${isActive(t) ? chipActive : chipIdle}`}
                    >
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </section>

      <main className="w-full max-w-[1800px] mx-auto px-4 pt-12 pb-24 sm:px-12 sm:pt-16 flex flex-col items-center justify-center">
        {loadError ? (
          <div role="alert" className="text-center py-16 font-['Montserrat',_sans-serif] text-[rgba(30,30,30,0.8)]">
            <p className="mb-4">We couldn&apos;t load the journal right now.</p>
            <Link href={activeTag ? `/journal?tag=${encodeURIComponent(activeTag)}` : "/journal"} className="font-semibold text-[#6B4E37] underline">
              Try again
            </Link>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 font-['Montserrat',_sans-serif] text-[rgba(30,30,30,0.8)]">
            {activeTag ? (
              <>
                <p className="mb-4">No articles in &ldquo;{activeTag}&rdquo; yet.</p>
                <Link href="/journal" className="font-semibold text-[#6B4E37] underline">
                  See all articles
                </Link>
              </>
            ) : (
              <>
                <p className="mb-4">New stories are on their way. In the meantime, explore the collection.</p>
                <Link href="/shop" className="font-semibold text-[#6B4E37] underline">
                  Shop the collection
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full list-none p-0 m-0">
            {articles.map((article, idx) => (
              <li key={article.id} className="flex">
                <JournalCard article={article} priority={idx < 3} />
              </li>
            ))}
          </ul>
        )}

        {pageInfo.hasNextPage && !loadError && (
          <div className="flex flex-col justify-center items-center gap-3 mt-16">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoading}
              className="flex items-center gap-2.5 px-8 py-3.5 border border-black/20 bg-white text-black font-sans text-xs font-bold tracking-wider uppercase rounded-full shadow-sm hover:border-black/40 transition-all duration-300 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                  Loading...
                </>
              ) : (
                <>
                  View more articles
                  <ArrowRight size={14} aria-hidden="true" />
                </>
              )}
            </button>
            <p role="status" className="font-['Montserrat',_sans-serif] text-sm text-[#9B2C2C] m-0 min-h-[1.25rem]">
              {moreError ? "Couldn't load more articles. Please try again." : ""}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
