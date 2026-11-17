import { getBlogArticles, getJournalTags } from '@/lib/shopify/journal';
import JournalGridClient from './JournalGridClient';
import { constructMetadata } from '@/lib/seo/metadata';

// Force dynamic rendering to fetch fresh articles on every request
export const dynamic = 'force-dynamic';

export const metadata = constructMetadata({
  title: 'Journal | Travel Stories & Guides | Nomadica',
  description: 'Travel stories, destination guides and notes from the road, from the Nomadica Journal.',
  path: '/journal',
});

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).tag;
  const tag = typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 100) : undefined;

  const [{ articles, pageInfo, error }, tags] = await Promise.all([
    getBlogArticles(12, undefined, undefined, { tags: tag ? [tag] : [] }),
    getJournalTags(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--sand)] text-[#1E1E1E] flex flex-col items-center w-full">
      <JournalGridClient
        // Remount when the topic changes so "View more" state resets.
        key={tag ?? 'all'}
        initialArticles={articles}
        initialPageInfo={pageInfo}
        loadError={!!error}
        tags={tags}
        activeTag={tag}
      />
    </div>
  );
}
