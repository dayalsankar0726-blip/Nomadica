'use server';

import { getBlogArticles, type BlogArticlesResult } from '@/lib/shopify/journal';

/** "View more" on /journal. Read-only; keeps the selected topic filter. */
export async function loadMoreArticles(after: string, tag?: string): Promise<BlogArticlesResult> {
  if (typeof after !== 'string' || after.length === 0 || after.length > 512) {
    return { articles: [], pageInfo: { hasNextPage: false, endCursor: null }, error: true };
  }
  const tags = typeof tag === 'string' && tag.length > 0 && tag.length <= 100 ? [tag] : [];
  return getBlogArticles(6, after, { cache: 'no-store' }, { tags });
}
