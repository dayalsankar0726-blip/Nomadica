// app/api/auth/_lib/session.ts
//
// Shared pieces for the customer auth routes: the Storefront client, the session
// cookies, and a small per-instance limiter for password-related requests.
import { cookies } from 'next/headers';
import { ShopifyStorefrontClient } from '@/lib/shopify/client';
import { TokenBucketLimiter } from '@/lib/rate-limit/tokenBucket';
import { getClientIp } from '@/lib/rate-limit/sharedLimiter';

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** The Storefront client, or null when the store isn't configured. */
export function storefrontClient(): ShopifyStorefrontClient | null {
  const shopUrl = process.env.SHOPIFY_APP_URL;
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!shopUrl || !token || token.trim() === '') return null;
  return new ShopifyStorefrontClient(shopUrl, token);
}

/** Stores a customer session. The token cookie is httpOnly so page scripts can't read it. */
export async function setSessionCookies(accessToken: string, email?: string | null) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  cookieStore.set('customer_access_token', accessToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: THIRTY_DAYS });
  if (email) cookieStore.set('customer_email', email, { secure, sameSite: 'lax', path: '/', maxAge: THIRTY_DAYS });
  cookieStore.set('nomadica_auth', 'true', { secure, sameSite: 'lax', path: '/', maxAge: THIRTY_DAYS });
}

/** Checks an email and password with Shopify. Returns the new access token, or null if they don't match. */
export async function verifyPassword(client: ShopifyStorefrontClient, email: string, password: string): Promise<string | null> {
  const data = await client.request(
    `mutation VerifyCustomer($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken { accessToken }
        customerUserErrors { code }
      }
    }`,
    { input: { email, password } }
  );
  return data?.customerAccessTokenCreate?.customerAccessToken?.accessToken || null;
}

// Password requests (recover, reset, change) are rare for a real customer, so a few
// per quarter hour is plenty and slows down guessing and email flooding.
const globalForLimits = globalThis as unknown as { passwordLimiter?: TokenBucketLimiter };
const passwordLimiter = globalForLimits.passwordLimiter ?? new TokenBucketLimiter(5, 5 / (15 * 60));
if (process.env.NODE_ENV !== 'production') globalForLimits.passwordLimiter = passwordLimiter;

/**
 * True when this client (and, if given, this email) may make another password request.
 * Per server instance only; the site-wide proxy limit still applies on top.
 */
export function allowPasswordRequest(request: Request, scope: string, email?: string): boolean {
  if (Math.random() < 0.05) passwordLimiter.cleanup();
  const ip = getClientIp(request.headers);
  const byIp = passwordLimiter.limit(`${scope}:ip:${ip}`).allowed;
  if (!byIp) return false;
  return email ? passwordLimiter.limit(`${scope}:email:${email.toLowerCase()}`).allowed : true;
}

// Sign-in attempts: generous for people mistyping, but stops rapid password guessing.
const globalForLogin = globalThis as unknown as { loginLimiter?: TokenBucketLimiter };
const loginLimiter = globalForLogin.loginLimiter ?? new TokenBucketLimiter(10, 10 / (10 * 60));
if (process.env.NODE_ENV !== 'production') globalForLogin.loginLimiter = loginLimiter;

/** True when another sign-in attempt for this email from this client is allowed. */
export function allowLoginAttempt(request: Request, email: string): boolean {
  if (Math.random() < 0.05) loginLimiter.cleanup();
  const ip = getClientIp(request.headers);
  return loginLimiter.limit(`login:${ip}:${email.toLowerCase()}`).allowed;
}
