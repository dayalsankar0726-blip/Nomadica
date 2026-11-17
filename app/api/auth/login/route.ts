// app/api/auth/login/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { devSamplesEnabled } from '@/lib/devMocks';
import { allowLoginAttempt, setSessionCookies, storefrontClient } from '../_lib/session';

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Please enter your email and password.' }, { status: 400 });
    }

    if (!allowLoginAttempt(request, email)) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Please wait a few minutes, or reset your password.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': '120' } }
      );
    }

    const client = storefrontClient();
    if (client) {
      try {
        const data = await client.request(
          `mutation CustomerLogin($input: CustomerAccessTokenCreateInput!) {
            customerAccessTokenCreate(input: $input) {
              customerAccessToken { accessToken expiresAt }
              customerUserErrors { field message code }
            }
          }`,
          { input: { email, password } }
        );

        const payload = data?.customerAccessTokenCreate;
        const errors: Array<{ code?: string; message?: string }> = payload?.customerUserErrors || [];
        const accessToken = payload?.customerAccessToken?.accessToken;
        if (errors.length > 0 || !accessToken) {
          if (errors.some((e) => e.code === 'CUSTOMER_DISABLED')) {
            return NextResponse.json(
              { error: "This account hasn't been activated yet. Please use the link in your welcome email, or reset your password.", code: 'CUSTOMER_DISABLED' },
              { status: 403 }
            );
          }
          return NextResponse.json(
            { error: "That email and password don't match an account.", code: 'INVALID_CREDENTIALS' },
            { status: 401 }
          );
        }

        await setSessionCookies(accessToken, email);

        // The customer's real name, so pages don't show a placeholder before the next session check.
        let profile: { firstName?: string | null; lastName?: string | null; phone?: string | null } = {};
        try {
          const profileData = await client.request(
            `query LoginProfile($customerAccessToken: String!) {
              customer(customerAccessToken: $customerAccessToken) { firstName lastName phone }
            }`,
            { customerAccessToken: accessToken }
          );
          profile = profileData?.customer || {};
        } catch {}

        return NextResponse.json({
          success: true,
          token: accessToken,
          user: {
            email,
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            phone: profile.phone || '',
          },
        });
      } catch (err: unknown) {
        console.error('[auth] Shopify customer login failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Sign-in is unavailable right now. Please try again in a moment.' }, { status: 502 });
      }
    }

    // Sample sign-in exists only for local development without Shopify credentials.
    if (!devSamplesEnabled()) {
      return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 503 });
    }

    const mockToken = `mock_customer_token_${Date.now()}`;
    await setSessionCookies(mockToken, email);
    const cookieStore = await cookies();
    let saved: Record<string, string> | null = null;
    try {
      saved = JSON.parse(cookieStore.get('mock_profile')?.value || 'null');
    } catch {}
    const mockProfile = {
      email,
      firstName: saved && saved.email === email ? saved.firstName || '' : email.split('@')[0],
      lastName: saved && saved.email === email ? saved.lastName || '' : '',
      phone: saved && saved.email === email ? saved.phone || '' : '',
    };
    cookieStore.set('mock_profile', JSON.stringify(mockProfile), { path: '/', maxAge: THIRTY_DAYS });

    return NextResponse.json({ success: true, token: mockToken, user: mockProfile });
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
