// app/api/products/route.ts
//
// One page of products for listings and search.
//   ?first=24            page size (1–100)
//   &after=<cursor>      next page (pageInfo.endCursor of the previous page)
//   &sort=PRICE&reverse=true   Shopify sort key
//   &query=linen         Shopify product search
//   &collection=<handle> products of one collection
//   &list=new|best       new arrivals / best sellers (store collection if any, else Shopify's sort)
import { NextResponse, NextRequest } from 'next/server';
import { fetchProductPage, type ListingKind } from '@/lib/shopify/products';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const list = searchParams.get('list');
  const query = searchParams.get('query')?.trim().slice(0, 100);
  try {
    const page = await fetchProductPage({
      first: parseInt(searchParams.get('first') || '24', 10),
      after: searchParams.get('after'),
      sortKey: searchParams.get('sort')?.toUpperCase() || undefined,
      reverse: searchParams.has('reverse') ? searchParams.get('reverse') === 'true' : undefined,
      query: query || undefined,
      collection: searchParams.get('collection') || undefined,
      list: list === 'new' || list === 'best' ? (list as ListingKind) : undefined,
    });
    return NextResponse.json(page);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Store data is temporarily unavailable' }, { status: 503 });
  }
}
