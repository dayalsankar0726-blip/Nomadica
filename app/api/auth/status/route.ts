// app/api/auth/status/route.ts
//
// Reports whether the request carries a valid customer session. A session is valid
// only if Shopify accepts the customer token; cookies like customer_email are never
// trusted on their own.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ShopifyStorefrontClient } from '@/lib/shopify/client';
import { devSamplesEnabled } from '@/lib/devMocks';

const signedOut = () => NextResponse.json({ isAuthenticated: false, user: null, token: null }, { status: 200 });

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const customerAccessToken =
    request.headers.get('x-customer-token') || bearerToken || cookieStore.get('customer_access_token')?.value;

  if (!customerAccessToken) return signedOut();

  const markSignedIn = () =>
    cookieStore.set('nomadica_auth', 'true', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

  // Local development without Shopify: accept the sample session.
  if (devSamplesEnabled()) {
    let profile: Record<string, string> | null = null;
    try {
      profile = JSON.parse(cookieStore.get('mock_profile')?.value || 'null');
    } catch {}
    const email = profile?.email || cookieStore.get('customer_email')?.value || 'dev@example.com';
    markSignedIn();
    return NextResponse.json({
      isAuthenticated: true,
      token: customerAccessToken,
      user: { firstName: email.split('@')[0], lastName: '', ...profile, email, isCustomer: true },
    });
  }

  if (customerAccessToken.startsWith('mock_')) return signedOut();

  try {
    const client = new ShopifyStorefrontClient(
      process.env.SHOPIFY_APP_URL!,
      process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN!
    );
    const data = await client.request(
      `query GetCustomerProfile($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) { email firstName lastName phone }
      }`,
      { customerAccessToken }
    );
    const customer = data?.customer;
    if (!customer) return signedOut();

    markSignedIn();
    return NextResponse.json({
      isAuthenticated: true,
      token: customerAccessToken,
      user: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        isCustomer: true,
      },
    });
  } catch (error) {
    console.error('[auth/status] token check failed:', error instanceof Error ? error.message : error);
    return signedOut();
  }
}
