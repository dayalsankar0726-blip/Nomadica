// app/account/_lib/resetUrl.ts
//
// Shopify's password reset links look like
//   https://<store domain>/account/reset/<customer id>/<token>
// Only links of that shape are passed to Shopify.

export function isShopifyResetUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1000) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  // An optional language prefix (e.g. /en-in) is allowed.
  return /^(\/[a-z]{2}(-[a-z]{2})?)?\/account\/reset\/\d+\/[A-Za-z0-9_-]+$/i.test(url.pathname);
}
