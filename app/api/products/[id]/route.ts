// app/api/products/[id]/route.ts
import { ShopifyStorefrontClient } from '@/lib/shopify/client';
import { getEnvironment } from '@/utils/env';
import { MOCK_PRODUCTS, formatProductGraphQL } from '@/utils/mockData';
import { NextResponse } from 'next/server';
import { isDevelopment } from '@/lib/devMocks';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const env = getEnvironment();
    const storefrontToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    if (env.shopUrl && storefrontToken) {
      const client = new ShopifyStorefrontClient(env.shopUrl, storefrontToken);
      const query = `
        query GetProductById($id: ID!) {
          product(id: $id) {
            id
            title
            description
            handle
            productType
            images(first: 10) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  selectedOptions {
                    name
                    value
                  }
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  available: availableForSale
                }
              }
            }
          }
        }
      `;
      const data = await client.request(query, { id });
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error(`Failed to fetch live product ${id}, falling back to mock:`, error);
  }

  // Sample data is for local development only; production shows an error instead of fake items.
  if (!isDevelopment) {
    return NextResponse.json({ error: 'Store data is temporarily unavailable' }, { status: 503 });
  }

  // Fallback to mock product
  const product = MOCK_PRODUCTS.find(p => p.id === id);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({
    product: formatProductGraphQL(product)
  });
}
