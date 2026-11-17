// app/api/products/handle/[handle]/route.ts
import { NextResponse } from 'next/server';
import { getProductByHandle } from '@/lib/shopify/products';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  // Same lookup as the product page (live store, then sample products in development), so
  // the client never gets a 200 with an empty product for a page the server could render.
  const product = await getProductByHandle(handle);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ productByHandle: product });
}
