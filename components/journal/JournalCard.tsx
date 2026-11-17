// components/journal/JournalCard.tsx
// One journal article card. Used on /journal, on article pages (related posts) and on /brand.
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { ShopifyArticle } from '@/lib/shopify/journal';

/** Dates across the journal, Indian format, e.g. "12 June 2026". */
export function formatJournalDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function JournalCard({
  article,
  priority = false,
  headingLevel = 'h2',
}: {
  article: ShopifyArticle;
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
}) {
  const Heading = headingLevel;
  const date = formatJournalDate(article.publishedAt);
  const author = article.authorV2?.name;
  const topic = article.tags?.[0];

  return (
    <Link href={`/journal/${article.handle}`} className="block w-full no-underline group">
      <article className="journal-card">
        <div className="journal-card-image-wrap relative w-full overflow-hidden" style={{ aspectRatio: '15/10' }}>
          {article.image?.url ? (
            <Image
              src={article.image.url}
              alt={article.image.altText || ''}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 bg-[#EFE9E1]" aria-hidden="true" />
          )}
          {topic && (
            <span
              className="absolute top-4 left-4 z-10 rounded-sm bg-[#6B4E37] px-3 py-1 font-['Montserrat',_sans-serif] text-xs font-semibold text-white"
            >
              {topic}
            </span>
          )}
        </div>
        <div className="journal-card-body">
          <Heading className="font-['Montserrat',_sans-serif] text-xl font-medium leading-snug text-[#111111] mb-2">
            {article.title}
          </Heading>
          {(date || author) && (
            <p className="font-['Montserrat',_sans-serif] text-xs text-[rgba(30,30,30,0.75)] mb-3">
              {date && <time dateTime={article.publishedAt}>{date}</time>}
              {date && author && <span aria-hidden="true"> &middot; </span>}
              {author && <span>{author}</span>}
            </p>
          )}
          {article.excerpt && (
            <p className="font-['Montserrat',_sans-serif] text-sm leading-relaxed text-[rgba(30,30,30,0.75)] mb-5 line-clamp-2">
              {article.excerpt}
            </p>
          )}
          <span className="inline-flex items-center gap-1 font-['Montserrat',_sans-serif] text-xs font-semibold uppercase tracking-wider text-[#6B4E37] group-hover:underline">
            Read article <ArrowRight size={12} aria-hidden="true" />
          </span>
        </div>
      </article>
    </Link>
  );
}
