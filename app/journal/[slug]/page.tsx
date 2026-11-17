import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticleByHandle, getRelatedArticles, getReadingTime } from '@/lib/shopify/journal';
import { constructMetadata } from '@/lib/seo/metadata';
import { getArticleSchema } from '@/lib/schema/article';
import { getBreadcrumbSchema } from '@/lib/schema/breadcrumb';
import JsonLd from '@/components/seo/JsonLd';
import { ShareButtons } from '@/components/journal/ShareButtons';
import JournalCard, { formatJournalDate } from '@/components/journal/JournalCard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleByHandle(slug);

  if (!article) {
    return constructMetadata({
      title: 'Article Not Found | Nomadica Journal',
      description: 'The requested article could not be found.',
      path: `/journal/${slug}`,
      noIndex: true,
    });
  }

  return constructMetadata({
    title: `${article.title} | Nomadica Journal`,
    description: article.excerpt || `Read ${article.title} on the Nomadica Journal.`,
    path: `/journal/${slug}`,
    ogImage: article.image?.url || '/Nomadica.jpg',
    type: 'article',
  });
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleByHandle(slug);

  if (!article) {
    notFound();
  }

  const related = await getRelatedArticles(article, 3);
  const dateFormatted = formatJournalDate(article.publishedAt);
  const readingTime = getReadingTime(article.contentHtml);
  const author = article.authorV2?.name;

  const articleSchema = getArticleSchema(article);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Journal", path: "/journal" },
    { name: article.title, path: `/journal/${slug}` },
  ]);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1E1E1E] w-full flex flex-col items-center">
      <JsonLd schema={articleSchema} />
      <JsonLd schema={breadcrumbSchema} />

      <main className="w-full max-w-[1400px] px-4 pt-6 pb-16 sm:px-8 flex flex-col items-center">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="w-full max-w-5xl mb-6">
          <ol className="flex flex-wrap items-center gap-2 list-none p-0 m-0 font-['Montserrat',_sans-serif] text-xs text-[rgba(30,30,30,0.75)]">
            <li>
              <Link href="/" className="hover:underline text-[rgba(30,30,30,0.75)]">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/journal" className="hover:underline text-[rgba(30,30,30,0.75)]">Journal</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[#1E1E1E] line-clamp-1 max-w-[60vw]">{article.title}</li>
          </ol>
        </nav>

        {/* Cover image: full width up to the reading column's wide max */}
        {article.image?.url && (
          <div className="relative w-full max-w-5xl aspect-[16/9] overflow-hidden rounded-2xl sm:rounded-3xl bg-[#FFFFFF] border border-black/5 shadow-sm mb-10">
            <Image
              src={article.image.url}
              alt={article.image.altText || ''}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        )}

        {/* Title and meta */}
        <header className="text-center mb-10 w-full max-w-3xl mx-auto">
          <h1 className="font-['Playfair_Display',_serif] text-[clamp(2rem,5vw,3.25rem)] font-medium text-[#1E1E1E] leading-tight mb-4">
            {article.title}
          </h1>
          <p className="font-['Montserrat',_sans-serif] text-sm text-[rgba(30,30,30,0.75)] font-medium m-0">
            {author && <>By {author} &nbsp;&middot;&nbsp; </>}
            {dateFormatted && <><time dateTime={article.publishedAt}>{dateFormatted}</time> &nbsp;&middot;&nbsp; </>}
            {readingTime} min read
          </p>
        </header>

        {/* Article body: about 70 characters per line */}
        <div className="w-full max-w-[70ch] mx-auto">
          <article
            className="journal-rich-content w-full [&_a]:text-[#6B4E37]"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />

          <ShareButtons title={article.title} />

          {/* Shop the collection */}
          <aside className="mt-8 rounded-2xl bg-[#F7F3EE] p-6 sm:p-8 text-center">
            <p className="font-['Playfair_Display',_serif] text-2xl text-[#1E1E1E] m-0 mb-2">Pack for your next trip</p>
            <p className="font-['Montserrat',_sans-serif] text-sm text-[rgba(30,30,30,0.8)] m-0 mb-5">
              Travel-inspired apparel for the journeys ahead.
            </p>
            <Link
              href="/shop"
              className="inline-block rounded bg-[#6B4E37] px-7 py-3 font-['Montserrat',_sans-serif] text-xs font-semibold uppercase tracking-wider text-white no-underline hover:bg-[#5A412E]"
            >
              Shop the collection
            </Link>
          </aside>
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="w-full border-t border-black/5 pt-16 mt-16 max-w-[1400px]">
            <h2
              id="related-heading"
              className="font-['Playfair_Display',_serif] text-[2rem] font-semibold text-[#1E1E1E] mb-10"
            >
              More from the Journal
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full list-none p-0 m-0">
              {related.map((other) => (
                <li key={other.id} className="flex">
                  <JournalCard article={other} headingLevel="h3" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
