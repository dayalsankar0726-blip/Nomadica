// lib/shopify/admin.ts
import { ShopifyAdminClient } from '@/lib/shopify/client';

/**
 * Returns a Shopify Admin API client built only from server environment variables.
 *
 * The admin token must never be read from cookies, request data or files on disk:
 * it grants full store access, so it lives only in SHOPIFY_ADMIN_ACCESS_TOKEN.
 */
export function getAdminClient(): ShopifyAdminClient | null {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const shop = process.env.SHOPIFY_ADMIN_SHOP || process.env.SHOPIFY_APP_URL;
  if (!token || !shop) return null;
  return new ShopifyAdminClient(shop, token);
}
